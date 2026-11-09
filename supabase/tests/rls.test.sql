begin;
select plan(10);

-- Test fixtures (inserted as superuser, bypassing RLS)
insert into orgs (id, name) values
  ('11111111-1111-1111-1111-111111111111', 'Org A'),
  ('22222222-2222-2222-2222-222222222222', 'Org B');
insert into auth.users (id, email) values
  ('aaaaaaaa-0000-0000-0000-00000000000a', 'a@test.example'),
  ('bbbbbbbb-0000-0000-0000-00000000000b', 'b@test.example'),
  ('cccccccc-0000-0000-0000-00000000000c', 'v@test.example'),
  ('dddddddd-0000-0000-0000-00000000000d', 'admin@test.example');
insert into profiles (id, role, org_role, org_id, full_name, email) values
  ('aaaaaaaa-0000-0000-0000-00000000000a', 'customer', 'owner',  '11111111-1111-1111-1111-111111111111', 'Owner A',  'a@test.example'),
  ('bbbbbbbb-0000-0000-0000-00000000000b', 'customer', 'owner',  '22222222-2222-2222-2222-222222222222', 'Owner B',  'b@test.example'),
  ('cccccccc-0000-0000-0000-00000000000c', 'customer', 'viewer', '11111111-1111-1111-1111-111111111111', 'Viewer A', 'v@test.example'),
  ('dddddddd-0000-0000-0000-00000000000d', 'admin',    'owner',  null,                                   'Admin',    'admin@test.example');
insert into jobs (id, org_id, title) values
  ('aaaaaaaa-1111-1111-1111-000000000001', '11111111-1111-1111-1111-111111111111', 'Job A'),
  ('bbbbbbbb-2222-2222-2222-000000000001', '22222222-2222-2222-2222-222222222222', 'Job B');
insert into candidates (org_id, job_id, name) values
  ('11111111-1111-1111-1111-111111111111', 'aaaaaaaa-1111-1111-1111-000000000001', 'Candidate A'),
  ('22222222-2222-2222-2222-222222222222', 'bbbbbbbb-2222-2222-2222-000000000001', 'Candidate B');

-- As Owner A
do $$ begin perform set_config('request.jwt.claims',
  '{"sub":"aaaaaaaa-0000-0000-0000-00000000000a","role":"authenticated"}', true); end $$;
set local role authenticated;

select is((select count(*) from candidates)::int, 1, '1: Owner A sees only own org candidates');
select is((select count(*) from candidates where org_id = '22222222-2222-2222-2222-222222222222')::int, 0, '2: Owner A sees no candidates from Org B');
select throws_ok($q$insert into jobs (org_id, title) values ('22222222-2222-2222-2222-222222222222', 'x')$q$,
  '42501', null, '3: Owner A cannot create a job in Org B');
update profiles set role = 'admin', org_id = null where id = 'aaaaaaaa-0000-0000-0000-00000000000a';
select throws_ok($q$insert into candidates (org_id, job_id, name)
  values ('11111111-1111-1111-1111-111111111111', 'bbbbbbbb-2222-2222-2222-000000000001', 'x')$q$,
  'P0001', null, '6: Owner A cannot link a candidate to Org B job');
select throws_ok($q$update candidates set org_id = '22222222-2222-2222-2222-222222222222', job_id = null
  where name = 'Candidate A'$q$, '42501', null, '7: Owner A cannot move a candidate to Org B');
select is((select count(*) from profiles)::int, 2, '10: Owner A sees only profiles in own org');

reset role;
select is((select role::text from profiles where id = 'aaaaaaaa-0000-0000-0000-00000000000a'),
  'customer', '4: Owner A role remains customer after update attempt');

-- As Viewer A
do $$ begin perform set_config('request.jwt.claims',
  '{"sub":"cccccccc-0000-0000-0000-00000000000c","role":"authenticated"}', true); end $$;
set local role authenticated;
select throws_ok($q$insert into candidates (org_id, name)
  values ('11111111-1111-1111-1111-111111111111', 'x')$q$, '42501', null, '5: Viewer cannot create a candidate');
reset role;

-- As anonymous user
set local role anon;
select is((select count(*) from candidates)::int, 0, '8: Anonymous user sees no candidates');
reset role;

-- As platform admin
do $$ begin perform set_config('request.jwt.claims',
  '{"sub":"dddddddd-0000-0000-0000-00000000000d","role":"authenticated"}', true); end $$;
set local role authenticated;
select is((select count(*) from candidates)::int, 2, '9: Admin sees candidates from both orgs');
reset role;

select * from finish();
rollback;
