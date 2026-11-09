-- 0003_harden_rls_functions.sql: scope RLS policies to authenticated and
-- restrict EXECUTE on security definer functions (step 03 Advisor remediation).

-- Scope all policies to authenticated so anon never evaluates helper functions.
alter policy orgs_read on orgs to authenticated;
alter policy orgs_write on orgs to authenticated;
alter policy profiles_read on profiles to authenticated;
alter policy jobs_read on jobs to authenticated;
alter policy jobs_write on jobs to authenticated;
alter policy candidates_read on candidates to authenticated;
alter policy candidates_write on candidates to authenticated;

-- Helper functions are evaluated by RLS policies for signed-in users only;
-- anon and public must not be able to call them via /rest/v1/rpc/*.
revoke execute on function is_admin(), my_org(), my_org_role() from public, anon;
grant execute on function is_admin(), my_org(), my_org_role() to authenticated, service_role;

-- Ensure authenticated has table-level CRUD on orgs, jobs and candidates (RLS enforces role/org).
grant select, insert, update, delete on orgs, jobs, candidates to authenticated;

-- Trigger functions are invoked by PostgreSQL on DML/DDL, never via RPC by
-- API roles.
revoke execute on function check_candidate_job() from public, anon, authenticated;

do $$
begin
  if exists (
    select 1 from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'rls_auto_enable'
  ) then
    execute 'revoke execute on function public.rls_auto_enable() from public, anon, authenticated';
  end if;
end $$;
