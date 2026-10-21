-- v1.20: Calendario de turnos compartido con amigos por @nametag (solo para verlo)
-- Cada persona publica UNA copia de su calendario (turnos, horarios y colores de los próximos 12 meses; nunca notas, precios ni pagas)
-- y decide a qué amigos se la deja ver. Cuando cambia algo, la app vuelve a publicar y los amigos ven la versión nueva.

create table if not exists public.kg_cal_pub (
  owner uuid primary key,
  payload jsonb not null default '{}' check (pg_column_size(payload) < 400000),
  updated_at timestamptz not null default now()
);
alter table public.kg_cal_pub enable row level security; -- sin políticas: solo se lee con kg_cal_list
revoke all on table public.kg_cal_pub from anon, authenticated;

create table if not exists public.kg_cal_grants (
  owner uuid not null,
  to_user uuid not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (owner, to_user)
);
create index if not exists kg_cal_grants_to_idx on public.kg_cal_grants (to_user) where active;
alter table public.kg_cal_grants enable row level security;
revoke all on table public.kg_cal_grants from anon, authenticated;

-- Publicar (o actualizar) mi calendario
create or replace function public.kg_cal_publish(p_payload jsonb) returns timestamptz
language plpgsql security definer set search_path = '' as $$
declare uid uuid := (select auth.uid()); ts timestamptz := now(); last timestamptz;
begin
  if uid is null then raise exception 'not authenticated'; end if;
  if p_payload is null or coalesce(jsonb_typeof(p_payload), '') <> 'object' or coalesce(jsonb_typeof(p_payload -> 'shifts'), '') <> 'array' or coalesce(jsonb_typeof(p_payload -> 'days'), '') <> 'object' then raise exception 'bad payload'; end if;
  if pg_column_size(p_payload) >= 400000 then raise exception 'too big'; end if;
  select updated_at into last from public.kg_cal_pub where owner = uid;
  if last is not null and last > ts - interval '2 seconds' then raise exception 'slow down'; end if;
  insert into public.kg_cal_pub (owner, payload, updated_at) values (uid, p_payload, ts)
    on conflict (owner) do update set payload = excluded.payload, updated_at = excluded.updated_at;
  return ts;
end $$;

-- Dejar que un amigo vea mi calendario
create or replace function public.kg_cal_grant(p_to uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare uid uuid := (select auth.uid());
begin
  if uid is null then raise exception 'not authenticated'; end if;
  if p_to is null or p_to = uid then raise exception 'self'; end if;
  if not public.kg_are_friends(uid, p_to) then raise exception 'not a friend'; end if;
  if (select count(*) from public.kg_cal_grants where owner = uid and active) >= 50 then raise exception 'too many'; end if;
  insert into public.kg_cal_grants (owner, to_user) values (uid, p_to)
    on conflict (owner, to_user) do update set active = true, updated_at = now();
end $$;

-- Dejar de compartir con un amigo. Si ya no lo ve nadie, la copia publicada se vacía.
create or replace function public.kg_cal_revoke(p_to uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare uid uuid := (select auth.uid());
begin
  if uid is null then raise exception 'not authenticated'; end if;
  update public.kg_cal_grants set active = false, updated_at = now() where owner = uid and to_user = p_to;
  if not exists (select 1 from public.kg_cal_grants where owner = uid and active) then
    update public.kg_cal_pub set payload = '{}', updated_at = now() where owner = uid;
  end if;
end $$;

-- Con quién comparto yo y qué calendarios me comparten (con su contenido)
create or replace function public.kg_cal_list() returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'mine', coalesce((select jsonb_agg(jsonb_build_object('to_user', g.to_user,
        'peer', jsonb_build_object('user_id', u.user_id, 'nametag', u.nametag, 'display_name', u.display_name, 'avatar', u.avatar)) order by g.created_at)
      from public.kg_cal_grants g join public.kg_users u on u.user_id = g.to_user
      where g.owner = (select auth.uid()) and g.active), '[]'::jsonb),
    'shared', coalesce((select jsonb_agg(jsonb_build_object('owner', g.owner, 'updated_at', p.updated_at, 'payload', p.payload,
        'peer', jsonb_build_object('user_id', u.user_id, 'nametag', u.nametag, 'display_name', u.display_name, 'avatar', u.avatar)) order by p.updated_at desc)
      from public.kg_cal_grants g join public.kg_users u on u.user_id = g.owner
      left join public.kg_cal_pub p on p.owner = g.owner
      where g.to_user = (select auth.uid()) and g.active and public.kg_are_friends(g.owner, g.to_user)), '[]'::jsonb),
    'published', (select updated_at from public.kg_cal_pub where owner = (select auth.uid())))
$$;

do $$
declare f text;
begin
  foreach f in array array['kg_cal_publish(jsonb)', 'kg_cal_grant(uuid)', 'kg_cal_revoke(uuid)', 'kg_cal_list()']
  loop
    execute format('revoke execute on function public.%s from public, anon', f);
    execute format('grant execute on function public.%s to authenticated', f);
  end loop;
end $$;
