-- v1.27: responder a un mensaje deslizándolo. Un mensaje de texto puede llevar payload.reply = { id, u, b }:
-- id = mensaje al que responde (del MISMO grupo), u = su autor, b = un trozo del texto (máx. 140).
-- El servidor no se fía de lo que manda la app: comprueba que el mensaje existe en el grupo y toma el autor y (si es
-- un texto) el trozo citado de la base de datos; solo para fotos, audios… usa la etiqueta que manda la app, recortada. Cualquier otra clave del payload de un texto se descarta, como hasta ahora.
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
  insert into public.kg_messages (group_id, user_id, kind, body, payload)
    values (p_group, uid, p_kind, left(btrim(coalesce(p_body, '')), 1000), pay)
    returning id into mid;
  return mid;
end $$;
revoke execute on function public.kg_post(uuid, text, text, jsonb) from public, anon;
grant execute on function public.kg_post(uuid, text, text, jsonb) to authenticated;

-- =====================================================================================================
-- v1.27: TORNEOS dentro de un grupo con hábito o proyecto. Eliminatoria entre los miembros elegidos.
-- Cada ronda dura round_days días (1, 3 o 7). Gana el enfrentamiento quien más cumple el hábito/proyecto del grupo
-- en esa ronda (kg_score); si empatan, deciden los votos de los demás miembros (se vota mientras la ronda está en
-- curso); si también empatan los votos, pasa quien va antes en el cuadro. Si el número de jugadores no es potencia
-- de 2, los primeros del cuadro pasan la primera ronda sin jugar. El cuadro se calcula siempre en el servidor.
-- =====================================================================================================
create table if not exists public.kg_tourneys (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.kg_groups(id) on delete cascade,
  created_by uuid not null,
  title text not null check (char_length(title) between 1 and 60),
  round_days int not null check (round_days in (1, 3, 7)),
  starts_on date not null,
  seeds uuid[] not null,
  status text not null default 'live' check (status in ('live', 'cancelled')),
  created_at timestamptz not null default now()
);
create index if not exists kg_tourneys_group on public.kg_tourneys (group_id, created_at desc);
create table if not exists public.kg_tourney_votes (
  tourney_id uuid not null references public.kg_tourneys(id) on delete cascade,
  round int not null, match int not null, voter uuid not null, pick uuid not null,
  primary key (tourney_id, round, match, voter)
);
alter table public.kg_tourneys enable row level security;
alter table public.kg_tourney_votes enable row level security;
-- Sin políticas: solo se accede a través de las funciones de abajo.

-- Cuadro completo con marcadores, votos y ganadores
create or replace function public.kg_tourney_bracket(p_id uuid) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare t public.kg_tourneys; g public.kg_groups; n int; sz int := 1; nr int := 0; r int; m int; td date := public.kg_today();
  cur uuid[]; nxt uuid[]; a uuid; b uuid; sa numeric; sb numeric; va int; vb int; w uuid; f date; e date; st text;
  rounds jsonb := '[]'; ms jsonb; champion uuid := null; myv uuid;
begin
  select * into t from public.kg_tourneys where id = p_id; if t.id is null then return null; end if;
  select * into g from public.kg_groups where id = t.group_id;
  n := coalesce(array_length(t.seeds, 1), 0);
  while sz < n loop sz := sz * 2; nr := nr + 1; end loop;
  -- Primera ronda: los huecos (byes) van contra los primeros del cuadro
  cur := array_fill(null::uuid, array[sz]);
  for m in 0 .. sz / 2 - 1 loop
    cur[2 * m + 1] := t.seeds[m + 1];
    cur[2 * m + 2] := case when sz / 2 + m + 1 <= n then t.seeds[sz / 2 + m + 1] else null end;
  end loop;
  for r in 0 .. nr - 1 loop
    f := t.starts_on + r * t.round_days; e := f + t.round_days - 1;
    st := case when t.status = 'cancelled' then 'cancelled' when td > e then 'done' when td >= f then 'live' else 'next' end;
    ms := '[]'; nxt := array_fill(null::uuid, array[greatest(1, array_length(cur, 1) / 2)]);
    for m in 0 .. array_length(cur, 1) / 2 - 1 loop
      a := cur[2 * m + 1]; b := cur[2 * m + 2]; sa := null; sb := null; va := 0; vb := 0; w := null; myv := null;
      if a is not null and b is not null then
        if st <> 'next' then sa := public.kg_score(t.group_id, g.kind, a, f, least(e, td)); sb := public.kg_score(t.group_id, g.kind, b, f, least(e, td)); end if;
        select count(*) filter (where pick = a), count(*) filter (where pick = b) into va, vb from public.kg_tourney_votes v where v.tourney_id = t.id and v.round = r and v.match = m;
        select pick into myv from public.kg_tourney_votes v where v.tourney_id = t.id and v.round = r and v.match = m and v.voter = (select auth.uid());
        if st = 'done' then w := case when sa > sb then a when sb > sa then b when vb > va then b else a end; end if;
      elsif a is not null or b is not null then w := coalesce(a, b); -- pasa sin jugar
      end if;
      nxt[m + 1] := w;
      ms := ms || jsonb_build_object('a', a, 'b', b, 'sa', sa, 'sb', sb, 'va', va, 'vb', vb, 'w', w, 'my_vote', myv);
    end loop;
    rounds := rounds || jsonb_build_object('from', f, 'to', e, 'state', st, 'matches', ms);
    if r = nr - 1 then champion := nxt[1]; end if;
    cur := nxt;
  end loop;
  return jsonb_build_object('id', t.id, 'title', t.title, 'round_days', t.round_days, 'starts_on', t.starts_on, 'status', t.status, 'created_by', t.created_by,
    'seeds', to_jsonb(t.seeds), 'rounds', rounds, 'champion', champion, 'today', td);
end $$;

-- El torneo más reciente del grupo (en curso o terminado)
create or replace function public.kg_tourney_get(p_group uuid) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare tid uuid;
begin
  if not public.kg_is_member(p_group) then raise exception 'not a member'; end if;
  select id into tid from public.kg_tourneys where group_id = p_group and status = 'live' order by created_at desc limit 1;
  if tid is null then return null; end if;
  return public.kg_tourney_bracket(tid);
end $$;

create or replace function public.kg_tourney_create(p_group uuid, p_title text, p_round_days int, p_players uuid[]) returns uuid
language plpgsql security definer set search_path = '' as $$
declare g public.kg_groups; tid uuid; ps uuid[]; n int; nr int := 0; sz int := 1; old public.kg_tourneys;
begin
  if not public.kg_has_perm(p_group, 'launch') then raise exception 'not allowed'; end if;
  select * into g from public.kg_groups where id = p_group;
  if g.id is null or g.chat is not null then raise exception 'bad group'; end if;
  if p_round_days not in (1, 3, 7) then raise exception 'bad round'; end if;
  -- Solo miembros del grupo, sin repetir, en orden aleatorio
  select array_agg(u order by random()) into ps from (select distinct x as u from unnest(p_players) x where exists (select 1 from public.kg_members mm where mm.group_id = p_group and mm.user_id = x)) s;
  n := coalesce(array_length(ps, 1), 0);
  if n < 2 or n > 16 then raise exception 'bad players'; end if;
  -- Solo un torneo en curso por grupo: uno terminado se archiva al crear el siguiente
  for old in select * from public.kg_tourneys where group_id = p_group and status = 'live' loop
    while sz < coalesce(array_length(old.seeds, 1), 0) loop sz := sz * 2; nr := nr + 1; end loop;
    if old.starts_on + nr * old.round_days - 1 >= public.kg_today() then raise exception 'tourney running'; end if;
    update public.kg_tourneys set status = 'cancelled' where id = old.id; sz := 1; nr := 0;
  end loop;
  insert into public.kg_tourneys (group_id, created_by, title, round_days, starts_on, seeds)
    values (p_group, (select auth.uid()), left(btrim(coalesce(nullif(btrim(p_title), ''), 'Torneo')), 60), p_round_days, public.kg_today(), ps)
    returning id into tid;
  perform public.kg_sys(p_group, 'tourney_started', jsonb_build_object('title', left(btrim(coalesce(nullif(btrim(p_title), ''), 'Torneo')), 60), 'n', n));
  return tid;
end $$;

create or replace function public.kg_tourney_vote(p_tourney uuid, p_round int, p_match int, p_pick uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare t public.kg_tourneys; br jsonb; rd jsonb; mt jsonb; uid uuid := (select auth.uid());
begin
  select * into t from public.kg_tourneys where id = p_tourney;
  if t.id is null or t.status <> 'live' or not public.kg_is_member(t.group_id) then raise exception 'not allowed'; end if;
  br := public.kg_tourney_bracket(p_tourney); rd := br -> 'rounds' -> p_round; mt := rd -> 'matches' -> p_match;
  if rd is null or mt is null or rd ->> 'state' <> 'live' then raise exception 'not open'; end if;
  if mt ->> 'a' is null or mt ->> 'b' is null or p_pick::text not in (mt ->> 'a', mt ->> 'b') then raise exception 'bad pick'; end if;
  if uid::text in (mt ->> 'a', mt ->> 'b') then raise exception 'player'; end if;
  insert into public.kg_tourney_votes (tourney_id, round, match, voter, pick) values (p_tourney, p_round, p_match, uid, p_pick)
    on conflict (tourney_id, round, match, voter) do update set pick = excluded.pick;
end $$;

create or replace function public.kg_tourney_cancel(p_tourney uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare t public.kg_tourneys;
begin
  select * into t from public.kg_tourneys where id = p_tourney;
  if t.id is null or not (t.created_by = (select auth.uid()) or public.kg_has_perm(t.group_id, 'moderate')) then raise exception 'not allowed'; end if;
  update public.kg_tourneys set status = 'cancelled' where id = p_tourney;
end $$;

do $$
declare f text;
begin
  foreach f in array array['kg_tourney_get(uuid)', 'kg_tourney_create(uuid, text, integer, uuid[])', 'kg_tourney_vote(uuid, integer, integer, uuid)', 'kg_tourney_cancel(uuid)'] loop
    execute format('revoke execute on function public.%s from public, anon', f);
    execute format('grant execute on function public.%s to authenticated', f);
  end loop;
  revoke execute on function public.kg_tourney_bracket(uuid) from public, anon, authenticated;
end $$;
