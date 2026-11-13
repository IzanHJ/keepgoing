-- Pruebas de la migración v1.57 (chat moderno y perfiles amplios) en un Postgres local con stub de Supabase.
-- Uso: psql -v ON_ERROR_STOP=1 -f stub (pre + tablas) -f supabase/migrations/20261113_v157_chat.sql -f este archivo
\set a '11111111-1111-1111-1111-111111111111'
\set b '22222222-2222-2222-2222-222222222222'
\set c '33333333-3333-3333-3333-333333333333'
insert into public.kg_users (user_id, nametag) values (:'a', 'ana'), (:'b', 'beto'), (:'c', 'cris');
insert into public.kg_full values (:'a');
insert into public.kg_groups (id, name, chat) values ('aaaaaaaa-0000-0000-0000-000000000001', 'G', 'group'), ('aaaaaaaa-0000-0000-0000-000000000002', 'DM', 'dm');
insert into public.kg_members (group_id, user_id, role) values ('aaaaaaaa-0000-0000-0000-000000000001', :'a', 'lider'), ('aaaaaaaa-0000-0000-0000-000000000001', :'b', 'miembro'),
  ('aaaaaaaa-0000-0000-0000-000000000002', :'a', 'miembro'), ('aaaaaaaa-0000-0000-0000-000000000002', :'b', 'miembro');
create function pg_temp.fails(q text, pat text) returns void language plpgsql as $$
begin execute q; raise exception 'esperaba fallo: %', q; exception when others then if sqlerrm !~ pat then raise exception 'fallo distinto (%): %', pat, sqlerrm; end if; end $$;

-- perfil: B (Free) puede poner plantilla y emojis, pero no enlaces ni GIF; A (KeepGoing) sí
select set_config('test.uid', :'b', false);
update public.kg_users set banner = '{"t":"tpl","id":"futbol"}' where user_id = :'b';
update public.kg_users set banner = '{"t":"emoji","e":["🔥","⚽"]}' where user_id = :'b';
select pg_temp.fails($$update public.kg_users set links = '[{"u":"https://x.com"}]' where user_id = '22222222-2222-2222-2222-222222222222'$$, 'plan');
select pg_temp.fails($$update public.kg_users set banner = '{"t":"gif","v":1}' where user_id = '22222222-2222-2222-2222-222222222222'$$, 'plan');
select pg_temp.fails($$select public.kg_banner_upload(null, 'image/gif', 'R0lGOD')$$, 'plan');
select public.kg_banner_upload(null, 'image/png', 'iVBORw0K');
select set_config('test.uid', :'a', false);
update public.kg_users set links = '[{"u":"https://x.com/ana","l":"X"}]', banner = '{"t":"gif","v":1}' where user_id = :'a';
select pg_temp.fails($$update public.kg_users set links = '[{"u":"javascript:alert(1)"}]' where user_id = '11111111-1111-1111-1111-111111111111'$$, 'bad links');
select pg_temp.fails($$update public.kg_users set links = '[{"u":"https://a.com"},{"u":"https://a.com"},{"u":"https://a.com"},{"u":"https://a.com"},{"u":"https://a.com"},{"u":"https://a.com"}]' where user_id = '11111111-1111-1111-1111-111111111111'$$, 'bad links|check');
select public.kg_banner_upload(null, 'image/gif', 'R0lGODlh');
-- cambiar otra cosa con enlaces ya puestos no se bloquea aunque el plan caduque
delete from public.kg_full;
update public.kg_users set nametag = 'ana2' where user_id = :'a';
insert into public.kg_full values (:'a');
-- grupo: solo Líder/Colíder; en privados no
select public.kg_set_group_profile('aaaaaaaa-0000-0000-0000-000000000001', '{"t":"tpl","id":"paraiso1"}', '[{"u":"https://club.es","l":"Web"}]');
select public.kg_banner_upload('aaaaaaaa-0000-0000-0000-000000000001', 'image/gif', 'R0lGODlh');
select pg_temp.fails($$select public.kg_set_group_profile('aaaaaaaa-0000-0000-0000-000000000002', null, null)$$, 'not allowed');
select set_config('test.uid', :'b', false);
select pg_temp.fails($$select public.kg_set_group_profile('aaaaaaaa-0000-0000-0000-000000000001', null, null)$$, 'not allowed');
do $$ begin if (select count(*) from public.kg_banner_imgs) <> 3 then raise exception 'banners: %', (select count(*) from public.kg_banner_imgs); end if; end $$;

-- reacciones: alternan y cambian; C (no miembro) no puede
select set_config('test.uid', :'a', false);
insert into public.kg_messages (group_id, user_id, kind, body) values ('aaaaaaaa-0000-0000-0000-000000000001', :'a', 'text', 'hola');
select public.kg_react((select max(id) from public.kg_messages), '👍');
select public.kg_react((select max(id) from public.kg_messages), '❤️');
do $$ begin if (select emoji from public.kg_reactions) <> '❤️' then raise exception 'reacción no cambió'; end if; end $$;
select public.kg_react((select max(id) from public.kg_messages), '❤️');
do $$ begin if exists (select 1 from public.kg_reactions) then raise exception 'reacción no se quitó'; end if; end $$;
select pg_temp.fails($$select public.kg_react((select max(id) from public.kg_messages), '<b>')$$, 'bad emoji');
select set_config('test.uid', :'c', false);
select pg_temp.fails($$select public.kg_react((select max(id) from public.kg_messages), '👍')$$, 'not allowed');

-- fijar: en grupo solo quien modera; editar: solo lo propio; reenviar marca fwd
select set_config('test.uid', :'b', false);
select pg_temp.fails($$select public.kg_pin('aaaaaaaa-0000-0000-0000-000000000001', (select max(id) from public.kg_messages))$$, 'not allowed');
select pg_temp.fails($$select public.kg_edit_message((select max(id) from public.kg_messages), 'x')$$, 'not allowed');
select set_config('test.uid', :'a', false);
select public.kg_pin('aaaaaaaa-0000-0000-0000-000000000001', (select max(id) from public.kg_messages));
select public.kg_edit_message((select max(id) from public.kg_messages), 'hola editado');
do $$ begin if (select body || (payload ->> 'edited') from public.kg_messages order by id desc limit 1) <> 'hola editadotrue' then raise exception 'edición'; end if; end $$;
select public.kg_post('aaaaaaaa-0000-0000-0000-000000000002', 'text', 'reenviado', '{"fwd":true,"evil":1}');
do $$ begin if (select payload from public.kg_messages order by id desc limit 1) <> '{"fwd": true}'::jsonb then raise exception 'fwd: %', (select payload from public.kg_messages order by id desc limit 1); end if; end $$;
select 'chat157 OK' as result;
