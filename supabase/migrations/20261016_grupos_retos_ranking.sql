-- KeepGoing v1.11 · Fases 4, 5 y 6: Grupos (perfil, roles con permisos, chat), retos en vivo con votación y W-L,
-- invitaciones desde el chat, ranking y reputación.
-- Todo lo que cambia datos compartidos pasa por funciones SECURITY DEFINER que comprueban rol y permisos.
-- Ningún dato de la Libreta de Gastos se toca ni se expone aquí.

-- ---------- configuración y utilidades ----------
insert into private.kg_config (key, value) values ('max_members', '50') on conflict (key) do nothing;

-- Límite BETA de miembros (null o vacío = sin límite)
create or replace function public.kg_max_members() returns int
language sql stable security definer set search_path = '' as
$$ select nullif(btrim(value), '')::int from private.kg_config where key = 'max_members' $$;

create or replace function public.kg_today() returns date
language sql stable set search_path = '' as
$$ select (now() at time zone 'Europe/Madrid')::date $$;

-- ---------- @nametag único por usuario ----------
create table if not exists public.kg_users (
  user_id uuid primary key references auth.users (id) on delete cascade,
  nametag text unique check (nametag ~ '^[a-z0-9_]{3,20}$'),
  display_name text check (char_length(display_name) between 1 and 40),
  updated_at timestamptz not null default now()
);
alter table public.kg_users enable row level security;
create policy kg_users_read on public.kg_users for select to authenticated using (true);
create policy kg_users_insert_own on public.kg_users for insert to authenticated with check ((select auth.uid()) = user_id);
create policy kg_users_update_own on public.kg_users for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

-- ---------- roles con permisos delegados ----------
create or replace function public.kg_role_perms(p_role text) returns text[]
language sql immutable set search_path = '' as $$
  select case p_role
    when 'lider' then array['invite', 'launch', 'share', 'moderate', 'kick']
    when 'colider' then array['invite', 'launch', 'share', 'moderate', 'kick']
    when 'experto' then array['launch', 'share']
    when 'veterano' then array['invite', 'share']
    else array[]::text[] end
$$;

alter table public.kg_members add column if not exists perms text[] not null default '{}';
alter table public.kg_members add constraint kg_members_perms_chk check (perms <@ array['invite', 'launch', 'share', 'moderate', 'kick']);
-- Los roles antiguos (colíder, experto, veterano, novato) se convierten en sus permisos
update public.kg_members set perms = public.kg_role_perms(role) where perms = '{}';

create or replace function public.kg_has_perm(gid uuid, p_perm text) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.kg_members m where m.group_id = gid and m.user_id = (select auth.uid())
    and (m.role = 'lider' or p_perm = any (m.perms)))
$$;

-- ---------- perfil del grupo y ranking ----------
alter table public.kg_groups
  add column if not exists code text unique default public.kg_new_code(),
  add column if not exists ranking_on boolean not null default false,
  add column if not exists ranking_freq text not null default '1W',
  add column if not exists ranking_since date,
  add column if not exists rank_roles text[] not null default array['lider', 'colider', 'experto', 'veterano', 'novato'],
  add column if not exists rank_users uuid[] not null default '{}';
alter table public.kg_groups add constraint kg_groups_freq_chk check (ranking_freq in ('1W', '1M', '1Y', 'MAX'));
update public.kg_groups set code = public.kg_new_code() where code is null;

alter policy kg_invites_leader_read on public.kg_invites using (public.kg_has_perm(group_id, 'invite'));
alter policy kg_invites_leader_read on public.kg_invites rename to kg_invites_perm_read;

-- ---------- chat ----------
create table if not exists public.kg_messages (
  id bigint generated always as identity primary key,
  group_id uuid not null references public.kg_groups (id) on delete cascade,
  user_id uuid references auth.users (id) on delete set null,
  kind text not null default 'text' check (kind in ('text', 'invite', 'share', 'system')),
  body text not null default '' check (char_length(body) <= 1000),
  payload jsonb not null default '{}' check (pg_column_size(payload) < 20000),
  created_at timestamptz not null default now()
);
alter table public.kg_messages add column if not exists deleted boolean not null default false;
create index if not exists kg_messages_group_idx on public.kg_messages (group_id, id);
alter table public.kg_messages enable row level security;
create policy kg_messages_member_read on public.kg_messages for select using (public.kg_is_member(group_id));

create or replace function public.kg_sys(p_group uuid, p_body text, p_payload jsonb default '{}') returns void
language sql security definer set search_path = '' as
$$ insert into public.kg_messages (group_id, user_id, kind, body, payload) values (p_group, null, 'system', left(p_body, 1000), coalesce(p_payload, '{}')) $$;

create or replace function public.kg_post(p_group uuid, p_kind text, p_body text, p_payload jsonb default '{}') returns bigint
language plpgsql security definer set search_path = '' as $$
declare uid uuid := (select auth.uid()); mid bigint;
begin
  if uid is null or not public.kg_is_member(p_group) then raise exception 'not a member'; end if;
  if p_kind not in ('text', 'share') then raise exception 'bad kind'; end if;
  if p_kind = 'share' and not public.kg_has_perm(p_group, 'share') then raise exception 'not allowed'; end if;
  if p_kind = 'text' and char_length(btrim(coalesce(p_body, ''))) = 0 then raise exception 'empty'; end if;
  if (select count(*) from public.kg_messages where group_id = p_group and user_id = uid and created_at > now() - interval '1 minute') >= 30 then raise exception 'slow down'; end if;
  insert into public.kg_messages (group_id, user_id, kind, body, payload)
    values (p_group, uid, p_kind, left(btrim(coalesce(p_body, '')), 1000), case when p_kind = 'share' then coalesce(p_payload, '{}') else '{}' end)
    returning id into mid;
  return mid;
end $$;

-- Invitación a OTRO grupo compartida en el chat (hace falta permiso para compartir aquí y para invitar allí)
create or replace function public.kg_post_invite(p_group uuid, p_target uuid) returns bigint
language plpgsql security definer set search_path = '' as $$
declare uid uuid := (select auth.uid()); c text; g public.kg_groups; mid bigint;
begin
  if not public.kg_has_perm(p_group, 'share') or not public.kg_has_perm(p_target, 'invite') then raise exception 'not allowed'; end if;
  if p_group = p_target then raise exception 'same group'; end if;
  select * into g from public.kg_groups where id = p_target;
  c := public.kg_new_code();
  insert into public.kg_invites (code, group_id, created_by) values (c, p_target, uid);
  insert into public.kg_messages (group_id, user_id, kind, body, payload)
    values (p_group, uid, 'invite', '', jsonb_build_object('code', c, 'name', g.name, 'icon', g.icon, 'kind', g.kind, 'group_code', g.code, 'spec_name', g.spec ->> 'name'))
    returning id into mid;
  return mid;
end $$;

create or replace function public.kg_delete_message(p_id bigint) returns void
language plpgsql security definer set search_path = '' as $$
declare m public.kg_messages;
begin
  select * into m from public.kg_messages where id = p_id;
  if m.id is null then return; end if;
  if m.user_id is distinct from (select auth.uid()) and not public.kg_has_perm(m.group_id, 'moderate') then raise exception 'not allowed'; end if;
  update public.kg_messages set deleted = true, body = '', payload = '{}' where id = p_id;
end $$;

-- ---------- retos en vivo y votaciones ----------
create table if not exists public.kg_challenges (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.kg_groups (id) on delete cascade,
  created_by uuid references auth.users (id) on delete set null,
  title text not null check (char_length(title) between 1 and 80),
  days int not null check (days between 1 and 90),
  target int not null check (target between 1 and 100),
  mode text not null check (mode in ('direct', 'vote')),
  status text not null check (status in ('voting', 'live', 'rejected', 'won', 'lost', 'cancelled')),
  voters uuid[] not null default '{}',
  participants uuid[] not null default '{}',
  vote_ends_at timestamptz,
  starts_on date,
  ends_on date,
  yes int, no int, blank int,
  rate numeric,
  created_at timestamptz not null default now(),
  settled_at timestamptz
);
create unique index if not exists kg_challenges_one_active on public.kg_challenges (group_id) where status in ('voting', 'live');
create index if not exists kg_challenges_group_idx on public.kg_challenges (group_id, created_at desc);
alter table public.kg_challenges enable row level security;
create policy kg_challenges_member_read on public.kg_challenges for select using (public.kg_is_member(group_id));

create table if not exists public.kg_votes (
  challenge_id uuid not null references public.kg_challenges (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  vote boolean not null,
  created_at timestamptz not null default now(),
  primary key (challenge_id, user_id)
);
alter table public.kg_votes enable row level security;
create policy kg_votes_own_read on public.kg_votes for select using ((select auth.uid()) = user_id);

-- Mayoría absoluta; los no votados son blancos repartidos NO, SÍ, NO… (empate = no aprobado). Mismo cálculo que KGGroups.voteResult
create or replace function public.kg_vote_result(p_members int, p_yes int, p_no int) returns jsonb
language sql immutable set search_path = '' as $$
  select jsonb_build_object('blank', b, 'yes_total', p_yes + floor(b / 2.0)::int, 'no_total', p_no + ceil(b / 2.0)::int,
    'approved', (p_yes + floor(b / 2.0)::int) > (p_no + ceil(b / 2.0)::int))
  from (select greatest(p_members - p_yes - p_no, 0) as b) s
$$;

create or replace function public.kg_launch_challenge(p_group uuid, p_title text, p_days int, p_target int, p_mode text, p_vote_minutes int default 1440) returns uuid
language plpgsql security definer set search_path = '' as $$
declare uid uuid := (select auth.uid()); cid uuid; mem uuid[]; who text;
begin
  if not public.kg_has_perm(p_group, 'launch') then raise exception 'not allowed'; end if;
  if p_mode not in ('direct', 'vote') then raise exception 'bad mode'; end if;
  perform public.kg_settle(p_group);
  if exists (select 1 from public.kg_challenges where group_id = p_group and status in ('voting', 'live')) then raise exception 'challenge already active'; end if;
  select array_agg(user_id order by joined_at) into mem from public.kg_members where group_id = p_group;
  select display_name into who from public.kg_members where group_id = p_group and user_id = uid;
  if p_mode = 'direct' then
    insert into public.kg_challenges (group_id, created_by, title, days, target, mode, status, participants, starts_on, ends_on)
      values (p_group, uid, btrim(p_title), p_days, p_target, 'direct', 'live', mem, public.kg_today(), public.kg_today() + p_days - 1) returning id into cid;
    perform public.kg_sys(p_group, 'live_start', jsonb_build_object('challenge', cid, 'title', btrim(p_title), 'by', who, 'days', p_days, 'target', p_target));
  else
    if p_vote_minutes is null or p_vote_minutes < 5 or p_vote_minutes > 10080 then raise exception 'bad vote time'; end if;
    insert into public.kg_challenges (group_id, created_by, title, days, target, mode, status, voters, vote_ends_at)
      values (p_group, uid, btrim(p_title), p_days, p_target, 'vote', 'voting', mem, now() + make_interval(mins => p_vote_minutes)) returning id into cid;
    perform public.kg_sys(p_group, 'vote_start', jsonb_build_object('challenge', cid, 'title', btrim(p_title), 'by', who, 'ends', now() + make_interval(mins => p_vote_minutes)));
  end if;
  return cid;
end $$;

create or replace function public.kg_vote(p_challenge uuid, p_vote boolean) returns void
language plpgsql security definer set search_path = '' as $$
declare uid uuid := (select auth.uid()); c public.kg_challenges;
begin
  select * into c from public.kg_challenges where id = p_challenge;
  if c.id is null or c.status <> 'voting' or now() > c.vote_ends_at then raise exception 'voting closed'; end if;
  if not (uid = any (c.voters)) or not public.kg_is_member(c.group_id) then raise exception 'not a voter'; end if;
  insert into public.kg_votes (challenge_id, user_id, vote) values (p_challenge, uid, p_vote)
    on conflict (challenge_id, user_id) do update set vote = excluded.vote, created_at = now();
  perform public.kg_settle(c.group_id);
end $$;

create or replace function public.kg_cancel_challenge(p_challenge uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare c public.kg_challenges;
begin
  select * into c from public.kg_challenges where id = p_challenge;
  if c.id is null or c.status not in ('voting', 'live') then return; end if;
  if public.kg_my_role(c.group_id) <> 'lider' and c.created_by is distinct from (select auth.uid()) then raise exception 'not allowed'; end if;
  update public.kg_challenges set status = 'cancelled', settled_at = now() where id = p_challenge;
  perform public.kg_sys(c.group_id, 'cancelled', jsonb_build_object('challenge', c.id, 'title', c.title));
end $$;

-- Cierra votaciones vencidas (o con todos los votos), resuelve retos terminados y reparte la reputación del ranking.
-- Se llama al abrir un grupo, al votar y al lanzar; así no hace falta ningún proceso en segundo plano.
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
  -- 3) ranking: premios de periodos completos ya terminados
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
            from (select m.user_id, public.kg_score(p_group, g.kind, m.user_id, ps, pe) as score
                  from public.kg_members m where m.group_id = p_group and (m.role = any (g.rank_roles) or m.user_id = any (g.rank_users))) x
            where x.score > 0) s
          where s.place <= 3;
        perform public.kg_sys(p_group, 'rank_awarded', jsonb_build_object('period', pkey, 'freq', g.ranking_freq));
      end if;
      ps := pe + 1;
    end loop;
  end if;
end $$;

-- ---------- ranking y reputación ----------
create table if not exists public.kg_rank_periods (
  group_id uuid not null references public.kg_groups (id) on delete cascade,
  period text not null,
  starts_on date not null,
  ends_on date not null,
  primary key (group_id, period)
);
alter table public.kg_rank_periods enable row level security;
create policy kg_rank_periods_member_read on public.kg_rank_periods for select using (public.kg_is_member(group_id));

-- La reputación se conserva aunque el grupo desaparezca (sin clave foránea al grupo)
create table if not exists public.kg_rep (
  group_id uuid not null,
  group_name text not null default '',
  user_id uuid not null references auth.users (id) on delete cascade,
  period text not null,
  place int not null,
  points int not null check (points >= 0),
  created_at timestamptz not null default now(),
  primary key (group_id, period, user_id)
);
alter table public.kg_rep enable row level security;
create policy kg_rep_read on public.kg_rep for select using ((select auth.uid()) = user_id or public.kg_is_member(group_id));

-- Puntuación de un miembro en un periodo: días cumplidos (hábito) o % de avance ganado (proyecto)
create or replace function public.kg_score(p_group uuid, p_kind text, p_user uuid, p_from date, p_to date) returns numeric
language sql stable security definer set search_path = '' as $$
  select case when p_kind = 'habit' then
    (select count(*)::numeric from public.kg_progress where group_id = p_group and user_id = p_user and day between p_from and p_to and done)
  else
    greatest(0, coalesce((select max(value) from public.kg_progress where group_id = p_group and user_id = p_user and day between p_from and p_to), 0)
      - coalesce((select max(value) from public.kg_progress where group_id = p_group and user_id = p_user and day < p_from), 0))
  end
$$;

create or replace function public.kg_set_ranking(p_group uuid, p_on boolean, p_freq text, p_roles text[], p_users uuid[]) returns void
language plpgsql security definer set search_path = '' as $$
declare g public.kg_groups;
begin
  if public.kg_my_role(p_group) <> 'lider' then raise exception 'not allowed'; end if;
  if p_freq not in ('1W', '1M', '1Y', 'MAX') then raise exception 'bad freq'; end if;
  select * into g from public.kg_groups where id = p_group;
  update public.kg_groups set ranking_on = p_on, ranking_freq = p_freq,
    ranking_since = case when p_on and (not g.ranking_on or g.ranking_freq <> p_freq or g.ranking_since is null) then public.kg_today() else ranking_since end,
    rank_roles = coalesce((select array_agg(r) from unnest(p_roles) r where r in ('lider', 'colider', 'experto', 'veterano', 'novato')), '{}'),
    rank_users = coalesce((select array_agg(u) from unnest(p_users) u where exists (select 1 from public.kg_members m where m.group_id = p_group and m.user_id = u)), '{}')
  where id = p_group;
end $$;

create or replace function public.kg_my_rep() returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object('total', coalesce(sum(points), 0), 'awards', count(*),
    'golds', count(*) filter (where place = 1))
  from public.kg_rep where user_id = (select auth.uid())
$$;

-- ---------- lectura agrupada para la app ----------
create or replace function public.kg_member_rows(p_group uuid) returns jsonb
language sql stable security definer set search_path = '' as $$
  select coalesce(jsonb_agg(jsonb_build_object('user_id', m.user_id, 'display_name', m.display_name, 'role', m.role, 'perms', m.perms,
    'joined_at', m.joined_at, 'nametag', u.nametag,
    'rep', (select coalesce(sum(r.points), 0) from public.kg_rep r where r.group_id = p_group and r.user_id = m.user_id),
    'rep_total', (select coalesce(sum(r.points), 0) from public.kg_rep r where r.user_id = m.user_id),
    'done_today', (select p.done from public.kg_progress p where p.group_id = p_group and p.user_id = m.user_id and p.day = public.kg_today()))
    order by m.joined_at), '[]'::jsonb)
  from public.kg_members m left join public.kg_users u on u.user_id = m.user_id where m.group_id = p_group
$$;

create or replace function public.kg_group_info(p_group uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare g public.kg_groups; c public.kg_challenges; act jsonb := null; myv boolean; y int; n int; td date := public.kg_today(); pr text; pstart date; pend date; board jsonb;
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
  -- clasificación del periodo actual (o acumulada en MAX)
  if g.ranking_on then
    if g.ranking_freq = 'MAX' then pstart := coalesce(g.ranking_since, td); pend := td; pr := 'MAX';
    else
      pstart := case g.ranking_freq when '1W' then date_trunc('week', td)::date when '1M' then date_trunc('month', td)::date else date_trunc('year', td)::date end;
      pend := case g.ranking_freq when '1W' then pstart + 6 when '1M' then (pstart + interval '1 month')::date - 1 else (pstart + interval '1 year')::date - 1 end;
      pr := g.ranking_freq;
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
    'board', board, 'board_from', pstart, 'board_to', pend,
    'today', td);
end $$;

-- Todos mis grupos con sus personas (para la pestaña Grupos)
create or replace function public.kg_my_groups() returns jsonb
language sql stable security definer set search_path = '' as $$
  select coalesce(jsonb_agg(jsonb_build_object('id', g.id, 'code', g.code, 'name', g.name, 'icon', g.icon, 'kind', g.kind, 'spec', g.spec,
    'ranking_on', g.ranking_on, 'ranking_freq', g.ranking_freq, 'my_role', me.role,
    'members', public.kg_member_rows(g.id),
    'wins', (select count(*) from public.kg_challenges c where c.group_id = g.id and c.status = 'won'),
    'losses', (select count(*) from public.kg_challenges c where c.group_id = g.id and c.status = 'lost'),
    'live', (select c.status from public.kg_challenges c where c.group_id = g.id and c.status in ('voting', 'live')),
    'last_msg', (select max(id) from public.kg_messages ms where ms.group_id = g.id)) order by me.joined_at), '[]'::jsonb)
  from public.kg_members me join public.kg_groups g on g.id = me.group_id where me.user_id = (select auth.uid())
$$;

-- ---------- funciones existentes adaptadas ----------
create or replace function public.kg_create_group(p_name text, p_icon text, p_kind text, p_spec jsonb, p_display_name text, p_local_id text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare uid uuid := (select auth.uid()); gid uuid; c text;
begin
  if uid is null then raise exception 'not authenticated'; end if;
  insert into public.kg_groups (owner, name, icon, kind, spec) values (uid, p_name, coalesce(p_icon, '🎯'), p_kind, coalesce(p_spec, '{}'::jsonb)) returning id into gid;
  insert into public.kg_members (group_id, user_id, display_name, role, local_id, perms) values (gid, uid, p_display_name, 'lider', p_local_id, public.kg_role_perms('lider'));
  c := public.kg_new_code();
  insert into public.kg_invites (code, group_id, created_by) values (c, gid, uid);
  return jsonb_build_object('group_id', gid, 'code', c);
end $$;

create or replace function public.kg_join_group(p_code text, p_display_name text, p_local_id text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare uid uuid := (select auth.uid()); gid uuid; g jsonb; lim int := public.kg_max_members(); already boolean;
begin
  if uid is null then raise exception 'not authenticated'; end if;
  select i.group_id into gid from public.kg_invites i where i.code = upper(p_code) and i.expires_at > now();
  if gid is null then raise exception 'invalid invite'; end if;
  select exists (select 1 from public.kg_members where group_id = gid and user_id = uid) into already;
  if not already and lim is not null and (select count(*) from public.kg_members where group_id = gid) >= lim then raise exception 'group full'; end if;
  insert into public.kg_members (group_id, user_id, display_name, role, local_id, perms) values (gid, uid, p_display_name, 'novato', p_local_id, public.kg_role_perms('novato'))
    on conflict (group_id, user_id) do update set local_id = excluded.local_id, display_name = excluded.display_name;
  if not already then perform public.kg_sys(gid, 'joined', jsonb_build_object('name', p_display_name)); end if;
  select jsonb_build_object('group_id', id, 'name', name, 'icon', icon, 'kind', kind, 'spec', spec) into g from public.kg_groups where id = gid;
  return g;
end $$;

create or replace function public.kg_peek_invite(p_code text) returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object('group_id', g.id, 'name', g.name, 'icon', g.icon, 'kind', g.kind, 'spec', g.spec, 'code', g.code,
    'members', (select count(*) from public.kg_members m where m.group_id = g.id), 'max_members', public.kg_max_members())
  from public.kg_invites i join public.kg_groups g on g.id = i.group_id
  where i.code = upper(p_code) and i.expires_at > now()
$$;

create or replace function public.kg_new_invite(p_group uuid) returns text
language plpgsql security definer set search_path = '' as $$
declare c text;
begin
  if not public.kg_has_perm(p_group, 'invite') then raise exception 'not allowed'; end if;
  c := public.kg_new_code();
  insert into public.kg_invites (code, group_id, created_by) values (c, p_group, (select auth.uid()));
  return c;
end $$;

-- kg_leave_group: se mantiene la función existente (salir, y el líder puede sacar a alguien).

-- Solo el líder cambia roles; al cambiar de rol se aplican los permisos de ese rol
create or replace function public.kg_set_role(p_group uuid, p_user uuid, p_role text) returns void
language plpgsql security definer set search_path = '' as $$
declare me uuid := (select auth.uid()); target text;
begin
  if p_role not in ('lider', 'colider', 'experto', 'veterano', 'novato') then raise exception 'bad role'; end if;
  if public.kg_my_role(p_group) <> 'lider' then raise exception 'not allowed'; end if;
  select role into target from public.kg_members where group_id = p_group and user_id = p_user;
  if target is null then raise exception 'not a member'; end if;
  if p_user = me then raise exception 'pass leadership to someone else'; end if;
  if p_role = 'lider' then
    update public.kg_members set role = 'colider', perms = public.kg_role_perms('colider') where group_id = p_group and user_id = me;
    update public.kg_groups set owner = p_user where id = p_group;
  end if;
  update public.kg_members set role = p_role, perms = public.kg_role_perms(p_role) where group_id = p_group and user_id = p_user;
end $$;

-- El líder otorga y revoca permisos concretos
create or replace function public.kg_set_perms(p_group uuid, p_user uuid, p_perms text[]) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if public.kg_my_role(p_group) <> 'lider' then raise exception 'not allowed'; end if;
  if p_user = (select auth.uid()) then raise exception 'leader has all permissions'; end if;
  update public.kg_members set perms = coalesce((select array_agg(distinct p) from unnest(p_perms) p where p in ('invite', 'launch', 'share', 'moderate', 'kick')), '{}')
    where group_id = p_group and user_id = p_user and role <> 'lider';
end $$;

-- ---------- permisos de ejecución (solo usuarios con sesión) ----------
do $$
declare f text;
begin
  foreach f in array array[
    'kg_max_members()', 'kg_today()', 'kg_role_perms(text)', 'kg_has_perm(uuid, text)', 'kg_sys(uuid, text, jsonb)',
    'kg_post(uuid, text, text, jsonb)', 'kg_post_invite(uuid, uuid)', 'kg_delete_message(bigint)', 'kg_vote_result(integer, integer, integer)',
    'kg_launch_challenge(uuid, text, integer, integer, text, integer)', 'kg_vote(uuid, boolean)', 'kg_cancel_challenge(uuid)', 'kg_settle(uuid)',
    'kg_score(uuid, text, uuid, date, date)', 'kg_set_ranking(uuid, boolean, text, text[], uuid[])', 'kg_my_rep()', 'kg_member_rows(uuid)',
    'kg_group_info(uuid)', 'kg_my_groups()', 'kg_create_group(text, text, text, jsonb, text, text)', 'kg_join_group(text, text, text)',
    'kg_peek_invite(text)', 'kg_new_invite(uuid)', 'kg_set_role(uuid, uuid, text)', 'kg_set_perms(uuid, uuid, text[])']
  loop
    execute format('revoke execute on function public.%s from public, anon', f);
    execute format('grant execute on function public.%s to authenticated', f);
  end loop;
  -- funciones internas: no se llaman desde la app
  revoke execute on function public.kg_sys(uuid, text, jsonb) from authenticated;
  revoke execute on function public.kg_score(uuid, text, uuid, date, date) from authenticated;
  revoke execute on function public.kg_member_rows(uuid) from authenticated;
end $$;
