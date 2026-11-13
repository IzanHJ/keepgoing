-- KeepGoing v1.57 · Chat moderno y perfiles amplios
--   1) Perfil amplio: banner (plantilla, emoticonos, dibujo o GIF) y hasta 5 enlaces, para personas y grupos.
--      El GIF y los enlaces son solo para Usuario KeepGoing (kg_has_full): lo comprueba el servidor.
--   2) Reacciones con emoji a los mensajes (una por persona y mensaje, como en WhatsApp).
--   3) Mensaje fijado en cada chat.
--   4) Editar un mensaje de texto propio (durante 48 horas) y reenviar (marca «Reenviado»).
-- Se puede pegar entero en el SQL Editor: todo es idempotente.

-- ---------- 1) perfil amplio ----------
alter table public.kg_users
  add column if not exists banner jsonb check (banner is null or pg_column_size(banner) < 2000),
  add column if not exists links jsonb check (links is null or (jsonb_typeof(links) = 'array' and jsonb_array_length(links) <= 5 and pg_column_size(links) < 3000));
alter table public.kg_groups
  add column if not exists banner jsonb check (banner is null or pg_column_size(banner) < 2000),
  add column if not exists links jsonb check (links is null or (jsonb_typeof(links) = 'array' and jsonb_array_length(links) <= 5 and pg_column_size(links) < 3000)),
  add column if not exists pinned bigint;

-- Imágenes de banner (GIF animado o dibujo): una por persona ('u:<id>') o grupo ('g:<id>'). Aparte de kg_users y
-- kg_groups para que las listas y kg_group_info no carguen megas.
create table if not exists public.kg_banner_imgs (
  slot text primary key check (slot ~ '^[ug]:[0-9a-f-]{36}$'),
  owner uuid not null,
  mime text not null check (mime in ('image/gif', 'image/webp', 'image/png', 'image/jpeg')),
  data text not null check (char_length(data) <= 2800000),
  updated_at timestamptz not null default now()
);
alter table public.kg_banner_imgs enable row level security;
drop policy if exists kg_banner_imgs_read on public.kg_banner_imgs;
create policy kg_banner_imgs_read on public.kg_banner_imgs for select to authenticated using (true);
revoke all on table public.kg_banner_imgs from anon, authenticated;
grant select on table public.kg_banner_imgs to authenticated;

-- Valida un banner: { t: 'tpl', id } | { t: 'emoji', e: [1 o 5 emojis] } | { t: 'img', v } | { t: 'gif', v }
create or replace function public.kg_banner_ok(b jsonb) returns boolean
language sql immutable set search_path = '' as $$
  select b is null or (jsonb_typeof(b) = 'object' and (
    (b ->> 't' = 'tpl' and coalesce(b ->> 'id', '') ~ '^[a-z0-9_]{2,20}$') or
    (b ->> 't' = 'emoji' and jsonb_typeof(b -> 'e') = 'array' and jsonb_array_length(b -> 'e') between 1 and 5) or
    (b ->> 't' in ('img', 'gif'))))
$$;
-- Valida los enlaces: [{ u: 'https://…', l: 'texto' }] (máx. 5)
create or replace function public.kg_links_ok(l jsonb) returns boolean
language sql immutable set search_path = '' as $$
  select l is null or (jsonb_typeof(l) = 'array' and jsonb_array_length(l) <= 5 and not exists (
    select 1 from jsonb_array_elements(l) x
    where jsonb_typeof(x) <> 'object' or coalesce(x ->> 'u', '') !~ '^https?://[^\s<>"]{3,250}$' or char_length(coalesce(x ->> 'l', '')) > 40))
$$;

-- Tu perfil: el GIF y los enlaces solo con Usuario KeepGoing (solo se mira cuando cambian, para no bloquear otros cambios)
create or replace function public.kg_tr_user_profile() returns trigger
language plpgsql security definer set search_path = '' as $$
declare uid uuid := (select auth.uid());
begin
  if not public.kg_banner_ok(new.banner) then raise exception 'bad banner'; end if;
  if not public.kg_links_ok(new.links) then raise exception 'bad links'; end if;
  if uid is null or public.kg_has_full(uid) then return new; end if;
  if coalesce(jsonb_array_length(new.links), 0) > 0 and (tg_op = 'INSERT' or new.links is distinct from old.links) then raise exception 'plan'; end if;
  if new.banner ->> 't' = 'gif' and (tg_op = 'INSERT' or new.banner is distinct from old.banner) then raise exception 'plan'; end if;
  return new;
end $$;
drop trigger if exists kg_user_profile on public.kg_users;
create trigger kg_user_profile before insert or update of banner, links on public.kg_users
  for each row execute function public.kg_tr_user_profile();

-- Subir la imagen del banner (tuya, o de un grupo si eres Líder o Colíder). GIF: solo Usuario KeepGoing.
create or replace function public.kg_banner_upload(p_group uuid, p_mime text, p_data text) returns text
language plpgsql security definer set search_path = '' as $$
declare uid uuid := (select auth.uid()); s text;
begin
  if uid is null then raise exception 'not authenticated'; end if;
  if p_group is not null and not public.kg_is_mod(p_group) then raise exception 'not allowed'; end if;
  if p_group is not null and exists (select 1 from public.kg_groups where id = p_group and chat = 'dm') then raise exception 'not allowed on dm'; end if;
  s := case when p_group is null then 'u:' || uid else 'g:' || p_group end;
  if p_data is null then delete from public.kg_banner_imgs where slot = s; return s; end if;
  if p_mime not in ('image/gif', 'image/webp', 'image/png', 'image/jpeg') or p_data !~ '^[A-Za-z0-9+/=]+$' then raise exception 'bad image'; end if;
  if p_mime = 'image/gif' and not public.kg_has_full(uid) then raise exception 'plan'; end if;
  if char_length(p_data) > (case when p_mime = 'image/gif' then 2800000 else 600000 end) then raise exception 'too big'; end if;
  insert into public.kg_banner_imgs (slot, owner, mime, data, updated_at) values (s, uid, p_mime, p_data, now())
    on conflict (slot) do update set owner = excluded.owner, mime = excluded.mime, data = excluded.data, updated_at = now();
  return s;
end $$;

-- Banner y enlaces de un grupo (Líder o Colíder). Enlaces y GIF: solo Usuario KeepGoing.
create or replace function public.kg_set_group_profile(p_group uuid, p_banner jsonb, p_links jsonb) returns void
language plpgsql security definer set search_path = '' as $$
declare uid uuid := (select auth.uid()); g public.kg_groups;
begin
  if not public.kg_is_mod(p_group) then raise exception 'not allowed'; end if;
  select * into g from public.kg_groups where id = p_group;
  if g.chat = 'dm' then raise exception 'not allowed on dm'; end if;
  if not public.kg_banner_ok(p_banner) then raise exception 'bad banner'; end if;
  if not public.kg_links_ok(p_links) then raise exception 'bad links'; end if;
  if not public.kg_has_full(uid) and (
      (coalesce(jsonb_array_length(p_links), 0) > 0 and p_links is distinct from g.links) or
      (p_banner ->> 't' = 'gif' and p_banner is distinct from g.banner)) then raise exception 'plan'; end if;
  update public.kg_groups set banner = p_banner, links = case when coalesce(jsonb_array_length(p_links), 0) = 0 then null else p_links end where id = p_group;
end $$;

-- ---------- 2) reacciones ----------
create table if not exists public.kg_reactions (
  message_id bigint not null references public.kg_messages (id) on delete cascade,
  group_id uuid not null references public.kg_groups (id) on delete cascade,
  user_id uuid not null,
  emoji text not null check (char_length(emoji) between 1 and 16),
  created_at timestamptz not null default now(),
  primary key (message_id, user_id)
);
create index if not exists kg_reactions_group_idx on public.kg_reactions (group_id, message_id);
alter table public.kg_reactions enable row level security;
drop policy if exists kg_reactions_member_read on public.kg_reactions;
create policy kg_reactions_member_read on public.kg_reactions for select to authenticated using (public.kg_is_member(group_id));
revoke all on table public.kg_reactions from anon, authenticated;
grant select on table public.kg_reactions to authenticated;

-- Reaccionar: el mismo emoji otra vez la quita; otro emoji la cambia
create or replace function public.kg_react(p_id bigint, p_emoji text) returns text
language plpgsql security definer set search_path = '' as $$
declare uid uuid := (select auth.uid()); m public.kg_messages; cur text;
begin
  select * into m from public.kg_messages where id = p_id;
  if m.id is null or m.deleted or m.kind = 'system' or not public.kg_is_member(m.group_id) then raise exception 'not allowed'; end if;
  if p_emoji is null or char_length(p_emoji) not between 1 and 16 or p_emoji ~ '[A-Za-z0-9<>"''&\s]' then raise exception 'bad emoji'; end if;
  select emoji into cur from public.kg_reactions where message_id = p_id and user_id = uid;
  if cur = p_emoji then delete from public.kg_reactions where message_id = p_id and user_id = uid; return null; end if;
  insert into public.kg_reactions (message_id, group_id, user_id, emoji) values (p_id, m.group_id, uid, p_emoji)
    on conflict (message_id, user_id) do update set emoji = excluded.emoji, created_at = now();
  return p_emoji;
end $$;

-- ---------- 3) fijar un mensaje (en privados, cualquiera de los dos; en grupos, quien puede moderar) ----------
create or replace function public.kg_pin(p_group uuid, p_id bigint) returns void
language plpgsql security definer set search_path = '' as $$
declare g public.kg_groups;
begin
  select * into g from public.kg_groups where id = p_group;
  if g.id is null or not public.kg_is_member(p_group) then raise exception 'not a member'; end if;
  if g.chat is distinct from 'dm' and not public.kg_has_perm(p_group, 'moderate') then raise exception 'not allowed'; end if;
  if p_id is not null and not exists (select 1 from public.kg_messages where id = p_id and group_id = p_group and not deleted and kind <> 'system') then raise exception 'no such message'; end if;
  update public.kg_groups set pinned = p_id where id = p_group;
end $$;

-- ---------- 4) editar un texto propio y reenviar ----------
create or replace function public.kg_edit_message(p_id bigint, p_body text) returns void
language plpgsql security definer set search_path = '' as $$
declare m public.kg_messages;
begin
  select * into m from public.kg_messages where id = p_id;
  if m.id is null or m.deleted or m.user_id is distinct from (select auth.uid()) or m.kind <> 'text' then raise exception 'not allowed'; end if;
  if m.created_at < now() - interval '48 hours' then raise exception 'too old'; end if;
  if char_length(btrim(coalesce(p_body, ''))) = 0 then raise exception 'empty'; end if;
  update public.kg_messages set body = left(btrim(p_body), 1000), payload = coalesce(payload, '{}') || jsonb_build_object('edited', true) where id = p_id;
end $$;

-- kg_post: igual que en la v1.27 + payload.fwd = true («Reenviado») en textos y tarjetas
create or replace function public.kg_post(p_group uuid, p_kind text, p_body text, p_payload jsonb default '{}') returns bigint
language plpgsql security definer set search_path = '' as $$
declare uid uuid := (select auth.uid()); mid bigint; pay jsonb := '{}'; rid bigint; rau uuid; rkind text; rbody text;
begin
  if uid is null or not public.kg_is_member(p_group) then raise exception 'not a member'; end if;
  if p_kind not in ('text', 'share') then raise exception 'bad kind'; end if;
  if p_kind = 'share' and not public.kg_has_perm(p_group, 'share') then raise exception 'not allowed'; end if;
  if p_kind = 'text' and char_length(btrim(coalesce(p_body, ''))) = 0 then raise exception 'empty'; end if;
  if (select count(*) from public.kg_messages where group_id = p_group and user_id = uid and created_at > now() - interval '1 minute') >= 30 then raise exception 'slow down'; end if;
  if p_kind = 'share' then pay := coalesce(p_payload, '{}');
  elsif jsonb_typeof(p_payload -> 'reply') = 'object' and (p_payload -> 'reply' ->> 'id') ~ '^[0-9]{1,18}$' then
    rid := (p_payload -> 'reply' ->> 'id')::bigint;
    select user_id, kind, body into rau, rkind, rbody from public.kg_messages where id = rid and group_id = p_group and not coalesce(deleted, false);
    if rau is not null then
      pay := jsonb_build_object('reply', jsonb_build_object('id', rid, 'u', rau, 'b', left(regexp_replace(case when rkind = 'text' then rbody else coalesce(p_payload -> 'reply' ->> 'b', '') end, '\s+', ' ', 'g'), 140)));
    end if;
  end if;
  if p_kind = 'text' and coalesce(p_payload ->> 'fwd', '') = 'true' then pay := pay || jsonb_build_object('fwd', true); end if;
  insert into public.kg_messages (group_id, user_id, kind, body, payload)
    values (p_group, uid, p_kind, left(btrim(coalesce(p_body, '')), 1000), pay)
    returning id into mid;
  return mid;
end $$;

-- ---------- permisos de ejecución (solo usuarios con sesión) ----------
do $$
declare f text;
begin
  foreach f in array array['kg_banner_upload(uuid, text, text)', 'kg_set_group_profile(uuid, jsonb, jsonb)', 'kg_react(bigint, text)',
    'kg_pin(uuid, bigint)', 'kg_edit_message(bigint, text)', 'kg_post(uuid, text, text, jsonb)']
  loop
    execute format('revoke execute on function public.%s from public, anon', f);
    execute format('grant execute on function public.%s to authenticated', f);
  end loop;
end $$;
