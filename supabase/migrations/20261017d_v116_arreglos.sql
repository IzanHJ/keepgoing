-- KeepGoing v1.16: arreglos encontrados en la revisión

-- Solicitudes para unirse: el aviso al grupo solo sale cuando la solicitud es nueva (antes se podía repetir sin límite)
create or replace function public.kg_request_join(p_code text, p_display_name text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare uid uuid := (select auth.uid()); g public.kg_groups; nm text := left(btrim(coalesce(p_display_name, '')), 40); n int;
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
  get diagnostics n = row_count;
  if n > 0 then perform public.kg_sys(g.id, 'join_request', jsonb_build_object('name', nm)); end if;
  return jsonb_build_object('group_id', g.id, 'name', g.name, 'icon', g.icon);
end $$;

-- Aceptar a alguien que ya había entrado con un enlace no repite el aviso de «se ha unido»
create or replace function public.kg_join_respond(p_group uuid, p_user uuid, p_accept boolean) returns void
language plpgsql security definer set search_path = '' as $$
declare r public.kg_join_requests; lim int := public.kg_max_members(); n int;
begin
  if not public.kg_is_mod(p_group) then raise exception 'not allowed'; end if;
  select * into r from public.kg_join_requests where group_id = p_group and user_id = p_user and status = 'pending' for update;
  if r.user_id is null then return; end if;
  if p_accept and not exists (select 1 from public.kg_members where group_id = p_group and user_id = p_user) then
    if lim is not null and (select count(*) from public.kg_members where group_id = p_group) >= lim then raise exception 'group full'; end if;
    insert into public.kg_members (group_id, user_id, display_name, role, perms) values (p_group, p_user, r.display_name, 'novato', public.kg_role_perms('novato'))
      on conflict (group_id, user_id) do nothing;
    get diagnostics n = row_count;
    if n > 0 then perform public.kg_sys(p_group, 'joined', jsonb_build_object('name', r.display_name)); end if;
  end if;
  update public.kg_join_requests set status = case when p_accept then 'accepted' else 'declined' end where group_id = p_group and user_id = p_user;
end $$;

-- En un chat entre dos amigos nadie manda sobre el otro: no se cambian roles ni permisos
create or replace function public.kg_set_role(p_group uuid, p_user uuid, p_role text) returns void
language plpgsql security definer set search_path = '' as $$
declare me uuid := (select auth.uid()); target text;
begin
  if p_role not in ('lider', 'colider', 'experto', 'veterano', 'novato') then raise exception 'bad role'; end if;
  if exists (select 1 from public.kg_groups where id = p_group and chat = 'dm') then raise exception 'not allowed'; end if;
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

create or replace function public.kg_set_perms(p_group uuid, p_user uuid, p_perms text[]) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if exists (select 1 from public.kg_groups where id = p_group and chat = 'dm') then raise exception 'not allowed'; end if;
  if public.kg_my_role(p_group) <> 'lider' then raise exception 'not allowed'; end if;
  if p_user = (select auth.uid()) then raise exception 'leader has all permissions'; end if;
  update public.kg_members set perms = coalesce((select array_agg(distinct p) from unnest(p_perms) p where p in ('invite', 'launch', 'share', 'moderate', 'kick')), '{}')
    where group_id = p_group and user_id = p_user and role <> 'lider';
end $$;

-- Ranking: el primer periodo, aunque empiece a medias, también se cierra y publica (antes se perdían sus puntuaciones).
-- La actividad de ese periodo se cuenta desde el día en que se activó el ranking.
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
    loop
      pe := case g.ranking_freq when '1W' then ps + 6 when '1M' then (ps + interval '1 month')::date - 1 else (ps + interval '1 year')::date - 1 end;
      exit when pe >= td or guard > 120;
      guard := guard + 1;
      pkey := case g.ranking_freq when '1W' then 'W' || to_char(ps, 'YYYY-MM-DD') when '1M' then 'M' || to_char(ps, 'YYYY-MM') else 'Y' || to_char(ps, 'YYYY') end;
      if not exists (select 1 from public.kg_rank_periods where group_id = p_group and period = pkey) then
        insert into public.kg_rank_periods (group_id, period, starts_on, ends_on) values (p_group, pkey, greatest(ps, g.ranking_since), pe);
        insert into public.kg_rep (group_id, group_name, user_id, period, place, points)
          select p_group, g.name, s.user_id, pkey, s.place,
            (array[10, 6, 3])[s.place] * case g.ranking_freq when '1W' then 1 when '1M' then 3 else 12 end
          from (
            select x.user_id, rank() over (order by x.score desc)::int as place
            from (select m.user_id, public.kg_score(p_group, g.kind, m.user_id, greatest(ps, g.ranking_since), pe)
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

-- En un chat entre dos amigos cada uno solo puede borrar sus propios mensajes
create or replace function public.kg_delete_message(p_id bigint) returns void
language plpgsql security definer set search_path = '' as $$
declare m public.kg_messages;
begin
  select * into m from public.kg_messages where id = p_id;
  if m.id is null then return; end if;
  if m.user_id is distinct from (select auth.uid()) and (not public.kg_has_perm(m.group_id, 'moderate')
      or exists (select 1 from public.kg_groups where id = m.group_id and chat = 'dm')) then raise exception 'not allowed'; end if;
  if m.payload ? 'media' then update public.kg_media set data = '' where id = (m.payload ->> 'media')::uuid; end if;
  update public.kg_messages set deleted = true, body = '', payload = '{}' where id = p_id;
end $$;
