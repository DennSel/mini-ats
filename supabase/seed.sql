-- seed.sql: Idempotent demo data for Nordvik Tech AB and Solberg Logistik.
-- Safe to run in the Supabase SQL Editor before or after creating organisations in /admin.

do $$
declare
  v_nordvik uuid;
  v_solberg uuid;
  v_anna    uuid;
begin
  -- Reuse existing organisations by name if already created via /admin, otherwise insert with deterministic UUIDs.
  select id into v_nordvik from public.orgs where name = 'Nordvik Tech AB' limit 1;
  if v_nordvik is null then
    v_nordvik := '11111111-1111-1111-1111-111111111111';
    insert into public.orgs (id, name)
    values (v_nordvik, 'Nordvik Tech AB')
    on conflict (id) do nothing;
  end if;

  select id into v_solberg from public.orgs where name = 'Solberg Logistik' limit 1;
  if v_solberg is null then
    v_solberg := '22222222-2222-2222-2222-222222222222';
    insert into public.orgs (id, name)
    values (v_solberg, 'Solberg Logistik')
    on conflict (id) do nothing;
  end if;

  -- Optional: link created_by to the first owner of Nordvik if present.
  select id into v_anna
  from public.profiles
  where org_id = v_nordvik and org_role = 'owner'
  limit 1;

  -- Jobs for Nordvik Tech AB
  insert into public.jobs (id, org_id, title, location, description, status, created_at) values
    ('aaaaaaaa-0000-0000-0000-000000000001', v_nordvik, 'Senior Frontendutvecklare', 'Stockholm', 'Bygg vårt nya kundgränssnitt i React och TypeScript.', 'open', '2026-09-14T09:00:00Z'),
    ('aaaaaaaa-0000-0000-0000-000000000002', v_nordvik, 'UX-designer', 'Göteborg (hybrid)', 'Forma användarupplevelsen i våra produkter.', 'open', '2026-09-28T09:00:00Z'),
    ('aaaaaaaa-0000-0000-0000-000000000003', v_nordvik, 'DevOps-ingenjör', 'Distans', 'Ansvara för vår molninfrastruktur och CI/CD.', 'closed', '2026-07-02T09:00:00Z')
  on conflict (id) do nothing;

  -- Jobs for Solberg Logistik
  insert into public.jobs (id, org_id, title, location, description, status, created_at) values
    ('bbbbbbbb-0000-0000-0000-000000000001', v_solberg, 'Lagerchef', 'Jönköping', 'Led ett team på 25 personer i vårt centrallager.', 'open', '2026-10-01T09:00:00Z'),
    ('bbbbbbbb-0000-0000-0000-000000000002', v_solberg, 'Transportplanerare', 'Malmö', 'Planera och optimera våra leveransrutter.', 'open', '2026-10-12T09:00:00Z'),
    ('bbbbbbbb-0000-0000-0000-000000000003', v_solberg, 'Ekonomiassistent', 'Jönköping', 'Stötta ekonomiavdelningen med löpande bokföring.', 'closed', '2026-06-20T09:00:00Z')
  on conflict (id) do nothing;

  -- Candidates for Nordvik Tech AB
  insert into public.candidates (
    id, org_id, job_id, name, email, phone, linkedin, links, note, interview_at, interview_link, stage, position, created_by, created_at
  ) values
    ('c1111111-0000-0000-0000-000000000001', v_nordvik, 'aaaaaaaa-0000-0000-0000-000000000001', 'Sara Ekström', 'sara.ekstrom@gmail.com', '070-100 10 20', 'https://www.linkedin.com/in/sara-ekstrom', '[{"id":"l-n-1","label":"GitHub","url":"https://github.com/sara-ekstrom"}]'::jsonb, 'Stark profil inom React 19 och designsystem.', null, null, 'new', 1000, v_anna, '2026-10-01T10:00:00Z'),
    ('c1111111-0000-0000-0000-000000000002', v_nordvik, 'aaaaaaaa-0000-0000-0000-000000000002', 'Johan Berg', 'johan.berg@gmail.com', '071-137 17 23', 'https://www.linkedin.com/in/johan-berg', '[]'::jsonb, 'Gedigen portfölj inom B2B SaaS.', null, null, 'new', 1000, v_anna, '2026-10-04T10:00:00Z'),
    ('c1111111-0000-0000-0000-000000000003', v_nordvik, 'aaaaaaaa-0000-0000-0000-000000000001', 'Lina Nyström', 'lina.nystrom@gmail.com', '072-174 24 26', 'https://www.linkedin.com/in/lina-nystrom', '[]'::jsonb, 'Har lett migrering till TanStack Router tidigare.', null, null, 'screening', 1000, v_anna, '2026-10-07T10:00:00Z'),
    ('c1111111-0000-0000-0000-000000000004', v_nordvik, 'aaaaaaaa-0000-0000-0000-000000000001', 'Ahmed Karimi', 'ahmed.karimi@gmail.com', '070-211 31 29', 'https://www.linkedin.com/in/ahmed-karimi', '[{"id":"l-n-4","label":"GitHub","url":"https://github.com/ahmed-karimi"}]'::jsonb, 'Teknisk telefonavstämning genomförd, går vidare.', null, null, 'screening', 2000, v_anna, '2026-10-10T10:00:00Z'),
    ('c1111111-0000-0000-0000-000000000005', v_nordvik, 'aaaaaaaa-0000-0000-0000-000000000002', 'Maja Persson', 'maja.persson@gmail.com', '071-248 38 32', 'https://www.linkedin.com/in/maja-persson', '[]'::jsonb, 'Case-presentation bokad.', '2026-11-12T13:30:00Z', 'https://meet.google.com/abc-defg-hij', 'interview', 1000, v_anna, '2026-10-13T10:00:00Z'),
    ('c1111111-0000-0000-0000-000000000006', v_nordvik, 'aaaaaaaa-0000-0000-0000-000000000001', 'Oskar Lund', 'oskar.lund@gmail.com', '072-285 45 35', 'https://www.linkedin.com/in/oskar-lund', '[]'::jsonb, 'Första tekniska intervjun bokad med teamet.', '2026-11-14T10:00:00Z', 'https://meet.google.com/xyz-uvwx-rst', 'interview', 1000, v_anna, '2026-10-16T10:00:00Z'),
    ('c1111111-0000-0000-0000-000000000007', v_nordvik, 'aaaaaaaa-0000-0000-0000-000000000001', 'Elin Sjöberg', 'elin.sjoberg@gmail.com', '070-322 52 38', 'https://www.linkedin.com/in/elin-sjoberg', '[{"id":"l-n-7","label":"GitHub","url":"https://github.com/elin-sjoberg"}]'::jsonb, 'Referenser tagna, avtalsförslag skickat.', null, null, 'offer', 1000, v_anna, '2026-10-19T10:00:00Z'),
    ('c1111111-0000-0000-0000-000000000008', v_nordvik, 'aaaaaaaa-0000-0000-0000-000000000003', 'Viktor Åkesson', 'viktor.akesson@gmail.com', '071-359 59 41', 'https://www.linkedin.com/in/viktor-akesson', '[]'::jsonb, 'Signerat avtal, startar i december.', null, null, 'hired', 1000, v_anna, '2026-10-22T10:00:00Z'),
    ('c1111111-0000-0000-0000-000000000009', v_nordvik, 'aaaaaaaa-0000-0000-0000-000000000002', 'Nora Hedlund', 'nora.hedlund@gmail.com', '072-396 66 44', 'https://www.linkedin.com/in/nora-hedlund', '[]'::jsonb, 'Valde annat erbjudande.', null, null, 'rejected', 1000, v_anna, '2026-10-25T10:00:00Z'),
    ('c1111111-0000-0000-0000-000000000010', v_nordvik, null, 'Tove Rask', 'tove.rask@gmail.com', '070-544 94 56', 'https://www.linkedin.com/in/tove-rask', '[{"id":"l-n-10","label":"GitHub","url":"https://github.com/tove-rask"}]'::jsonb, 'Spontanansökan, sparas i kandidatbanken inför våren.', null, null, 'new', 1000, v_anna, '2026-10-26T10:00:00Z'),
    ('c1111111-0000-0000-0000-000000000011', v_nordvik, null, 'Samir Jabari', 'samir.jabari@gmail.com', '071-581 01 59', 'https://www.linkedin.com/in/samir-jabari', '[]'::jsonb, 'Fullstackprofil i kandidatbanken.', null, null, 'new', 2000, v_anna, '2026-10-27T10:00:00Z')
  on conflict (id) do nothing;

  -- Candidates for Solberg Logistik
  insert into public.candidates (
    id, org_id, job_id, name, email, phone, linkedin, links, note, interview_at, interview_link, stage, position, created_at
  ) values
    ('c2222222-0000-0000-0000-000000000001', v_solberg, 'bbbbbbbb-0000-0000-0000-000000000001', 'Karin Dahl', 'karin.dahl@outlook.com', '070-100 10 20', 'https://www.linkedin.com/in/karin-dahl', '[]'::jsonb, '10 års erfarenhet av lagerdrift och skiftplanering.', null, null, 'new', 1000, '2026-10-02T10:00:00Z'),
    ('c2222222-0000-0000-0000-000000000002', v_solberg, 'bbbbbbbb-0000-0000-0000-000000000002', 'Mikael Olsson', 'mikael.olsson@outlook.com', '071-137 17 23', 'https://www.linkedin.com/in/mikael-olsson', '[]'::jsonb, 'Erfarenhet av ruttoptimering i Norden.', null, null, 'screening', 1000, '2026-10-05T10:00:00Z'),
    ('c2222222-0000-0000-0000-000000000003', v_solberg, 'bbbbbbbb-0000-0000-0000-000000000001', 'Fatima Yilmaz', 'fatima.yilmaz@outlook.com', '072-174 24 26', 'https://www.linkedin.com/in/fatima-yilmaz', '[]'::jsonb, 'Platsbesök och intervju bokad i Jönköping.', '2026-11-13T09:00:00Z', 'https://teams.microsoft.com/l/meetup-join/solberg', 'interview', 1000, '2026-10-08T10:00:00Z'),
    ('c2222222-0000-0000-0000-000000000004', v_solberg, 'bbbbbbbb-0000-0000-0000-000000000002', 'Henrik Björk', 'henrik.bjork@outlook.com', '070-211 31 29', 'https://www.linkedin.com/in/henrik-bjork', '[]'::jsonb, 'Erbjudande utskickat.', null, null, 'offer', 1000, '2026-10-11T10:00:00Z'),
    ('c2222222-0000-0000-0000-000000000005', v_solberg, 'bbbbbbbb-0000-0000-0000-000000000003', 'Emma Lindgren', 'emma.lindgren@outlook.com', '071-248 38 32', 'https://www.linkedin.com/in/emma-lindgren', '[]'::jsonb, 'Anställd till ekonomiavdelningen.', null, null, 'hired', 1000, '2026-10-14T10:00:00Z'),
    ('c2222222-0000-0000-0000-000000000006', v_solberg, null, 'Hanna Krook', 'hanna.krook@outlook.com', '070-544 94 56', 'https://www.linkedin.com/in/hanna-krook', '[]'::jsonb, 'Vilande kandidat för framtida logistikroller.', null, null, 'new', 1000, '2026-10-20T10:00:00Z')
  on conflict (id) do nothing;
end $$;
