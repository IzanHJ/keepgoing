-- v1.22: cola de notificaciones de eventos (ya aplicada en Supabase el 2026-10-21 como kg_notify_queue_20261021 + kg_notify_safe_20261021).
-- La llenan triggers SECURITY DEFINER (mensajes, alguien te añade a un grupo, te comparten una libreta, una proyección o su calendario)
-- y la lee la Edge Function kg-reminders (supabase/functions/kg-reminders), que respeta los interruptores de Ajustes (state.notif).
create table if not exists public.kg_notify (
  id bigint generated always as identity primary key,
  user_id uuid not null,
  kind text not null check (kind in ('message', 'group', 'share')),
  sub text not null default '',
  group_id uuid,
  actor text not null default '',
  title text not null default '',
  body text not null default '',
  created_at timestamptz not null default now(),
  sent boolean not null default false
);
create index if not exists kg_notify_pending on public.kg_notify (created_at) where not sent;
alter table public.kg_notify enable row level security;

create or replace function public.kg_actor_name(p_user uuid, p_group uuid default null) returns text
language sql stable security definer set search_path = public as $$
  select coalesce(
    (select m.display_name from kg_members m where m.group_id = p_group and m.user_id = p_user),
    (select coalesce(u.display_name, '@' || u.nametag) from kg_users u where u.user_id = p_user),
    '');
$$;
revoke all on function public.kg_actor_name(uuid, uuid) from public, anon, authenticated;

-- Las notificaciones nunca deben impedir enviar un mensaje o compartir algo: cualquier fallo se ignora.
create or replace function public.kg_notify_msg() returns trigger
language plpgsql security definer set search_path = public as $$
declare g record; v_kind text := 'message'; v_sub text := new.kind; v_body text := '';
begin
  begin
    if new.user_id is null or new.kind = 'system' or new.deleted then return new; end if;
    select name, chat into g from kg_groups where id = new.group_id;
    if new.kind = 'text' then v_body := left(new.body, 140);
    elsif new.kind = 'share' then
      v_sub := coalesce(new.payload->>'type', 'share');
      if v_sub in ('habit', 'project') then v_kind := 'share'; v_body := left(coalesce(new.payload->'spec'->>'name', ''), 80);
      elsif v_sub = 'event' then v_body := left(coalesce(new.payload->'event'->>'name', ''), 80);
      end if;
    end if;
    insert into kg_notify (user_id, kind, sub, group_id, actor, title, body)
    select m.user_id, v_kind, v_sub, new.group_id, kg_actor_name(new.user_id, new.group_id), case when g.chat = 'dm' then '' else coalesce(g.name, '') end, v_body
    from kg_members m where m.group_id = new.group_id and m.user_id <> new.user_id;
  exception when others then null;
  end;
  return new;
end $$;
create trigger kg_messages_notify after insert on public.kg_messages for each row execute function public.kg_notify_msg();

create or replace function public.kg_notify_member() returns trigger
language plpgsql security definer set search_path = public as $$
declare g record;
begin
  begin
    if auth.uid() is null or auth.uid() = new.user_id then return new; end if;
    select name, chat into g from kg_groups where id = new.group_id;
    if g.chat = 'dm' then return new; end if;
    insert into kg_notify (user_id, kind, sub, group_id, actor, title) values (new.user_id, 'group', '', new.group_id, kg_actor_name(auth.uid(), new.group_id), coalesce(g.name, ''));
  exception when others then null;
  end;
  return new;
end $$;
create trigger kg_members_notify after insert on public.kg_members for each row execute function public.kg_notify_member();

create or replace function public.kg_notify_ledger() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  begin
    insert into kg_notify (user_id, kind, sub, actor, title) values (new.to_user, 'share', 'ledger', kg_actor_name(new.from_user), left(coalesce(new.title, ''), 80));
  exception when others then null;
  end;
  return new;
end $$;
create trigger kg_ledger_shares_notify after insert on public.kg_ledger_shares for each row execute function public.kg_notify_ledger();

create or replace function public.kg_notify_proj() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  begin
    if tg_op = 'UPDATE' and (old.active or not new.active) then return new; end if;
    if tg_op = 'INSERT' and not new.active then return new; end if;
    insert into kg_notify (user_id, kind, sub, actor, title) values (new.to_user, 'share', 'proj', kg_actor_name(new.owner), left(coalesce(new.title, ''), 80));
  exception when others then null;
  end;
  return new;
end $$;
create trigger kg_proj_shares_notify after insert or update of active on public.kg_proj_shares for each row execute function public.kg_notify_proj();

create or replace function public.kg_notify_cal() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  begin
    if tg_op = 'UPDATE' and (old.active or not new.active) then return new; end if;
    if tg_op = 'INSERT' and not new.active then return new; end if;
    insert into kg_notify (user_id, kind, sub, actor) values (new.to_user, 'share', 'cal', kg_actor_name(new.owner));
  exception when others then null;
  end;
  return new;
end $$;
create trigger kg_cal_grants_notify after insert or update of active on public.kg_cal_grants for each row execute function public.kg_notify_cal();

revoke all on function public.kg_notify_msg() from public, anon, authenticated;
revoke all on function public.kg_notify_member() from public, anon, authenticated;
revoke all on function public.kg_notify_ledger() from public, anon, authenticated;
revoke all on function public.kg_notify_proj() from public, anon, authenticated;
revoke all on function public.kg_notify_cal() from public, anon, authenticated;
