-- Pruebas de la migración de planes. Se ejecuta con: psql -v ON_ERROR_STOP=1 -f stub.sql -f ../../supabase/migrations/20261026_v124_planes.sql -f planes.test.sql
\set ON_ERROR_STOP 1
insert into auth.users (id) values ('00000000-0000-0000-0000-000000000001'), ('00000000-0000-0000-0000-000000000002'), ('00000000-0000-0000-0000-000000000003');
insert into public.kg_users values ('00000000-0000-0000-0000-000000000001', 'dueno', 'Dueño'), ('00000000-0000-0000-0000-000000000002', 'nuevo', 'Nuevo'), ('00000000-0000-0000-0000-000000000003', 'otro', 'Otro');
-- Los ya registrados al migrar se vuelven especiales: aquí los quitamos para probar desde cero
delete from public.kg_plans;
insert into public.kg_staff values ('00000000-0000-0000-0000-000000000001', 'owner');

create function pg_temp.check(cond boolean, msg text) returns void language plpgsql as $$ begin if not cond then raise exception 'FALLA: %', msg; end if; raise notice 'ok: %', msg; end $$;

-- Sin nada: Free
set test.uid = '00000000-0000-0000-0000-000000000002';
select pg_temp.check(public.kg_entitlement() ->> 'plan' = 'free', 'sin prueba ni pago = free');
-- Free: un grupo sí, el segundo no; los chats privados no cuentan
insert into public.kg_groups (owner, name, chat) values ('00000000-0000-0000-0000-000000000002', 'uno', 'group');
insert into public.kg_groups (owner, name, chat) values ('00000000-0000-0000-0000-000000000002', 'dm', 'dm');
do $$ begin insert into public.kg_groups (owner, name, chat) values ('00000000-0000-0000-0000-000000000002', 'dos', 'group'); raise exception 'FALLA: dejó crear 2 grupos'; exception when others then if sqlerrm <> 'plan' then raise; end if; end $$;
do $$ begin insert into public.kg_ledger_shares (from_user) values ('00000000-0000-0000-0000-000000000002'); raise exception 'FALLA: dejó compartir libreta'; exception when others then if sqlerrm <> 'plan' then raise; end if; end $$;
do $$ begin insert into public.kg_cal_grants (owner, to_user) values ('00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000003'); raise exception 'FALLA: dejó compartir calendario'; exception when others then if sqlerrm <> 'plan' then raise; end if; end $$;
-- Prueba de 14 días: acceso completo, y solo una vez
select pg_temp.check(public.kg_trial_start() ->> 'plan' = 'trial', 'prueba empezada');
insert into public.kg_groups (owner, name, chat) values ('00000000-0000-0000-0000-000000000002', 'dos', 'group');
insert into public.kg_ledger_shares (from_user) values ('00000000-0000-0000-0000-000000000002');
update public.kg_trials set started_at = now() - interval '15 days';
select pg_temp.check(public.kg_trial_start() ->> 'plan' = 'free', 'la prueba no se repite al acabar');
-- No es del equipo: el panel no existe para él
do $$ begin perform public.kg_staff_overview(); raise exception 'FALLA: panel visible'; exception when others then if sqlerrm <> 'not found' then raise; end if; end $$;
-- Keys inválidas cuentan como intento fallido
select pg_temp.check(public.kg_redeem_key('AAAA-BBBB-CCCC-DDDD') ->> 'error' = 'bad', 'key inexistente');

-- El dueño genera keys
set test.uid = '00000000-0000-0000-0000-000000000001';
create temp table k as select jsonb_array_elements_text(public.kg_staff_keys_create(2, 'forever', 'sorteo')) as code;
select pg_temp.check((select count(*) from k) = 2 and (select bool_and(code ~ '^[A-HJ-NP-Z2-9]{4}(-[A-HJ-NP-Z2-9]{4}){3}$') from k), 'formato XXXX-XXXX-XXXX-XXXX sin 0/O/1/I');
select pg_temp.check((select count(*) from public.kg_keys where code_hash in (select public.kg_key_hash(code) from k)) = 2, 'solo se guarda el hash');
select pg_temp.check(public.kg_entitlement() ->> 'role' = 'owner', 'el dueño se ve como owner');

-- El usuario canjea (en minúsculas y sin guiones también vale)
set test.uid = '00000000-0000-0000-0000-000000000002';
select pg_temp.check(public.kg_redeem_key(lower(replace((select min(code) from k), '-', ''))) ->> 'plan' = 'keepgoing', 'key canjeada = Usuario KeepGoing');
select pg_temp.check(public.kg_redeem_key((select min(code) from k)) ->> 'error' = 'mine', 'la misma key otra vez = ya es tuya');
set test.uid = '00000000-0000-0000-0000-000000000003';
select pg_temp.check(public.kg_redeem_key((select min(code) from k)) ->> 'error' = 'used', 'key usada por otro');
-- Bloqueo tras 5 fallos
select public.kg_redeem_key('XXXX') from generate_series(1, 5);
select pg_temp.check(public.kg_redeem_key((select max(code) from k)) ->> 'error' = 'locked', 'bloqueo tras 5 fallos');
-- Insignias
select pg_temp.check(public.kg_badges(array['00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000003']::uuid[]) = array['00000000-0000-0000-0000-000000000002']::uuid[], 'insignias');

-- Panel: dar y quitar, funciones activables, rol de desarrollador
set test.uid = '00000000-0000-0000-0000-000000000001';
select public.kg_staff_grant('@Otro', 'special', null, 'sorteo');
select pg_temp.check((select source from public.kg_plans where user_id = '00000000-0000-0000-0000-000000000003') = 'special', 'especial por @nametag');
select public.kg_staff_revoke('00000000-0000-0000-0000-000000000003');
select public.kg_staff_flag('calLayers', 'staff', 'Calendario con capas');
select pg_temp.check(public.kg_entitlement() -> 'flags' ->> 'calLayers' = 'staff', 'el equipo ve la función en pruebas');
select public.kg_staff_set_dev('otro', true);
set test.uid = '00000000-0000-0000-0000-000000000003';
select pg_temp.check(public.kg_entitlement() ->> 'role' = 'dev', 'rol de desarrollador dado');
select pg_temp.check(public.kg_entitlement() -> 'flags' ->> 'calLayers' = 'staff', 'el desarrollador ve la función en pruebas');
do $$ begin perform public.kg_staff_flag('x1', 'all', null); raise exception 'FALLA: dev cambió funciones'; exception when others then if sqlerrm <> 'owner only' then raise; end if; end $$;
set test.uid = '00000000-0000-0000-0000-000000000002';
select pg_temp.check(public.kg_entitlement() -> 'flags' -> 'calLayers' is null, 'un usuario normal no ve la función en pruebas');
set test.uid = '00000000-0000-0000-0000-000000000001';
select public.kg_staff_set_dev('otro', false);
select pg_temp.check(not exists (select 1 from public.kg_staff where user_id = '00000000-0000-0000-0000-000000000003'), 'rol de desarrollador quitado (reversible)');
select pg_temp.check(jsonb_array_length(public.kg_staff_overview() -> 'users') = 3, 'el panel lista usuarios');
