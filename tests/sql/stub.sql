-- Imitación mínima de Supabase para probar las migraciones en un Postgres local (no se usa en producción)
do $$ begin create role anon; exception when others then null; end $$; do $$ begin create role authenticated; exception when others then null; end $$;
create schema auth; create schema extensions;
create extension pgcrypto schema extensions;
create table auth.users (id uuid primary key default gen_random_uuid(), created_at timestamptz default now());
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('test.uid', true), '')::uuid $$;
create table public.kg_users (user_id uuid primary key, nametag text unique, display_name text);
create table public.kg_rate (user_id uuid, bucket text, at timestamptz default now());
create table public.kg_groups (id uuid primary key default gen_random_uuid(), owner uuid, name text, chat text);
create table public.kg_ledger_shares (id uuid primary key default gen_random_uuid(), from_user uuid);
create table public.kg_proj_shares (id uuid primary key default gen_random_uuid(), owner uuid);
create table public.kg_cal_grants (owner uuid, to_user uuid, active boolean default true, primary key (owner, to_user));
