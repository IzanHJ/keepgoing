-- KeepGoing v1.12 · Chat: amigos por @nametag, mensajes directos (DM), chats de grupo entre amigos
-- y libretas compartidas cifradas de extremo a extremo (el servidor solo guarda el texto cifrado).
-- Los chats se guardan en kg_groups con kind = 'project', spec = '{}' y la nueva columna chat ('dm' | 'group').
-- Nada se borra físicamente: amistades y libretas usan estados / banderas (borrado lógico).
-- Las tablas nuevas no llevan claves foráneas a auth.users (igual que kg_rep): las RPC cruzan con kg_users,
-- que sí desaparece con la cuenta, así que las filas huérfanas no se muestran.

-- ---------- perfil público: foto y clave pública ----------
alter table public.kg_users
  add column if not exists avatar text check (char_length(avatar) <= 40000),
  add column if not exists pubkey jsonb check (pg_column_size(pubkey) < 2000);
-- kg_users_read (select para authenticated, using true) ya permite leer nametag, display_name, avatar y pubkey.

-- ---------- chats ----------
alter table public.kg_groups add column if not exists chat text check (chat in ('dm', 'group'));
create index if not exists kg_groups_chat_idx on public.kg_groups (chat) where chat is not null;
create index if not exists kg_members_user_idx on public.kg_members (user_id);

-- ---------- amistades ----------
create table if not exists public.kg_friends (
  a uuid not null,
  b uuid not null,
  requested_by uuid not null,
  status text not null check (status in ('pending', 'accepted', 'declined', 'removed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (a, b),
  check (a < b),
  check (requested_by = a or requested_by = b)
);
create index if not exists kg_friends_b_idx on public.kg_friends (b);
create index if not exists kg_friends_req_idx on public.kg_friends (requested_by, updated_at);
alter table public.kg_friends enable row level security;
create policy kg_friends_own_read on public.kg_friends for select to authenticated
  using ((select auth.uid()) = a or (select auth.uid()) = b);
revoke all on table public.kg_friends from anon, authenticated;
grant select on table public.kg_friends to authenticated;

-- ---------- libretas compartidas (cifradas en el cliente) ----------
create table if not exists public.kg_ledger_shares (
  id uuid primary key default gen_random_uuid(),
  from_user uuid not null,
  to_user uuid not null,
  title text check (char_length(title) between 1 and 80),
  range_from date,
  range_to date,
  box jsonb not null check (pg_column_size(box) < 1500000),
  created_at timestamptz not null default now(),
  hidden_from boolean not null default false,
  hidden_to boolean not null default false
);
create index if not exists kg_ledger_from_idx on public.kg_ledger_shares (from_user, created_at desc);
create index if not exists kg_ledger_to_idx on public.kg_ledger_shares (to_user, created_at desc);
alter table public.kg_ledger_shares enable row level security;
create policy kg_ledger_own_read on public.kg_ledger_shares for select to authenticated
  using ((select auth.uid()) = from_user or (select auth.uid()) = to_user);
revoke all on table public.kg_ledger_shares from anon, authenticated;
grant select on table public.kg_ledger_shares to authenticated;

-- ---------- utilidades internas ----------
create or replace function public.kg_are_friends(p_x uuid, p_y uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.kg_friends f
    where f.a = least(p_x, p_y) and f.b = greatest(p_x, p_y) and f.status = 'accepted')
$$;

-- DM existente entre dos personas (grupo chat = 'dm' con exactamente esos dos miembros)
create or replace function public.kg_dm_between(p_x uuid, p_y uuid) returns uuid
language sql stable security definer set search_path = '' as $$
  select g.id from public.kg_groups g
  where g.chat = 'dm'
    and exists (select 1 from public.kg_members m where m.group_id = g.id and m.user_id = p_x)
    and exists (select 1 from public.kg_members m where m.group_id = g.id and m.user_id = p_y)
    and (select count(*) from public.kg_members m where m.group_id = g.id) = 2
  order by g.created_at limit 1
$$;

create or replace function public.kg_user_card(p_user uuid) returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object('user_id', u.user_id, 'nametag', u.nametag, 'display_name', u.display_name, 'avatar', u.avatar)
  from public.kg_users u where u.user_id = p_user
$$;

-- ---------- RPC de amistades ----------
create or replace function public.kg_friend_request(p_tag text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare uid uuid := (select auth.uid()); tag text; other uuid; f public.kg_friends; st text;
begin
  if uid is null then raise exception 'not authenticated'; end if;
  tag := lower(btrim(ltrim(btrim(coalesce(p_tag, '')), '@')));
  select user_id into other from public.kg_users where nametag = tag;
  if other is null then raise exception 'no such user'; end if;
  if other = uid then raise exception 'self'; end if;
  select * into f from public.kg_friends where a = least(uid, other) and b = greatest(uid, other) for update;
  if f.a is not null and f.status = 'accepted' then
    st := 'accepted';
  elsif f.a is not null and f.status = 'pending' and f.requested_by = other then
    update public.kg_friends set status = 'accepted', updated_at = now() where a = f.a and b = f.b;
    st := 'accepted';
  elsif f.a is not null and f.status = 'pending' then
    st := 'pending';
  else
    if (select count(*) from public.kg_friends where requested_by = uid and updated_at > now() - interval '1 hour') >= 30 then
      raise exception 'slow down';
    end if;
    insert into public.kg_friends (a, b, requested_by, status) values (least(uid, other), greatest(uid, other), uid, 'pending')
      on conflict (a, b) do update set requested_by = excluded.requested_by, status = 'pending', updated_at = now();
    st := 'pending';
  end if;
  return jsonb_build_object('status', st, 'user', public.kg_user_card(other));
end $$;

create or replace function public.kg_friend_respond(p_user uuid, p_accept boolean) returns void
language plpgsql security definer set search_path = '' as $$
declare uid uuid := (select auth.uid()); n int;
begin
  if uid is null then raise exception 'not authenticated'; end if;
  update public.kg_friends set status = case when p_accept then 'accepted' else 'declined' end, updated_at = now()
    where a = least(uid, p_user) and b = greatest(uid, p_user) and status = 'pending' and requested_by = p_user and p_user <> uid;
  get diagnostics n = row_count;
  if n = 0 then raise exception 'no request'; end if;
end $$;

-- Quita una amistad o cancela una solicitud enviada (o recibida)
create or replace function public.kg_friend_remove(p_user uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare uid uuid := (select auth.uid());
begin
  if uid is null then raise exception 'not authenticated'; end if;
  update public.kg_friends set status = 'removed', updated_at = now()
    where a = least(uid, p_user) and b = greatest(uid, p_user) and status in ('pending', 'accepted');
end $$;

create or replace function public.kg_friends() returns jsonb
language sql stable security definer set search_path = '' as $$
  select coalesce(jsonb_agg(jsonb_build_object('user_id', u.user_id, 'nametag', u.nametag, 'display_name', u.display_name,
      'avatar', u.avatar, 'pubkey', u.pubkey,
      'status', case when x.status = 'accepted' then 'accepted' when x.requested_by = x.me then 'outgoing' else 'incoming' end,
      'dm', case when x.status = 'accepted' then public.kg_dm_between(x.me, x.other) end,
      'since', x.updated_at)
    order by (x.status = 'accepted'), x.updated_at desc), '[]'::jsonb)
  from (select f.*, (select auth.uid()) as me, case when f.a = (select auth.uid()) then f.b else f.a end as other
        from public.kg_friends f
        where ((select auth.uid()) in (f.a, f.b)) and f.status in ('pending', 'accepted')) x
  join public.kg_users u on u.user_id = x.other
$$;

-- ---------- RPC de chats ----------
create or replace function public.kg_dm_open(p_user uuid, p_display_name text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare uid uuid := (select auth.uid()); gid uuid; my_name text := btrim(coalesce(p_display_name, '')); peer_name text;
begin
  if uid is null then raise exception 'not authenticated'; end if;
  if p_user is null or p_user = uid then raise exception 'self'; end if;
  if not public.kg_are_friends(uid, p_user) then raise exception 'not a friend'; end if;
  if char_length(my_name) not between 1 and 40 then raise exception 'bad name'; end if;
  -- evita crear dos DM a la vez para la misma pareja
  perform pg_advisory_xact_lock(hashtext('kg_dm:' || least(uid, p_user)::text || greatest(uid, p_user)::text));
  gid := public.kg_dm_between(uid, p_user);
  if gid is not null then return gid; end if;
  select left(coalesce(nullif(btrim(u.display_name), ''), u.nametag), 40) into peer_name from public.kg_users u where u.user_id = p_user;
  peer_name := coalesce(peer_name, 'Amigo');
  insert into public.kg_groups (owner, name, icon, kind, spec, chat) values (uid, 'dm', '💬', 'project', '{}'::jsonb, 'dm') returning id into gid;
  insert into public.kg_members (group_id, user_id, display_name, role, perms) values
    (gid, uid, my_name, 'lider', public.kg_role_perms('lider')),
    (gid, p_user, peer_name, 'lider', public.kg_role_perms('lider'));
  return gid;
end $$;

create or replace function public.kg_chat_create(p_name text, p_icon text, p_display_name text, p_members uuid[]) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare uid uuid := (select auth.uid()); gid uuid; c text; nm text := btrim(coalesce(p_name, '')); me_name text := btrim(coalesce(p_display_name, ''));
  mem uuid[]; lim int := public.kg_max_members(); x uuid;
begin
  if uid is null then raise exception 'not authenticated'; end if;
  if char_length(nm) not between 1 and 80 then raise exception 'bad name'; end if;
  if char_length(me_name) not between 1 and 40 then raise exception 'bad name'; end if;
  select coalesce(array_agg(distinct u), '{}') into mem from unnest(coalesce(p_members, '{}')) u where u is not null and u <> uid;
  foreach x in array mem loop
    if not public.kg_are_friends(uid, x) then raise exception 'not a friend'; end if;
  end loop;
  if lim is not null and cardinality(mem) + 1 > lim then raise exception 'group full'; end if;
  insert into public.kg_groups (owner, name, icon, kind, spec, chat)
    values (uid, nm, coalesce(nullif(btrim(p_icon), ''), '💬'), 'project', '{}'::jsonb, 'group') returning id into gid;
  insert into public.kg_members (group_id, user_id, display_name, role, perms) values (gid, uid, me_name, 'lider', public.kg_role_perms('lider'));
  insert into public.kg_members (group_id, user_id, display_name, role, perms)
    select gid, u.user_id, left(coalesce(nullif(btrim(u.display_name), ''), u.nametag, 'Amigo'), 40), 'novato', public.kg_role_perms('novato')
    from public.kg_users u where u.user_id = any (mem);
  c := public.kg_new_code();
  insert into public.kg_invites (code, group_id, created_by) values (c, gid, uid);
  perform public.kg_sys(gid, 'created', jsonb_build_object('name', me_name, 'title', nm));
  return jsonb_build_object('group_id', gid, 'code', c);
end $$;

create or replace function public.kg_chat_add(p_group uuid, p_user uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare uid uuid := (select auth.uid()); g public.kg_groups; lim int := public.kg_max_members(); nm text;
begin
  if uid is null then raise exception 'not authenticated'; end if;
  select * into g from public.kg_groups where id = p_group;
  if g.id is null then raise exception 'no such group'; end if;
  if g.chat = 'dm' then raise exception 'not allowed on dm'; end if;
  if not public.kg_has_perm(p_group, 'invite') then raise exception 'not allowed'; end if;
  if not public.kg_are_friends(uid, p_user) then raise exception 'not a friend'; end if;
  if exists (select 1 from public.kg_members where group_id = p_group and user_id = p_user) then return; end if;
  if lim is not null and (select count(*) from public.kg_members where group_id = p_group) >= lim then raise exception 'group full'; end if;
  select left(coalesce(nullif(btrim(u.display_name), ''), u.nametag, 'Amigo'), 40) into nm from public.kg_users u where u.user_id = p_user;
  nm := coalesce(nm, 'Amigo');
  insert into public.kg_members (group_id, user_id, display_name, role, perms) values (p_group, p_user, nm, 'novato', public.kg_role_perms('novato'));
  perform public.kg_sys(p_group, 'joined', jsonb_build_object('name', nm));
end $$;

-- Las invitaciones por código no tienen sentido en un DM
create or replace function public.kg_new_invite(p_group uuid) returns text
language plpgsql security definer set search_path = '' as $$
declare c text;
begin
  if not public.kg_has_perm(p_group, 'invite') then raise exception 'not allowed'; end if;
  if exists (select 1 from public.kg_groups where id = p_group and chat = 'dm') then raise exception 'not allowed on dm'; end if;
  c := public.kg_new_code();
  insert into public.kg_invites (code, group_id, created_by) values (c, p_group, (select auth.uid()));
  return c;
end $$;

create or replace function public.kg_post_invite(p_group uuid, p_target uuid) returns bigint
language plpgsql security definer set search_path = '' as $$
declare uid uuid := (select auth.uid()); c text; g public.kg_groups; mid bigint;
begin
  if not public.kg_has_perm(p_group, 'share') or not public.kg_has_perm(p_target, 'invite') then raise exception 'not allowed'; end if;
  if p_group = p_target then raise exception 'same group'; end if;
  select * into g from public.kg_groups where id = p_target;
  if g.chat = 'dm' then raise exception 'not allowed on dm'; end if;
  c := public.kg_new_code();
  insert into public.kg_invites (code, group_id, created_by) values (c, p_target, uid);
  insert into public.kg_messages (group_id, user_id, kind, body, payload)
    values (p_group, uid, 'invite', '', jsonb_build_object('code', c, 'name', g.name, 'icon', g.icon, 'kind', g.kind, 'group_code', g.code, 'spec_name', g.spec ->> 'name'))
    returning id into mid;
  return mid;
end $$;

-- ---------- lectura agrupada para la app (con avatar, chat, último mensaje y peer) ----------
create or replace function public.kg_member_rows(p_group uuid) returns jsonb
language sql stable security definer set search_path = '' as $$
  select coalesce(jsonb_agg(jsonb_build_object('user_id', m.user_id, 'display_name', m.display_name, 'role', m.role, 'perms', m.perms,
    'joined_at', m.joined_at, 'nametag', u.nametag, 'avatar', u.avatar,
    'rep', (select coalesce(sum(r.points), 0) from public.kg_rep r where r.group_id = p_group and r.user_id = m.user_id),
    'rep_total', (select coalesce(sum(r.points), 0) from public.kg_rep r where r.user_id = m.user_id),
    'done_today', (select p.done from public.kg_progress p where p.group_id = p_group and p.user_id = m.user_id and p.day = public.kg_today()))
    order by m.joined_at), '[]'::jsonb)
  from public.kg_members m left join public.kg_users u on u.user_id = m.user_id where m.group_id = p_group
$$;

create or replace function public.kg_my_groups() returns jsonb
language sql stable security definer set search_path = '' as $$
  select coalesce(jsonb_agg(jsonb_build_object('id', g.id, 'code', g.code, 'name', g.name, 'icon', g.icon, 'kind', g.kind, 'spec', g.spec,
    'ranking_on', g.ranking_on, 'ranking_freq', g.ranking_freq, 'my_role', me.role,
    'members', public.kg_member_rows(g.id),
    'wins', (select count(*) from public.kg_challenges c where c.group_id = g.id and c.status = 'won'),
    'losses', (select count(*) from public.kg_challenges c where c.group_id = g.id and c.status = 'lost'),
    'live', (select c.status from public.kg_challenges c where c.group_id = g.id and c.status in ('voting', 'live')),
    'last_msg', (select max(id) from public.kg_messages ms where ms.group_id = g.id),
    'chat', g.chat,
    'last', case when lm.id is null then null else jsonb_build_object('id', lm.id, 'user_id', lm.user_id, 'kind', lm.kind,
      'body', left(lm.body, 120), 'created_at', lm.created_at) end,
    'peer', case when g.chat = 'dm' then (
      select jsonb_build_object('user_id', pm.user_id, 'nametag', pu.nametag, 'display_name', coalesce(pu.display_name, pm.display_name), 'avatar', pu.avatar)
      from public.kg_members pm left join public.kg_users pu on pu.user_id = pm.user_id
      where pm.group_id = g.id and pm.user_id <> me.user_id order by pm.joined_at limit 1) end)
    order by coalesce(lm.created_at, me.joined_at) desc), '[]'::jsonb)
  from public.kg_members me
  join public.kg_groups g on g.id = me.group_id
  left join lateral (select ms.id, ms.user_id, ms.kind, ms.body, ms.created_at from public.kg_messages ms
    where ms.group_id = g.id and not ms.deleted order by ms.id desc limit 1) lm on true
  where me.user_id = (select auth.uid())
$$;

-- ---------- RPC de libretas compartidas ----------
create or replace function public.kg_ledger_share(p_to uuid, p_title text, p_from date, p_to_date date, p_box jsonb) returns uuid
language plpgsql security definer set search_path = '' as $$
declare uid uuid := (select auth.uid()); sid uuid; t text := nullif(btrim(coalesce(p_title, '')), '');
begin
  if uid is null then raise exception 'not authenticated'; end if;
  if p_to is null or p_to = uid then raise exception 'self'; end if;
  if not public.kg_are_friends(uid, p_to) then raise exception 'not a friend'; end if;
  if p_box is null then raise exception 'empty'; end if;
  if t is not null and char_length(t) > 80 then raise exception 'bad title'; end if;
  if p_from is not null and p_to_date is not null and p_from > p_to_date then raise exception 'bad range'; end if;
  if (select count(*) from public.kg_ledger_shares where from_user = uid and created_at > now() - interval '1 hour') >= 20 then raise exception 'slow down'; end if;
  insert into public.kg_ledger_shares (from_user, to_user, title, range_from, range_to, box)
    values (uid, p_to, t, p_from, p_to_date, p_box) returning id into sid;
  return sid;
end $$;

create or replace function public.kg_ledger_hide(p_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare uid uuid := (select auth.uid()); s public.kg_ledger_shares;
begin
  select * into s from public.kg_ledger_shares where id = p_id;
  if s.id is null or uid is null or uid not in (s.from_user, s.to_user) then raise exception 'not found'; end if;
  update public.kg_ledger_shares set hidden_from = hidden_from or (from_user = uid), hidden_to = hidden_to or (to_user = uid) where id = p_id;
end $$;

create or replace function public.kg_ledger_list() returns jsonb
language sql stable security definer set search_path = '' as $$
  select coalesce(jsonb_agg(jsonb_build_object('id', s.id, 'from_user', s.from_user, 'to_user', s.to_user, 'title', s.title,
      'range_from', s.range_from, 'range_to', s.range_to, 'created_at', s.created_at,
      'peer', jsonb_build_object('user_id', u.user_id, 'nametag', u.nametag, 'display_name', u.display_name, 'avatar', u.avatar),
      'mine', s.from_user = (select auth.uid()))
    order by s.created_at desc), '[]'::jsonb)
  from public.kg_ledger_shares s
  join public.kg_users u on u.user_id = case when s.from_user = (select auth.uid()) then s.to_user else s.from_user end
  where (s.from_user = (select auth.uid()) and not s.hidden_from) or (s.to_user = (select auth.uid()) and not s.hidden_to)
$$;

-- ---------- permisos de ejecución (solo usuarios con sesión) ----------
do $$
declare f text;
begin
  foreach f in array array[
    'kg_are_friends(uuid, uuid)', 'kg_dm_between(uuid, uuid)', 'kg_user_card(uuid)',
    'kg_friend_request(text)', 'kg_friend_respond(uuid, boolean)', 'kg_friend_remove(uuid)', 'kg_friends()',
    'kg_dm_open(uuid, text)', 'kg_chat_create(text, text, text, uuid[])', 'kg_chat_add(uuid, uuid)',
    'kg_new_invite(uuid)', 'kg_post_invite(uuid, uuid)', 'kg_member_rows(uuid)', 'kg_my_groups()',
    'kg_ledger_share(uuid, text, date, date, jsonb)', 'kg_ledger_hide(uuid)', 'kg_ledger_list()']
  loop
    execute format('revoke execute on function public.%s from public, anon', f);
    execute format('grant execute on function public.%s to authenticated', f);
  end loop;
  -- funciones internas: no se llaman desde la app
  revoke execute on function public.kg_are_friends(uuid, uuid) from authenticated;
  revoke execute on function public.kg_dm_between(uuid, uuid) from authenticated;
  revoke execute on function public.kg_user_card(uuid) from authenticated;
  revoke execute on function public.kg_member_rows(uuid) from authenticated;
end $$;
