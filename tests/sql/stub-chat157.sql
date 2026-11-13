-- Stub mínimo de Supabase para probar 20261113_v157_chat.sql con tests/sql/chat157.test.sql (no se usa en producción)
do $$ begin create role anon; exception when others then null; end $$; do $$ begin create role authenticated; exception when others then null; end $$;
create schema auth; create schema extensions;
create extension pgcrypto schema extensions;
create table auth.users (id uuid primary key default gen_random_uuid(), created_at timestamptz default now());
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('test.uid', true), '')::uuid $$;
create table public.kg_users (user_id uuid primary key, nametag text unique, display_name text, avatar text, pubkey jsonb, updated_at timestamptz default now());
create table public.kg_groups (id uuid primary key default gen_random_uuid(), owner uuid, name text, icon text, kind text default 'project', chat text, avatar text);
create table public.kg_members (group_id uuid, user_id uuid, role text, perms text[] default '{}', display_name text);
create table public.kg_messages (id bigint generated always as identity primary key, group_id uuid references public.kg_groups(id) on delete cascade, user_id uuid, kind text, body text default '', payload jsonb default '{}', created_at timestamptz default now(), deleted boolean default false);
create table public.kg_full (user_id uuid);
create function public.kg_is_member(gid uuid) returns boolean language sql stable as $$ select exists (select 1 from public.kg_members m where m.group_id = gid and m.user_id = (select auth.uid())) $$;
create function public.kg_has_perm(gid uuid, p_perm text) returns boolean language sql stable as $$ select exists (select 1 from public.kg_members m where m.group_id = gid and m.user_id = (select auth.uid()) and (m.role = 'lider' or p_perm = any (m.perms))) $$;
create function public.kg_my_role(gid uuid) returns text language sql stable as $$ select role from public.kg_members where group_id = gid and user_id = (select auth.uid()) $$;
create function public.kg_is_mod(gid uuid) returns boolean language sql stable as $$ select coalesce(public.kg_my_role(gid) in ('lider', 'colider'), false) $$;
create function public.kg_has_full(p_user uuid) returns boolean language sql stable as $$ select p_user is null or exists (select 1 from public.kg_full where user_id = p_user) $$;
