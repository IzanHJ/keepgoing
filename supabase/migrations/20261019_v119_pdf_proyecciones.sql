-- v1.19: PDF de la calculadora en el Chat y proyecciones compartidas (solo lectura, cifradas de extremo a extremo)

-- ---------- PDF en el Chat (sin cifrar: lo ve quien esté en el chat) ----------
alter table public.kg_messages drop constraint if exists kg_messages_kind_check;
alter table public.kg_messages add constraint kg_messages_kind_check check (kind in ('text', 'invite', 'share', 'system', 'photo', 'audio', 'sticker', 'file'));
alter table public.kg_media drop constraint if exists kg_media_kind_check;
alter table public.kg_media add constraint kg_media_kind_check check (kind in ('photo', 'audio', 'file'));

create or replace function public.kg_post_media(p_group uuid, p_kind text, p_mime text, p_data text, p_meta jsonb default '{}') returns bigint
language plpgsql security definer set search_path = '' as $$
declare uid uuid := (select auth.uid()); mid bigint; med uuid; meta jsonb := coalesce(p_meta, '{}'); fname text;
begin
  if uid is null or not public.kg_is_member(p_group) then raise exception 'not a member'; end if;
  if p_kind not in ('photo', 'audio', 'sticker', 'file') then raise exception 'bad kind'; end if;
  if coalesce(p_data, '') !~ '^[A-Za-z0-9+/=]+$' then raise exception 'bad data'; end if;
  if p_mime !~ '^(image/(jpeg|png|webp|gif)|audio/(webm|ogg|mp4|mpeg|aac)|application/pdf)(;.*)?$' then raise exception 'bad mime'; end if;
  if (select count(*) from public.kg_messages where group_id = p_group and user_id = uid and created_at > now() - interval '1 minute') >= 30 then raise exception 'slow down'; end if;
  if p_kind = 'sticker' then
    if char_length(p_data) > 16000 or p_mime !~ '^image/' then raise exception 'too big'; end if;
    insert into public.kg_messages (group_id, user_id, kind, body, payload)
      values (p_group, uid, 'sticker', '', jsonb_build_object('mime', p_mime, 'data', p_data)) returning id into mid;
    return mid;
  end if;
  if char_length(p_data) > 3000000 then raise exception 'too big'; end if;
  if (p_kind = 'photo' and p_mime !~ '^image/') or (p_kind = 'audio' and p_mime !~ '^audio/') then raise exception 'bad mime'; end if;
  if p_kind = 'file' then
    -- solo PDF: tiene que empezar por «%PDF-»
    if p_mime !~ '^application/pdf$' or left(p_data, 7) <> 'JVBERi0' then raise exception 'bad mime'; end if;
    fname := left(regexp_replace(coalesce(meta ->> 'name', ''), '[^A-Za-z0-9 ._()-]', '', 'g'), 80);
    if fname = '' then fname := 'KeepGoing.pdf'; end if;
  end if;
  insert into public.kg_media (group_id, user_id, kind, mime, data) values (p_group, uid, p_kind, p_mime, p_data) returning id into med;
  insert into public.kg_messages (group_id, user_id, kind, body, payload)
    values (p_group, uid, p_kind, '', jsonb_build_object('media', med, 'mime', p_mime,
      'dur', case when jsonb_typeof(meta -> 'dur') = 'number' then meta -> 'dur' else null end,
      'name', fname, 'size', case when p_kind = 'file' then floor(char_length(p_data) * 3 / 4) else null end)) returning id into mid;
  return mid;
end $$;

-- Los audios y los PDF se pueden abrir las veces que se quiera; las fotos, una sola vez
create or replace function public.kg_media_get(p_id uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare uid uuid := (select auth.uid()); m public.kg_media; d text; others int;
begin
  select * into m from public.kg_media where id = p_id for update;
  if m.id is null or not public.kg_is_member(m.group_id) then raise exception 'not found'; end if;
  if m.kind in ('audio', 'file') then return jsonb_build_object('mime', m.mime, 'data', m.data); end if;
  if m.user_id = uid then raise exception 'sender'; end if;
  if uid = any (m.viewed) or m.data = '' then raise exception 'viewed'; end if;
  d := m.data;
  update public.kg_media set viewed = array_append(viewed, uid) where id = p_id;
  select count(*) into others from public.kg_members where group_id = m.group_id and user_id <> m.user_id and not (user_id = any (array_append(m.viewed, uid)));
  if others = 0 then update public.kg_media set data = '' where id = p_id; end if;
  return jsonb_build_object('mime', m.mime, 'data', d);
end $$;

-- ---------- Proyecciones compartidas ----------
-- Una fila por proyección y amigo. La caja va cifrada (ECDH) para quien comparte y quien recibe.
-- Cuando quien comparte cambia la proyección, se vuelve a cifrar y la fila se actualiza: el amigo ve siempre la última versión.
create table if not exists public.kg_proj_shares (
  id uuid primary key default gen_random_uuid(),
  owner uuid not null,
  to_user uuid not null,
  local_id text not null check (char_length(local_id) between 1 and 64),
  title text check (char_length(title) <= 80),
  box jsonb not null default '{}' check (pg_column_size(box) < 600000),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (owner, to_user, local_id)
);
create index if not exists kg_proj_to_idx on public.kg_proj_shares (to_user, updated_at desc);
alter table public.kg_proj_shares enable row level security;
create policy kg_proj_own_read on public.kg_proj_shares for select to authenticated
  using (owner = (select auth.uid()) or (to_user = (select auth.uid()) and active));
revoke all on table public.kg_proj_shares from anon, authenticated;
grant select on table public.kg_proj_shares to authenticated;

create or replace function public.kg_proj_share(p_to uuid, p_local_id text, p_title text, p_box jsonb) returns uuid
language plpgsql security definer set search_path = '' as $$
declare uid uuid := (select auth.uid()); sid uuid; t text := nullif(btrim(coalesce(p_title, '')), '');
begin
  if uid is null then raise exception 'not authenticated'; end if;
  if p_to is null or p_to = uid then raise exception 'self'; end if;
  if not public.kg_are_friends(uid, p_to) then raise exception 'not a friend'; end if;
  if p_box is null or jsonb_typeof(p_box) <> 'object' or not (p_box ? 'keys') then raise exception 'empty'; end if;
  if t is not null and char_length(t) > 80 then raise exception 'bad title'; end if;
  if (select count(*) from public.kg_proj_shares where owner = uid and updated_at > now() - interval '1 minute') >= 60 then raise exception 'slow down'; end if;
  insert into public.kg_proj_shares (owner, to_user, local_id, title, box)
    values (uid, p_to, p_local_id, t, p_box)
    on conflict (owner, to_user, local_id) do update set title = excluded.title, box = excluded.box, active = true, updated_at = now()
    returning id into sid;
  return sid;
end $$;

-- Dejar de compartir: el amigo deja de verla y la caja se vacía
create or replace function public.kg_proj_unshare(p_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare uid uuid := (select auth.uid());
begin
  update public.kg_proj_shares set active = false, box = '{}', updated_at = now() where id = p_id and owner = uid;
  if not found then raise exception 'not found'; end if;
end $$;

create or replace function public.kg_proj_list() returns jsonb
language sql stable security definer set search_path = '' as $$
  select coalesce(jsonb_agg(jsonb_build_object('id', s.id, 'owner', s.owner, 'to_user', s.to_user, 'local_id', s.local_id, 'title', s.title,
      'updated_at', s.updated_at, 'mine', s.owner = (select auth.uid()),
      'peer', jsonb_build_object('user_id', u.user_id, 'nametag', u.nametag, 'display_name', u.display_name, 'avatar', u.avatar))
    order by s.updated_at desc), '[]'::jsonb)
  from public.kg_proj_shares s
  join public.kg_users u on u.user_id = case when s.owner = (select auth.uid()) then s.to_user else s.owner end
  where s.active and (s.owner = (select auth.uid()) or s.to_user = (select auth.uid()))
$$;

do $$
declare f text;
begin
  foreach f in array array['kg_post_media(uuid, text, text, text, jsonb)', 'kg_media_get(uuid)', 'kg_proj_share(uuid, text, text, jsonb)', 'kg_proj_unshare(uuid)', 'kg_proj_list()']
  loop
    execute format('revoke execute on function public.%s from public, anon', f);
    execute format('grant execute on function public.%s to authenticated', f);
  end loop;
end $$;
