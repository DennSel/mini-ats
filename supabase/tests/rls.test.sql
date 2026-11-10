begin;
select plan(17);

-- Start from a clean slate inside the rolled-back test transaction even if seed.sql ran
truncate table candidates, jobs, profiles, orgs cascade;

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
  ('aaaaaaaa-1111-1111-1111-000000000002', '11111111-1111-1111-1111-111111111111', 'Job A2'),
  ('bbbbbbbb-2222-2222-2222-000000000001', '22222222-2222-2222-2222-222222222222', 'Job B');
insert into candidates (org_id, job_id, name) values
  ('11111111-1111-1111-1111-111111111111', 'aaaaaaaa-1111-1111-1111-000000000001', 'Candidate A'),
  ('11111111-1111-1111-1111-111111111111', 'aaaaaaaa-1111-1111-1111-000000000002', 'Candidate A2'),
  ('22222222-2222-2222-2222-222222222222', 'bbbbbbbb-2222-2222-2222-000000000001', 'Candidate B');

-- As Owner A
do $$ begin perform set_config('request.jwt.claims',
  '{"sub":"aaaaaaaa-0000-0000-0000-00000000000a","role":"authenticated"}', true); end $$;
set local role authenticated;

select is((select count(*) from candidates)::int, 2, '1: Owner A sees only own org candidates');
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

-- Restrict Viewer A to Job A only (slice 16: per-member job access)
update profiles
  set org_role = 'member',
      job_ids = array['aaaaaaaa-1111-1111-1111-000000000001'::uuid]
  where id = 'cccccccc-0000-0000-0000-00000000000c';

do $$ begin perform set_config('request.jwt.claims',
  '{"sub":"cccccccc-0000-0000-0000-00000000000c","role":"authenticated"}', true); end $$;
set local role authenticated;
select is((select count(*) from jobs)::int, 1, '11: Restricted member sees only permitted jobs');
select throws_ok($q$insert into candidates (org_id, job_id, name)
  values ('11111111-1111-1111-1111-111111111111', 'aaaaaaaa-1111-1111-1111-000000000002', 'x')$q$,
  '42501', null, '12: Restricted member cannot add candidate to unpermitted job');
reset role;

-- As anonymous user
set local role anon;
select is((select count(*) from candidates)::int, 0, '8: Anonymous user sees no candidates');
reset role;

-- As platform admin
do $$ begin perform set_config('request.jwt.claims',
  '{"sub":"dddddddd-0000-0000-0000-00000000000d","role":"authenticated"}', true); end $$;
set local role authenticated;
select is((select count(*) from candidates)::int, 3, '9: Admin sees candidates from both orgs');
reset role;

-- Resume storage (0005): objects fixture per candidate, inserted as postgres (bypasses RLS)
insert into storage.objects (bucket_id, name, owner, metadata)
select 'resumes', '11111111-1111-1111-1111-111111111111/' || c.id::text || '/cv.pdf',
       'cccccccc-0000-0000-0000-00000000000c', '{"mimetype":"application/pdf","size":1000}'::jsonb
from candidates c where c.name = 'Candidate A';
insert into storage.objects (bucket_id, name, owner, metadata)
select 'resumes', '22222222-2222-2222-2222-222222222222/' || c.id::text || '/cv.pdf',
       'bbbbbbbb-0000-0000-0000-00000000000b', '{"mimetype":"application/pdf","size":1000}'::jsonb
from candidates c where c.name = 'Candidate B';

-- As Member A (restricted job access must not affect resume visibility)
do $$ begin perform set_config('request.jwt.claims',
  '{"sub":"cccccccc-0000-0000-0000-00000000000c","role":"authenticated"}', true); end $$;
set local role authenticated;
select is(
  (select count(*) from storage.objects where bucket_id = 'resumes')::int,
  1, '13: Member A sees only resume files from own organisation');
select throws_ok(
  $q$insert into storage.objects (bucket_id, name, owner, metadata)
     values ('resumes', '22222222-2222-2222-2222-222222222222/' ||
       (select c.id::text from candidates c where c.name = 'Candidate A') || '/cv.pdf',
       'cccccccc-0000-0000-0000-00000000000c', '{"mimetype":"application/pdf","size":1000}'::jsonb)$q$,
  '42501', null, '14: Member A cannot upload into another organisation''s folder');
select throws_ok(
  $q$insert into storage.objects (bucket_id, name, owner, metadata)
     values ('resumes', '11111111-1111-1111-1111-111111111111/00000000-0000-0000-0000-00000000dead/cv.pdf',
       'cccccccc-0000-0000-0000-00000000000c', '{"mimetype":"application/pdf","size":1000}'::jsonb)$q$,
  '42501', null, '15: Member A cannot upload to a path without a real candidate');
reset role;

-- Viewers can read but not upload
update profiles set org_role = 'viewer' where id = 'cccccccc-0000-0000-0000-00000000000c';
do $$ begin perform set_config('request.jwt.claims',
  '{"sub":"cccccccc-0000-0000-0000-00000000000c","role":"authenticated"}', true); end $$;
set local role authenticated;
select is(
  (select count(*) from storage.objects where bucket_id = 'resumes')::int,
  1, '16: Viewer still reads resume files from own organisation');
select throws_ok(
  $q$insert into storage.objects (bucket_id, name, owner, metadata)
     values ('resumes', '11111111-1111-1111-1111-111111111111/' ||
       (select c.id::text from candidates c where c.name = 'Candidate A') || '/cv.pdf',
       'cccccccc-0000-0000-0000-00000000000c', '{"mimetype":"application/pdf","size":1000}'::jsonb)$q$,
  '42501', null, '17: Viewer cannot upload a resume file');
reset role;
update profiles set org_role = 'member' where id = 'cccccccc-0000-0000-0000-00000000000c';

-- Note: file deletion goes through the Storage API from the app (Supabase blocks
-- direct deletes on storage.objects), so it is not covered by pgTAP here.

select * from finish();
rollback;
