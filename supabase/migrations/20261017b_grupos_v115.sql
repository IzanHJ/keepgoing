-- KeepGoing v1.15 · Grupos y chat:
--  · los proyectos compartidos llevan sus hábitos vinculados (el líder puede actualizar la ficha del grupo)
--  · un grupo de chat puede convertirse en grupo con proyecto, ranking, ID y estadísticas
--  · solicitudes para unirse por ID (solo líder y colíder las aceptan)
--  · puntos entre miembros (0-10 con nota) una vez por periodo del ranking; se publican al cerrar el periodo
--  · foto del grupo
--  · fotos de una sola vez, audios y stickers en el chat
-- Ningún dato de la Libreta de Gastos se toca ni se expone aquí.

-- ---------- utilidades ----------
-- Periodo del ranking que contiene un día (mismo cálculo que kg_settle)
create or replace function public.kg_period_of(p_freq text, p_day date, out ps date, out pe date, out pkey text)
language sql immutable set search_path = '' as $$
  select s.ps,
    case p_freq when '1W' then s.ps + 6 when '1M' then (s.ps + interval '1 month')::date - 1 else (s.ps + interval '1 year')::date - 1 end,
    case p_freq when '1W' then 'W' || to_char(s.ps, 'YYYY-MM-DD') when '1M' then 'M' || to_char(s.ps, 'YYYY-MM') else 'Y' || to_char(s.ps, 'YYYY') end
  from (select case p_freq when '1W' then date_trunc('week', p_day)::date when '1M' then date_trunc('month', p_day)::date else date_trunc('year', p_day)::date end as ps) s
$$;

create or replace function public.kg_is_mod(gid uuid) returns boolean
language sql stable security definer set search_path = '' as
$$ select coalesce(public.kg_my_role(gid) in ('lider', 'colider'), false) $$;

-- ---------- ficha del grupo (hábitos vinculados del proyecto) ----------
create or replace function public.kg_set_spec(p_group uuid, p_spec jsonb) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if public.kg_my_role(p_group) is distinct from 'lider' then raise exception 'not allowed'; end if;
  if p_spec is null or pg_column_size(p_spec) > 20000 then raise exception 'bad spec'; end if;
  update public.kg_groups set spec = p_spec where id = p_group and chat is null;
end $$;

-- ---------- de grupo de chat a grupo con proyecto ----------
create or replace function public.kg_chat_upgrade(p_group uuid, p_kind text, p_spec jsonb, p_local_id text) returns void
language plpgsql security definer set search_path = '' as $$
declare g public.kg_groups;
begin
  select * into g from public.kg_groups where id = p_group;
  if g.id is null or g.chat is distinct from 'group' then raise exception 'not allowed'; end if;
  if public.kg_my_role(p_group) is distinct from 'lider' then raise exception 'not allowed'; end if;
  if p_kind not in ('habit', 'project') or p_spec is null or pg_column_size(p_spec) > 20000 then raise exception 'bad spec'; end if;
  update public.kg_groups set chat = null, kind = p_kind, spec = p_spec, code = coalesce(code, public.kg_new_code()) where id = p_group;
  update public.kg_members set local_id = p_local_id where group_id = p_group and user_id = (select auth.uid());
  perform public.kg_sys(p_group, 'upgraded', jsonb_build_object('kind', p_kind, 'name', p_spec ->> 'name'));
end $$;

-- ---------- foto del grupo ----------
alter table public.kg_groups add column if not exists avatar text check (char_length(avatar) <= 40000);
create or replace function public.kg_set_group_avatar(p_group uuid, p_avatar text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not public.kg_is_mod(p_group) then raise exception 'not allowed'; end if;
  if exists (select 1 from public.kg_groups where id = p_group and chat = 'dm') then raise exception 'not allowed on dm'; end if;
  if p_avatar is not null and (char_length(p_avatar) > 40000 or p_avatar !~ '^data:image/(jpeg|png|webp);base64,') then raise exception 'bad image'; end if;
  update public.kg_groups set avatar = p_avatar where id = p_group;
end $$;

-- ---------- solicitudes para unirse por ID ----------
create table if not exists public.kg_join_requests (
  group_id uuid not null references public.kg_groups (id) on delete cascade,
  user_id uuid not null,
  display_name text not null check (char_length(display_name) between 1 and 40),
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined')),
  created_at timestamptz not null default now(),
  primary key (group_id, user_id)
);
alter table public.kg_join_requests enable row level security;
create policy kg_join_requests_own_read on public.kg_join_requests for select to authenticated using ((select auth.uid()) = user_id);
revoke all on table public.kg_join_requests from anon, authenticated;
grant select on table public.kg_join_requests to authenticated;

create or replace function public.kg_request_join(p_code text, p_display_name text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare uid uuid := (select auth.uid()); g public.kg_groups; nm text := left(btrim(coalesce(p_display_name, '')), 40);
begin
  if uid is null then raise exception 'not authenticated'; end if;
  if char_length(nm) = 0 then nm := 'Amigo'; end if;
  select * into g from public.kg_groups where code = upper(btrim(coalesce(p_code, '')));
  if g.id is null or g.chat = 'dm' then raise exception 'no such group'; end if;
  if exists (select 1 from public.kg_members where group_id = g.id and user_id = uid) then raise exception 'already member'; end if;
  if (select count(*) from public.kg_join_requests where user_id = uid and created_at > now() - interval '1 hour') >= 10 then raise exception 'slow down'; end if;
  insert into public.kg_join_requests (group_id, user_id, display_name) values (g.id, uid, nm)
    on conflict (group_id, user_id) do update set status = 'pending', display_name = excluded.display_name, created_at = now()
    where public.kg_join_requests.status <> 'pending';
  perform public.kg_sys(g.id, 'join_request', jsonb_build_object('name', nm));
  return jsonb_build_object('group_id', g.id, 'name', g.name, 'icon', g.icon);
end $$;

create or replace function public.kg_join_requests_of(p_group uuid) returns jsonb
language sql stable security definer set search_path = '' as $$
  select case when public.kg_is_mod(p_group) then coalesce((select jsonb_agg(jsonb_build_object('user_id', r.user_id, 'display_name', r.display_name,
      'nametag', u.nametag, 'avatar', u.avatar, 'created_at', r.created_at) order by r.created_at)
    from public.kg_join_requests r left join public.kg_users u on u.user_id = r.user_id
    where r.group_id = p_group and r.status = 'pending'), '[]'::jsonb) else '[]'::jsonb end
$$;

create or replace function public.kg_join_respond(p_group uuid, p_user uuid, p_accept boolean) returns void
language plpgsql security definer set search_path = '' as $$
declare r public.kg_join_requests; lim int := public.kg_max_members();
begin
  if not public.kg_is_mod(p_group) then raise exception 'not allowed'; end if;
  select * into r from public.kg_join_requests where group_id = p_group and user_id = p_user and status = 'pending' for update;
  if r.user_id is null then return; end if;
  if p_accept then
    if lim is not null and (select count(*) from public.kg_members where group_id = p_group) >= lim then raise exception 'group full'; end if;
    insert into public.kg_members (group_id, user_id, display_name, role, perms) values (p_group, p_user, r.display_name, 'novato', public.kg_role_perms('novato'))
      on conflict (group_id, user_id) do nothing;
    perform public.kg_sys(p_group, 'joined', jsonb_build_object('name', r.display_name));
  end if;
  update public.kg_join_requests set status = case when p_accept then 'accepted' else 'declined' end where group_id = p_group and user_id = p_user;
end $$;

-- ---------- puntos entre miembros (0-10 con nota) ----------
create table if not exists public.kg_rank_rates (
  group_id uuid not null references public.kg_groups (id) on delete cascade,
  period text not null,
  from_user uuid not null,
  to_user uuid not null,
  points int not null check (points between 0 and 10),
  note text not null default '' check (char_length(note) <= 200),
  created_at timestamptz not null default now(),
  primary key (group_id, period, from_user, to_user),
  check (from_user <> to_user)
);
alter table public.kg_rank_rates enable row level security;
-- Cada uno ve lo que ha dado; el resto solo cuando el periodo se ha publicado
create policy kg_rank_rates_read on public.kg_rank_rates for select to authenticated using (
  (select auth.uid()) = from_user
  or (public.kg_is_member(group_id) and exists (select 1 from public.kg_rank_periods p where p.group_id = kg_rank_rates.group_id and p.period = kg_rank_rates.period)));
revoke all on table public.kg_rank_rates from anon, authenticated;
grant select on table public.kg_rank_rates to authenticated;

create or replace function public.kg_rank_rate(p_group uuid, p_to uuid, p_points int, p_note text) returns void
language plpgsql security definer set search_path = '' as $$
declare uid uuid := (select auth.uid()); g public.kg_groups; per record; n int;
begin
  select * into g from public.kg_groups where id = p_group;
  if g.id is null or not g.ranking_on or g.ranking_freq = 'MAX' then raise exception 'ranking off'; end if;
  if not public.kg_is_member(p_group) or not exists (select 1 from public.kg_members where group_id = p_group and user_id = p_to) then raise exception 'not a member'; end if;
  if p_to = uid then raise exception 'self'; end if;
  if p_points is null or p_points not between 0 and 10 then raise exception 'bad points'; end if;
  select * into per from public.kg_period_of(g.ranking_freq, public.kg_today());
  insert into public.kg_rank_rates (group_id, period, from_user, to_user, points, note)
    values (p_group, per.pkey, uid, p_to, p_points, left(btrim(coalesce(p_note, '')), 200))
    on conflict do nothing;
  get diagnostics n = row_count;
  if n = 0 then raise exception 'already rated'; end if;
end $$;

-- ---------- fotos, audios y stickers ----------
alter table public.kg_messages drop constraint if exists kg_messages_kind_check;
alter table public.kg_messages add constraint kg_messages_kind_check check (kind in ('text', 'invite', 'share', 'system', 'photo', 'audio', 'sticker'));

create table if not exists public.kg_media (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.kg_groups (id) on delete cascade,
  user_id uuid not null,
  kind text not null check (kind in ('photo', 'audio')),
  mime text not null check (char_length(mime) <= 60),
  data text not null default '' check (char_length(data) <= 3000000),
  viewed uuid[] not null default '{}',
  created_at timestamptz not null default now()
);
create index if not exists kg_media_group_idx on public.kg_media (group_id, created_at);
alter table public.kg_media enable row level security; -- sin políticas: solo se lee con kg_media_get
revoke all on table public.kg_media from anon, authenticated;

create or replace function public.kg_post_media(p_group uuid, p_kind text, p_mime text, p_data text, p_meta jsonb default '{}') returns bigint
language plpgsql security definer set search_path = '' as $$
declare uid uuid := (select auth.uid()); mid bigint; med uuid; meta jsonb := coalesce(p_meta, '{}');
begin
  if uid is null or not public.kg_is_member(p_group) then raise exception 'not a member'; end if;
  if p_kind not in ('photo', 'audio', 'sticker') then raise exception 'bad kind'; end if;
  if coalesce(p_data, '') !~ '^[A-Za-z0-9+/=]+$' then raise exception 'bad data'; end if;
  if p_mime !~ '^(image/(jpeg|png|webp|gif)|audio/(webm|ogg|mp4|mpeg|aac))(;.*)?$' then raise exception 'bad mime'; end if;
  if (select count(*) from public.kg_messages where group_id = p_group and user_id = uid and created_at > now() - interval '1 minute') >= 30 then raise exception 'slow down'; end if;
  if p_kind = 'sticker' then
    if char_length(p_data) > 16000 or p_mime !~ '^image/' then raise exception 'too big'; end if;
    insert into public.kg_messages (group_id, user_id, kind, body, payload)
      values (p_group, uid, 'sticker', '', jsonb_build_object('mime', p_mime, 'data', p_data)) returning id into mid;
    return mid;
  end if;
  if char_length(p_data) > 3000000 then raise exception 'too big'; end if;
  if (p_kind = 'photo' and p_mime !~ '^image/') or (p_kind = 'audio' and p_mime !~ '^audio/') then raise exception 'bad mime'; end if;
  insert into public.kg_media (group_id, user_id, kind, mime, data) values (p_group, uid, p_kind, p_mime, p_data) returning id into med;
  insert into public.kg_messages (group_id, user_id, kind, body, payload)
    values (p_group, uid, p_kind, '', jsonb_build_object('media', med, 'mime', p_mime,
      'dur', case when jsonb_typeof(meta -> 'dur') = 'number' then meta -> 'dur' else null end)) returning id into mid;
  return mid;
end $$;

-- Las fotos se ven UNA sola vez por persona (quien la envía no puede volver a abrirla).
-- Cuando todos la han visto, se borra su contenido. Los audios se pueden escuchar las veces que se quiera.
create or replace function public.kg_media_get(p_id uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare uid uuid := (select auth.uid()); m public.kg_media; d text; others int;
begin
  select * into m from public.kg_media where id = p_id for update;
  if m.id is null or not public.kg_is_member(m.group_id) then raise exception 'not found'; end if;
  if m.kind = 'audio' then return jsonb_build_object('mime', m.mime, 'data', m.data); end if;
  if m.user_id = uid then raise exception 'sender'; end if;
  if uid = any (m.viewed) or m.data = '' then raise exception 'viewed'; end if;
  d := m.data;
  update public.kg_media set viewed = array_append(viewed, uid) where id = p_id;
  select count(*) into others from public.kg_members where group_id = m.group_id and user_id <> m.user_id and not (user_id = any (array_append(m.viewed, uid)));
  if others = 0 then update public.kg_media set data = '' where id = p_id; end if;
  return jsonb_build_object('mime', m.mime, 'data', d);
end $$;

-- Qué fotos he abierto ya (para pintarlas como «Abierta»)
create or replace function public.kg_media_seen(p_group uuid) returns jsonb
language sql stable security definer set search_path = '' as $$
  select coalesce(jsonb_agg(id), '[]'::jsonb) from public.kg_media
  where group_id = p_group and kind = 'photo' and public.kg_is_member(p_group)
    and ((select auth.uid()) = any (viewed) or data = '' or user_id = (select auth.uid()))
$$;

create or replace function public.kg_delete_message(p_id bigint) returns void
language plpgsql security definer set search_path = '' as $$
declare m public.kg_messages;
begin
  select * into m from public.kg_messages where id = p_id;
  if m.id is null then return; end if;
  if m.user_id is distinct from (select auth.uid()) and not public.kg_has_perm(m.group_id, 'moderate') then raise exception 'not allowed'; end if;
  if m.payload ? 'media' then update public.kg_media set data = '' where id = (m.payload ->> 'media')::uuid; end if;
  update public.kg_messages set deleted = true, body = '', payload = '{}' where id = p_id;
end $$;

-- ---------- kg_settle: los puntos recibidos de los compañeros se suman al cerrar el periodo ----------
create or replace function public.kg_settle(p_group uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare c public.kg_challenges; y int; n int; v jsonb; tot int; done_n int; r numeric; g public.kg_groups;
  td date := public.kg_today(); ps date; pe date; pkey text; guard int := 0; mem uuid[];
begin
  if not public.kg_is_member(p_group) then raise exception 'not a member'; end if;
  -- 1) votación
  select * into c from public.kg_challenges where group_id = p_group and status = 'voting' for update;
  if c.id is not null then
    select count(*) filter (where vote), count(*) filter (where not vote) into y, n
      from public.kg_votes where challenge_id = c.id and user_id = any (c.voters);
    if now() >= c.vote_ends_at or y + n >= cardinality(c.voters) then
      v := public.kg_vote_result(cardinality(c.voters), y, n);
      if (v ->> 'approved')::boolean then
        select array_agg(user_id order by joined_at) into mem from public.kg_members where group_id = p_group;
        update public.kg_challenges set status = 'live', yes = y, no = n, blank = (v ->> 'blank')::int, participants = mem,
          starts_on = td, ends_on = td + c.days - 1 where id = c.id;
        perform public.kg_sys(p_group, 'vote_yes', jsonb_build_object('challenge', c.id, 'title', c.title, 'yes', v -> 'yes_total', 'no', v -> 'no_total', 'blank', v -> 'blank'));
      else
        update public.kg_challenges set status = 'rejected', yes = y, no = n, blank = (v ->> 'blank')::int, settled_at = now() where id = c.id;
        perform public.kg_sys(p_group, 'vote_no', jsonb_build_object('challenge', c.id, 'title', c.title, 'yes', v -> 'yes_total', 'no', v -> 'no_total', 'blank', v -> 'blank'));
      end if;
    end if;
  end if;
  -- 2) reto en vivo terminado (se espera hasta el mediodía siguiente para que todos sincronicen el último día)
  select * into c from public.kg_challenges where group_id = p_group and status = 'live' for update;
  if c.id is not null and now() at time zone 'Europe/Madrid' >= (c.ends_on + 1) + time '12:00' then
    select * into g from public.kg_groups where id = p_group;
    if g.kind = 'habit' then
      tot := cardinality(c.participants) * c.days;
      select count(*) into done_n from public.kg_progress
        where group_id = p_group and user_id = any (c.participants) and day between c.starts_on and c.ends_on and done;
      r := case when tot > 0 then round(least(1, done_n::numeric / tot) * 100, 1) else 0 end;
    else
      select coalesce(round(avg(coalesce(last_v, 0)), 1), 0) into r from (
        select (select p.value from public.kg_progress p where p.group_id = p_group and p.user_id = u and p.day <= c.ends_on order by p.day desc limit 1) as last_v
        from unnest(c.participants) as u) s;
    end if;
    update public.kg_challenges set status = case when r >= c.target then 'won' else 'lost' end, rate = r, settled_at = now() where id = c.id;
    perform public.kg_sys(p_group, case when r >= c.target then 'won' else 'lost' end, jsonb_build_object('challenge', c.id, 'title', c.title, 'rate', r, 'target', c.target));
  end if;
  -- 3) ranking: premios de periodos completos ya terminados (actividad + puntos de los compañeros)
  select * into g from public.kg_groups where id = p_group;
  if g.ranking_on and g.ranking_freq <> 'MAX' and g.ranking_since is not null then
    ps := case g.ranking_freq when '1W' then date_trunc('week', g.ranking_since)::date when '1M' then date_trunc('month', g.ranking_since)::date else date_trunc('year', g.ranking_since)::date end;
    if ps < g.ranking_since then ps := case g.ranking_freq when '1W' then ps + 7 when '1M' then (ps + interval '1 month')::date else (ps + interval '1 year')::date end; end if;
    loop
      pe := case g.ranking_freq when '1W' then ps + 6 when '1M' then (ps + interval '1 month')::date - 1 else (ps + interval '1 year')::date - 1 end;
      exit when pe >= td or guard > 120;
      guard := guard + 1;
      pkey := case g.ranking_freq when '1W' then 'W' || to_char(ps, 'YYYY-MM-DD') when '1M' then 'M' || to_char(ps, 'YYYY-MM') else 'Y' || to_char(ps, 'YYYY') end;
      if not exists (select 1 from public.kg_rank_periods where group_id = p_group and period = pkey) then
        insert into public.kg_rank_periods (group_id, period, starts_on, ends_on) values (p_group, pkey, ps, pe);
        insert into public.kg_rep (group_id, group_name, user_id, period, place, points)
          select p_group, g.name, s.user_id, pkey, s.place,
            (array[10, 6, 3])[s.place] * case g.ranking_freq when '1W' then 1 when '1M' then 3 else 12 end
          from (
            select x.user_id, rank() over (order by x.score desc)::int as place
            from (select m.user_id, public.kg_score(p_group, g.kind, m.user_id, ps, pe)
                    + coalesce((select sum(rr.points) from public.kg_rank_rates rr where rr.group_id = p_group and rr.period = pkey and rr.to_user = m.user_id), 0) as score
                  from public.kg_members m where m.group_id = p_group and (m.role = any (g.rank_roles) or m.user_id = any (g.rank_users))) x
            where x.score > 0) s
          where s.place <= 3;
        perform public.kg_sys(p_group, 'rank_awarded', jsonb_build_object('period', pkey, 'freq', g.ranking_freq,
          'rates', (select count(*) from public.kg_rank_rates rr where rr.group_id = p_group and rr.period = pkey)));
      end if;
      ps := pe + 1;
    end loop;
  end if;
end $$;

-- ---------- kg_group_info: + quién he puntuado este periodo y solicitudes pendientes ----------
create or replace function public.kg_group_info(p_group uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare g public.kg_groups; c public.kg_challenges; act jsonb := null; myv boolean; y int; n int; td date := public.kg_today(); pr text; pstart date; pend date; board jsonb;
  per record; rated jsonb := '[]'::jsonb;
begin
  perform public.kg_settle(p_group);
  select * into g from public.kg_groups where id = p_group;
  select * into c from public.kg_challenges where group_id = p_group and status in ('voting', 'live');
  if c.id is not null then
    select vote into myv from public.kg_votes where challenge_id = c.id and user_id = (select auth.uid());
    select count(*) filter (where vote), count(*) filter (where not vote) into y, n from public.kg_votes where challenge_id = c.id;
    act := to_jsonb(c) || jsonb_build_object('my_vote', myv, 'votes_yes', y, 'votes_no', n,
      'progress', case when c.status = 'live' and g.kind = 'habit' then
        (select count(*) from public.kg_progress p where p.group_id = p_group and p.user_id = any (c.participants) and p.day between c.starts_on and least(c.ends_on, td) and p.done) else null end);
  end if;
  if g.ranking_on then
    if g.ranking_freq = 'MAX' then pstart := coalesce(g.ranking_since, td); pend := td; pr := 'MAX';
    else
      select * into per from public.kg_period_of(g.ranking_freq, td);
      pstart := per.ps; pend := per.pe; pr := per.pkey;
      select coalesce(jsonb_agg(to_user), '[]'::jsonb) into rated from public.kg_rank_rates
        where group_id = p_group and period = per.pkey and from_user = (select auth.uid());
    end if;
    select coalesce(jsonb_agg(x order by (x ->> 'score')::numeric desc), '[]'::jsonb) into board from (
      select jsonb_build_object('user_id', m.user_id, 'score', public.kg_score(p_group, g.kind, m.user_id, pstart, pend)) as x
      from public.kg_members m where m.group_id = p_group and (m.role = any (g.rank_roles) or m.user_id = any (g.rank_users))) s;
  end if;
  return jsonb_build_object(
    'group', to_jsonb(g) - 'owner',
    'max_members', public.kg_max_members(),
    'members', public.kg_member_rows(p_group),
    'challenges', (select coalesce(jsonb_agg(to_jsonb(h) - 'voters' - 'participants' order by h.created_at desc), '[]'::jsonb)
      from (select * from public.kg_challenges where group_id = p_group order by created_at desc limit 30) h),
    'launched', (select count(*) from public.kg_challenges where group_id = p_group and status in ('live', 'won', 'lost')),
    'wins', (select count(*) from public.kg_challenges where group_id = p_group and status = 'won'),
    'losses', (select count(*) from public.kg_challenges where group_id = p_group and status = 'lost'),
    'active', act,
    'board', board, 'board_from', pstart, 'board_to', pend, 'period', pr, 'my_rates', rated,
    'requests', public.kg_join_requests_of(p_group),
    'today', td);
end $$;

-- ---------- kg_my_groups: + foto del grupo y solicitudes pendientes ----------
create or replace function public.kg_my_groups() returns jsonb
language sql stable security definer set search_path = '' as $$
  select coalesce(jsonb_agg(jsonb_build_object('id', g.id, 'code', g.code, 'name', g.name, 'icon', g.icon, 'kind', g.kind, 'spec', g.spec,
    'avatar', g.avatar,
    'ranking_on', g.ranking_on, 'ranking_freq', g.ranking_freq, 'my_role', me.role,
    'members', public.kg_member_rows(g.id),
    'wins', (select count(*) from public.kg_challenges c where c.group_id = g.id and c.status = 'won'),
    'losses', (select count(*) from public.kg_challenges c where c.group_id = g.id and c.status = 'lost'),
    'live', (select c.status from public.kg_challenges c where c.group_id = g.id and c.status in ('voting', 'live')),
    'last_msg', (select max(id) from public.kg_messages ms where ms.group_id = g.id),
    'chat', g.chat,
    'reqs', case when me.role in ('lider', 'colider') then (select count(*) from public.kg_join_requests jr where jr.group_id = g.id and jr.status = 'pending') else 0 end,
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

-- ---------- permisos de ejecución (solo usuarios con sesión) ----------
do $$
declare f text;
begin
  foreach f in array array[
    'kg_period_of(text, date)', 'kg_is_mod(uuid)', 'kg_set_spec(uuid, jsonb)', 'kg_chat_upgrade(uuid, text, jsonb, text)',
    'kg_set_group_avatar(uuid, text)', 'kg_request_join(text, text)', 'kg_join_requests_of(uuid)', 'kg_join_respond(uuid, uuid, boolean)',
    'kg_rank_rate(uuid, uuid, integer, text)', 'kg_post_media(uuid, text, text, text, jsonb)', 'kg_media_get(uuid)', 'kg_media_seen(uuid)',
    'kg_delete_message(bigint)', 'kg_settle(uuid)', 'kg_group_info(uuid)', 'kg_my_groups()']
  loop
    execute format('revoke execute on function public.%s from public, anon', f);
    execute format('grant execute on function public.%s to authenticated', f);
  end loop;
  revoke execute on function public.kg_is_mod(uuid) from authenticated;
  revoke execute on function public.kg_join_requests_of(uuid) from authenticated;
end $$;
