-- 0002_rls.sql: row level security, helper functions, org-isolation trigger (step 03).
-- Explicit grants at the bottom: "Automatically expose new tables" is disabled on
-- this project, so the Data API roles get their privileges here, deliberately.

-- Helper functions: security definer with a pinned search_path so the profiles
-- policy can read profiles without recursing.
create function is_admin() returns boolean language sql stable
  security definer set search_path = public
  as $$ select exists (select 1 from profiles where id = auth.uid() and role = 'admin') $$;

create function my_org() returns uuid language sql stable
  security definer set search_path = public
  as $$ select org_id from profiles where id = auth.uid() $$;

create function my_org_role() returns org_role language sql stable
  security definer set search_path = public
  as $$ select org_role from profiles where id = auth.uid() $$;

alter table orgs enable row level security;
alter table profiles enable row level security;
alter table jobs enable row level security;
alter table candidates enable row level security;

create policy orgs_read on orgs for select
  using (is_admin() or id = my_org());

-- Only platform admins write orgs (create/rename/delete happen in the admin UI).
create policy orgs_write on orgs for all
  using (is_admin()) with check (is_admin());

-- Customers can never write profiles: role and org changes happen only in
-- server code running with service_role (invariant 2).
create policy profiles_read on profiles for select
  using (
    id = auth.uid()
    or is_admin()
    or (my_org_role() = 'owner' and org_id = my_org()));

create policy jobs_read on jobs for select
  using (is_admin() or org_id = my_org());

-- WITH CHECK on the new row pins org_id to the writer's own org, so a
-- customer can never move or create rows in another organisation.
create policy jobs_write on jobs for all
  using (is_admin() or (org_id = my_org() and my_org_role() in ('owner','member')))
  with check (is_admin() or (org_id = my_org() and my_org_role() in ('owner','member')));

create policy candidates_read on candidates for select
  using (is_admin() or org_id = my_org());

create policy candidates_write on candidates for all
  using (is_admin() or (org_id = my_org() and my_org_role() in ('owner','member')))
  with check (is_admin() or (org_id = my_org() and my_org_role() in ('owner','member')));

-- A candidate's job must belong to the same organisation, no matter who writes
-- (invariant 5). security definer so the check sees the real org of the job,
-- not the caller's RLS-filtered view of it.
create function check_candidate_job() returns trigger language plpgsql
  security definer set search_path = public
as $$
begin
  if new.job_id is not null and not exists
    (select 1 from jobs where id = new.job_id and org_id = new.org_id)
  then raise exception 'Candidate job belongs to another organisation'; end if;
  return new;
end $$;

create trigger candidate_job_check before insert or update on candidates
  for each row execute function check_candidate_job();

-- Deliberate grants (auto-expose is off). Profiles are read-only for
-- authenticated users (writes happen only via service_role); orgs, jobs and
-- candidates get CRUD for authenticated users -- the policies above decide
-- which rows and roles may actually act. service_role bypasses RLS.
grant select on profiles to authenticated;
grant select, insert, update, delete on orgs, jobs, candidates to authenticated;
grant select, insert, update, delete on orgs, profiles, jobs, candidates to service_role;
