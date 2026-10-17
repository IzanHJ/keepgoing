-- KeepGoing v1.16: libretas compartidas con contraseña propia y «Notas para ti» en el Chat

-- ---------- libretas compartidas con contraseña ----------
-- El contenido va cifrado en el dispositivo con una clave que sale de la contraseña elegida por quien comparte
-- (PBKDF2-SHA256 → AES-GCM 256). El texto cifrado no se puede leer directamente: solo se entrega con kg_ledger_open
-- a quien demuestre que conoce la contraseña (prueba PBKDF2 con otra sal, el servidor guarda solo su SHA-256).
-- Tras 5 intentos fallidos la libreta se bloquea 15 minutos: así no se puede probar contraseña tras contraseña.
create table if not exists public.kg_ledger_vault (
  share_id uuid primary key,
  iv text not null check (char_length(iv) <= 40),
  ct text not null check (char_length(ct) <= 2000000),
  check_hash text not null,
  fails int not null default 0,
  locked_until timestamptz
);
alter table public.kg_ledger_vault enable row level security; -- sin políticas: solo se lee con kg_ledger_open
revoke all on table public.kg_ledger_vault from anon, authenticated;

create or replace function public.kg_ledger_share_pw(p_to uuid, p_title text, p_from date, p_to_date date, p_head jsonb, p_iv text, p_ct text, p_proof text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare uid uuid := (select auth.uid()); sid uuid; t text := nullif(btrim(coalesce(p_title, '')), '');
begin
  if uid is null then raise exception 'not authenticated'; end if;
  if p_to is null or p_to = uid then raise exception 'self'; end if;
  if not public.kg_are_friends(uid, p_to) then raise exception 'not a friend'; end if;
  if p_head is null or p_head ->> 'v' is distinct from '2' or coalesce(p_ct, '') = '' or coalesce(p_proof, '') = '' then raise exception 'empty'; end if;
  if t is not null and char_length(t) > 80 then raise exception 'bad title'; end if;
  if p_from is not null and p_to_date is not null and p_from > p_to_date then raise exception 'bad range'; end if;
  if (select count(*) from public.kg_ledger_shares where from_user = uid and created_at > now() - interval '1 hour') >= 20 then raise exception 'slow down'; end if;
  insert into public.kg_ledger_shares (from_user, to_user, title, range_from, range_to, box)
    values (uid, p_to, t, p_from, p_to_date, jsonb_build_object('v', 2, 'pw', true, 'alg', p_head ->> 'alg', 'iter', p_head -> 'iter', 'ksalt', p_head ->> 'ksalt', 'psalt', p_head ->> 'psalt'))
    returning id into sid;
  insert into public.kg_ledger_vault (share_id, iv, ct, check_hash)
    values (sid, p_iv, p_ct, encode(sha256(convert_to(p_proof, 'UTF8')), 'hex'));
  return sid;
end $$;

create or replace function public.kg_ledger_open(p_id uuid, p_proof text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare uid uuid := (select auth.uid()); s public.kg_ledger_shares; v public.kg_ledger_vault;
begin
  select * into s from public.kg_ledger_shares where id = p_id;
  if s.id is null or uid is null or uid not in (s.from_user, s.to_user) then raise exception 'not found'; end if;
  select * into v from public.kg_ledger_vault where share_id = p_id for update;
  if v.share_id is null then raise exception 'not found'; end if;
  -- Los fallos se devuelven (no se lanzan) para que el contador de intentos quede guardado
  if v.locked_until is not null and v.locked_until > now() then return jsonb_build_object('error', 'locked', 'minutes', ceil(extract(epoch from v.locked_until - now()) / 60)); end if;
  if encode(sha256(convert_to(coalesce(p_proof, ''), 'UTF8')), 'hex') <> v.check_hash then
    update public.kg_ledger_vault set fails = case when v.fails + 1 >= 5 then 0 else v.fails + 1 end,
      locked_until = case when v.fails + 1 >= 5 then now() + interval '15 minutes' else null end where share_id = p_id;
    if v.fails + 1 >= 5 then return jsonb_build_object('error', 'locked', 'minutes', 15); end if;
    return jsonb_build_object('error', 'wrong', 'left', 5 - (v.fails + 1));
  end if;
  update public.kg_ledger_vault set fails = 0, locked_until = null where share_id = p_id;
  return jsonb_build_object('iv', v.iv, 'ct', v.ct);
end $$;

-- La lista dice qué libretas van con contraseña
create or replace function public.kg_ledger_list() returns jsonb
language sql stable security definer set search_path = '' as $$
  select coalesce(jsonb_agg(jsonb_build_object('id', s.id, 'from_user', s.from_user, 'to_user', s.to_user, 'title', s.title,
      'range_from', s.range_from, 'range_to', s.range_to, 'created_at', s.created_at,
      'peer', jsonb_build_object('user_id', u.user_id, 'nametag', u.nametag, 'display_name', u.display_name, 'avatar', u.avatar),
      'mine', s.from_user = (select auth.uid()), 'pw', coalesce((s.box ->> 'pw')::boolean, false))
    order by s.created_at desc), '[]'::jsonb)
  from public.kg_ledger_shares s
  join public.kg_users u on u.user_id = case when s.from_user = (select auth.uid()) then s.to_user else s.from_user end
  where (s.from_user = (select auth.uid()) and not s.hidden_from) or (s.to_user = (select auth.uid()) and not s.hidden_to)
$$;

-- ---------- «Notas para ti»: puntuaciones y notas que te han dado, cuando el ranking ya se ha publicado ----------
create or replace function public.kg_my_notes() returns jsonb
language sql stable security definer set search_path = '' as $$
  select coalesce(jsonb_agg(q.x order by q.at desc), '[]'::jsonb) from (
    select r.created_at as at, jsonb_build_object('group_id', r.group_id, 'group_name', g.name, 'group_icon', g.icon, 'period', r.period,
      'from_user', r.from_user, 'from_name', coalesce(u.display_name, m.display_name, '—'), 'from_tag', u.nametag, 'from_avatar', u.avatar,
      'points', r.points, 'note', r.note, 'created_at', r.created_at) as x
    from public.kg_rank_rates r
    join public.kg_groups g on g.id = r.group_id
    join public.kg_rank_periods p on p.group_id = r.group_id and p.period = r.period
    left join public.kg_users u on u.user_id = r.from_user
    left join public.kg_members m on m.group_id = r.group_id and m.user_id = r.from_user
    where r.to_user = (select auth.uid())
    order by r.created_at desc limit 60) q
$$;

do $$
declare f text;
begin
  foreach f in array array['kg_ledger_share_pw(uuid, text, date, date, jsonb, text, text, text)', 'kg_ledger_open(uuid, text)', 'kg_ledger_list()', 'kg_my_notes()']
  loop
    execute format('revoke execute on function public.%s from public, anon', f);
    execute format('grant execute on function public.%s to authenticated', f);
  end loop;
end $$;
