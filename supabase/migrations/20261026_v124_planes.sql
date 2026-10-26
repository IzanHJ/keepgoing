-- KeepGoing v1.24 — Planes: prueba de 14 días, Usuario KeepGoing (pago único o especial), keys canjeables,
-- equipo (dueño y desarrolladores) y funciones activables. Todo se comprueba aquí, en el servidor:
-- la app solo lo enseña. Las tablas van con RLS y sin políticas: solo se tocan con estas funciones.

-- ---------- Tablas ----------
create table if not exists public.kg_plans (
  user_id uuid primary key references auth.users(id) on delete cascade,
  plan text not null default 'keepgoing' check (plan in ('keepgoing')),
  -- De dónde viene: special (lista de usuarios especiales), paddle (pago en la app), key (key canjeada), grant (dado a mano)
  source text not null check (source in ('special', 'paddle', 'key', 'grant')),
  term text not null default 'forever' check (term in ('forever', 'month', 'year')),
  since timestamptz not null default now(),
  until timestamptz,                         -- null = indefinido
  note text,
  updated_at timestamptz not null default now()
);
alter table public.kg_plans enable row level security;
comment on table public.kg_plans is 'RLS sin políticas a propósito: solo se lee y escribe con funciones SECURITY DEFINER.';

create table if not exists public.kg_trials (
  user_id uuid primary key references auth.users(id) on delete cascade,
  started_at timestamptz not null default now()
);
alter table public.kg_trials enable row level security;
comment on table public.kg_trials is 'Una prueba de 14 días por cuenta. RLS sin políticas a propósito.';

create table if not exists public.kg_staff (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('owner', 'dev')),
  created_at timestamptz not null default now()
);
alter table public.kg_staff enable row level security;
comment on table public.kg_staff is 'Dueño y desarrolladores. RLS sin políticas a propósito: nunca se expone a los usuarios.';

create table if not exists public.kg_keys (
  id uuid primary key default gen_random_uuid(),
  code_hash text not null unique,            -- sha256 de la key normalizada (la key en claro no se guarda)
  hint text not null,                        -- últimos 4 caracteres, para reconocerla en el panel
  term text not null default 'forever' check (term in ('forever', 'month', 'year')),
  source text not null default 'web' check (source in ('web', 'gift', 'paddle')),
  note text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  txn text unique,                           -- transacción de Paddle que la generó (compra en la web)
  redeemed_by uuid references auth.users(id) on delete set null,
  redeemed_at timestamptz,
  revoked boolean not null default false
);
alter table public.kg_keys enable row level security;
comment on table public.kg_keys is 'Keys XXXX-XXXX-XXXX-XXXX. RLS sin políticas a propósito.';

create table if not exists public.kg_flags (
  key text primary key check (key ~ '^[a-zA-Z0-9_]{2,40}$'),
  mode text not null default 'staff' check (mode in ('off', 'staff', 'all')),
  note text,
  updated_at timestamptz not null default now()
);
alter table public.kg_flags enable row level security;
comment on table public.kg_flags is 'Funciones activables: off = nadie, staff = solo el equipo (pruebas), all = todos. RLS sin políticas.';

-- ---------- Ayudas internas ----------
create or replace function public.kg_staff_role(p_user uuid) returns text
language sql stable security definer set search_path = '' as $$
  select role from public.kg_staff where user_id = p_user
$$;

-- ¿Tiene acceso completo? (de pago vigente o prueba vigente)
create or replace function public.kg_has_full(p_user uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select p_user is null
    or exists (select 1 from public.kg_staff s where s.user_id = p_user)
    or exists (select 1 from public.kg_plans p where p.user_id = p_user and (p.until is null or p.until > now()))
    or exists (select 1 from public.kg_trials t where t.user_id = p_user and t.started_at + interval '14 days' > now())
$$;

create or replace function public.kg_need_staff() returns uuid
language plpgsql stable security definer set search_path = '' as $$
declare uid uuid := (select auth.uid());
begin
  if uid is null or public.kg_staff_role(uid) is null then raise exception 'not found'; end if;
  return uid;
end $$;

-- Key normalizada: solo A-Z y 2-9 (sin 0/O/1/I), 16 caracteres
create or replace function public.kg_key_norm(p_code text) returns text
language sql immutable set search_path = '' as $$
  select upper(regexp_replace(coalesce(p_code, ''), '[^A-Za-z0-9]', '', 'g'))
$$;

create or replace function public.kg_key_new() returns text
language plpgsql volatile set search_path = '' as $$
declare a text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; b bytea := extensions.gen_random_bytes(16); s text := ''; i int;
begin
  for i in 0..15 loop s := s || substr(a, (get_byte(b, i) % 32) + 1, 1); end loop;
  return substr(s, 1, 4) || '-' || substr(s, 5, 4) || '-' || substr(s, 9, 4) || '-' || substr(s, 13, 4);
end $$;

create or replace function public.kg_key_hash(p_code text) returns text
language sql immutable set search_path = '' as $$
  select encode(extensions.digest(public.kg_key_norm(p_code), 'sha256'), 'hex')
$$;

-- ---------- Lo que ve cada usuario ----------
-- Plan actual: keepgoing | trial | free, más fechas, si es del equipo y qué funciones en pruebas tiene encendidas
create or replace function public.kg_entitlement() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare uid uuid := (select auth.uid()); p public.kg_plans; tr public.kg_trials; role text; plan text := 'free'; flags jsonb;
begin
  if uid is null then raise exception 'not authenticated'; end if;
  select * into p from public.kg_plans where user_id = uid and (until is null or until > now());
  select * into tr from public.kg_trials where user_id = uid;
  role := public.kg_staff_role(uid);
  if p.user_id is not null then plan := 'keepgoing';
  elsif tr.user_id is not null and tr.started_at + interval '14 days' > now() then plan := 'trial'; end if;
  select coalesce(jsonb_object_agg(f.key, f.mode), '{}'::jsonb) into flags from public.kg_flags f
    where f.mode = 'all' or (f.mode = 'staff' and role is not null) or f.mode = 'off';
  return jsonb_build_object('plan', plan, 'source', p.source, 'term', p.term, 'since', p.since, 'until', p.until,
    'trial_started', tr.started_at, 'trial_ends', tr.started_at + interval '14 days', 'role', role, 'flags', flags, 'now', now());
end $$;

-- Empieza la prueba de 14 días (una vez por cuenta). Devuelve el plan actualizado.
create or replace function public.kg_trial_start() returns jsonb
language plpgsql volatile security definer set search_path = '' as $$
declare uid uuid := (select auth.uid());
begin
  if uid is null then raise exception 'not authenticated'; end if;
  insert into public.kg_trials (user_id) values (uid) on conflict (user_id) do nothing;
  return public.kg_entitlement();
end $$;

-- Canjear una key. 5 intentos fallidos cada 15 minutos.
create or replace function public.kg_redeem_key(p_code text) returns jsonb
language plpgsql volatile security definer set search_path = '' as $$
declare uid uuid := (select auth.uid()); k public.kg_keys; n int;
begin
  if uid is null then raise exception 'not authenticated'; end if;
  select count(*) into n from public.kg_rate where user_id = uid and bucket = 'redeem_fail' and at > now() - interval '15 minutes';
  if n >= 5 then return jsonb_build_object('error', 'locked'); end if;
  if char_length(public.kg_key_norm(p_code)) <> 16 then
    insert into public.kg_rate (user_id, bucket) values (uid, 'redeem_fail');
    return jsonb_build_object('error', 'bad', 'left', 4 - n);
  end if;
  select * into k from public.kg_keys where code_hash = public.kg_key_hash(p_code) for update;
  if k.id is null or k.revoked then
    insert into public.kg_rate (user_id, bucket) values (uid, 'redeem_fail');
    return jsonb_build_object('error', 'bad', 'left', 4 - n);
  end if;
  if k.redeemed_by is not null then
    return jsonb_build_object('error', case when k.redeemed_by = uid then 'mine' else 'used' end);
  end if;
  update public.kg_keys set redeemed_by = uid, redeemed_at = now() where id = k.id;
  insert into public.kg_plans (user_id, source, term, until, note)
    values (uid, 'key', k.term, case k.term when 'month' then now() + interval '1 month' when 'year' then now() + interval '1 year' end, 'key …' || k.hint)
    on conflict (user_id) do update set source = 'key', term = excluded.term,
      until = case when public.kg_plans.until is null and public.kg_plans.term = 'forever' then null else excluded.until end,
      note = excluded.note, updated_at = now();
  return public.kg_entitlement();
end $$;

-- Insignias: qué usuarios de esta lista son «Usuario KeepGoing» (para mostrarlo junto al @nametag)
create or replace function public.kg_badges(p_users uuid[]) returns uuid[]
language sql stable security definer set search_path = '' as $$
  select coalesce(array_agg(p.user_id), '{}') from public.kg_plans p
  where p.user_id = any (coalesce(p_users, '{}')) and (p.until is null or p.until > now())
    and (select auth.uid()) is not null and cardinality(coalesce(p_users, '{}')) <= 200
$$;

-- ---------- Panel del equipo (solo dueño y desarrolladores) ----------
create or replace function public.kg_staff_overview() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare me uuid := public.kg_need_staff();
begin
  return jsonb_build_object(
    'role', public.kg_staff_role(me),
    'users', (select coalesce(jsonb_agg(jsonb_build_object(
        'user_id', u.id, 'created_at', u.created_at, 'nametag', ku.nametag, 'name', ku.display_name,
        'plan', case when p.user_id is not null and (p.until is null or p.until > now()) then 'keepgoing'
                     when t.user_id is not null and t.started_at + interval '14 days' > now() then 'trial' else 'free' end,
        'source', p.source, 'term', p.term, 'until', p.until, 'trial_ends', t.started_at + interval '14 days',
        'staff', s.role) order by u.created_at), '[]'::jsonb)
      from auth.users u left join public.kg_users ku on ku.user_id = u.id left join public.kg_plans p on p.user_id = u.id
      left join public.kg_trials t on t.user_id = u.id left join public.kg_staff s on s.user_id = u.id),
    'keys', (select coalesce(jsonb_agg(jsonb_build_object('id', k.id, 'hint', k.hint, 'term', k.term, 'source', k.source, 'note', k.note,
        'created_at', k.created_at, 'redeemed_at', k.redeemed_at, 'redeemed_tag', ku.nametag, 'revoked', k.revoked) order by k.created_at desc), '[]'::jsonb)
      from public.kg_keys k left join public.kg_users ku on ku.user_id = k.redeemed_by),
    'flags', (select coalesce(jsonb_agg(jsonb_build_object('key', f.key, 'mode', f.mode, 'note', f.note) order by f.key), '[]'::jsonb) from public.kg_flags f)
  );
end $$;

-- Genera keys (máx. 50 de una vez). Devuelve las keys en claro una sola vez.
create or replace function public.kg_staff_keys_create(p_n int, p_term text, p_note text) returns jsonb
language plpgsql volatile security definer set search_path = '' as $$
declare me uuid := public.kg_need_staff(); out jsonb := '[]'::jsonb; c text; i int;
begin
  if p_n is null or p_n not between 1 and 50 then raise exception 'bad n'; end if;
  if coalesce(p_term, 'forever') not in ('forever', 'month', 'year') then raise exception 'bad term'; end if;
  for i in 1..p_n loop
    c := public.kg_key_new();
    insert into public.kg_keys (code_hash, hint, term, source, note, created_by)
      values (public.kg_key_hash(c), right(c, 4), coalesce(p_term, 'forever'), 'gift', left(nullif(btrim(coalesce(p_note, '')), ''), 120), me);
    out := out || to_jsonb(c);
  end loop;
  return out;
end $$;

create or replace function public.kg_staff_key_revoke(p_id uuid) returns void
language plpgsql volatile security definer set search_path = '' as $$
begin
  perform public.kg_need_staff();
  update public.kg_keys set revoked = true where id = p_id and redeemed_by is null;
end $$;

-- Dar «Usuario KeepGoing» (special o grant) por @nametag; p_days null = indefinido
create or replace function public.kg_staff_grant(p_tag text, p_source text, p_days int, p_note text) returns void
language plpgsql volatile security definer set search_path = '' as $$
declare uid uuid;
begin
  perform public.kg_need_staff();
  if coalesce(p_source, '') not in ('special', 'grant') then raise exception 'bad source'; end if;
  select user_id into uid from public.kg_users where nametag = lower(ltrim(btrim(coalesce(p_tag, '')), '@'));
  if uid is null then raise exception 'no user'; end if;
  insert into public.kg_plans (user_id, source, term, until, note)
    values (uid, p_source, 'forever', case when p_days is null then null else now() + make_interval(days => p_days) end, left(nullif(btrim(coalesce(p_note, '')), ''), 120))
    on conflict (user_id) do update set source = excluded.source, term = excluded.term, until = excluded.until, note = excluded.note, updated_at = now();
end $$;

-- Quitar el plan (vuelve a prueba o Free). No se puede quitar a sí mismo ni a nadie del equipo.
create or replace function public.kg_staff_revoke(p_user uuid) returns void
language plpgsql volatile security definer set search_path = '' as $$
declare me uuid := public.kg_need_staff();
begin
  if p_user = me then raise exception 'self'; end if;
  delete from public.kg_plans where user_id = p_user;
end $$;

-- Volver a dar una prueba de 14 días desde hoy
create or replace function public.kg_staff_trial_reset(p_user uuid) returns void
language plpgsql volatile security definer set search_path = '' as $$
begin
  perform public.kg_need_staff();
  insert into public.kg_trials (user_id, started_at) values (p_user, now())
    on conflict (user_id) do update set started_at = now();
end $$;

-- Funciones activables (solo el dueño las cambia; los desarrolladores las ven)
create or replace function public.kg_staff_flag(p_key text, p_mode text, p_note text) returns void
language plpgsql volatile security definer set search_path = '' as $$
declare me uuid := public.kg_need_staff();
begin
  if public.kg_staff_role(me) <> 'owner' then raise exception 'owner only'; end if;
  if p_mode is null then delete from public.kg_flags where key = p_key; return; end if;
  insert into public.kg_flags (key, mode, note) values (p_key, p_mode, left(nullif(btrim(coalesce(p_note, '')), ''), 200))
    on conflict (key) do update set mode = excluded.mode, note = coalesce(excluded.note, public.kg_flags.note), updated_at = now();
end $$;

-- Dar o quitar el rol de desarrollador por @nametag (solo el dueño)
create or replace function public.kg_staff_set_dev(p_tag text, p_on boolean) returns void
language plpgsql volatile security definer set search_path = '' as $$
declare me uuid := public.kg_need_staff(); uid uuid;
begin
  if public.kg_staff_role(me) <> 'owner' then raise exception 'owner only'; end if;
  select user_id into uid from public.kg_users where nametag = lower(ltrim(btrim(coalesce(p_tag, '')), '@'));
  if uid is null then raise exception 'no user'; end if;
  if uid = me then raise exception 'self'; end if;
  if p_on then insert into public.kg_staff (user_id, role) values (uid, 'dev') on conflict (user_id) do nothing;
  else delete from public.kg_staff where user_id = uid and role = 'dev'; end if;
end $$;

-- ---------- Límites del plan Free en lo que pasa por el servidor ----------
-- Crear grupos: con Free, como mucho 1 propio (los chats privados no cuentan)
create or replace function public.kg_tr_plan_groups() returns trigger
language plpgsql security definer set search_path = '' as $$
declare uid uuid := (select auth.uid());
begin
  if uid is null or new.chat is not distinct from 'dm' or public.kg_has_full(uid) then return new; end if;
  if (select count(*) from public.kg_groups g where g.owner = uid and g.chat is distinct from 'dm') >= 1 then raise exception 'plan'; end if;
  return new;
end $$;
drop trigger if exists kg_plan_groups on public.kg_groups;
create trigger kg_plan_groups before insert on public.kg_groups for each row execute function public.kg_tr_plan_groups();

-- Compartir libretas, proyecciones y el calendario: solo con acceso completo
create or replace function public.kg_tr_plan_full() returns trigger
language plpgsql security definer set search_path = '' as $$
declare uid uuid := (select auth.uid());
begin
  if uid is null or public.kg_has_full(uid) then return new; end if;
  raise exception 'plan';
end $$;
drop trigger if exists kg_plan_full on public.kg_ledger_shares;
create trigger kg_plan_full before insert on public.kg_ledger_shares for each row execute function public.kg_tr_plan_full();
drop trigger if exists kg_plan_full on public.kg_proj_shares;
create trigger kg_plan_full before insert on public.kg_proj_shares for each row execute function public.kg_tr_plan_full();
drop trigger if exists kg_plan_full on public.kg_cal_grants;
create trigger kg_plan_full before insert on public.kg_cal_grants for each row execute function public.kg_tr_plan_full();

-- ---------- Permisos ----------
revoke all on function public.kg_staff_role(uuid), public.kg_has_full(uuid), public.kg_need_staff(), public.kg_key_new(),
  public.kg_tr_plan_groups(), public.kg_tr_plan_full() from public, anon, authenticated;
revoke all on function public.kg_entitlement(), public.kg_trial_start(), public.kg_redeem_key(text), public.kg_badges(uuid[]),
  public.kg_staff_overview(), public.kg_staff_keys_create(int, text, text), public.kg_staff_key_revoke(uuid),
  public.kg_staff_grant(text, text, int, text), public.kg_staff_revoke(uuid), public.kg_staff_trial_reset(uuid),
  public.kg_staff_flag(text, text, text), public.kg_staff_set_dev(text, boolean) from public, anon;
grant execute on function public.kg_entitlement(), public.kg_trial_start(), public.kg_redeem_key(text), public.kg_badges(uuid[]),
  public.kg_staff_overview(), public.kg_staff_keys_create(int, text, text), public.kg_staff_key_revoke(uuid),
  public.kg_staff_grant(text, text, int, text), public.kg_staff_revoke(uuid), public.kg_staff_trial_reset(uuid),
  public.kg_staff_flag(text, text, text), public.kg_staff_set_dev(text, boolean) to authenticated;

-- ---------- Usuarios especiales: todos los registrados hasta hoy tienen «Usuario KeepGoing» regalado ----------
insert into public.kg_plans (user_id, source, term, until, note)
  select id, 'special', 'forever', null, 'Registrado antes de los planes (v1.24)' from auth.users
  on conflict (user_id) do nothing;
