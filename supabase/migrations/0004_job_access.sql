-- 0004_job_access.sql: per-member job access (slice 16).
-- NULL job_ids = access to all jobs in the organisation; uuid[] = restricted to listed jobs.

alter table public.profiles
  add column if not exists job_ids uuid[] default null;

create or replace function public.has_job_access(target_job_id uuid) returns boolean
  language sql stable
  security definer set search_path = public
  as $$
    select exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and (
          p.role = 'admin'
          or p.org_role = 'owner'
          or p.job_ids is null
          or target_job_id = any(p.job_ids)
        )
    )
  $$;

revoke execute on function public.has_job_access(uuid) from public, anon;
grant execute on function public.has_job_access(uuid) to authenticated, service_role;

-- When a member with restricted job_ids creates a new job, automatically grant
-- them access to that job before RLS WITH CHECK runs.
create or replace function public.grant_creator_job_access() returns trigger
  language plpgsql
  security definer set search_path = public
  as $$
begin
  if auth.uid() is not null then
    update public.profiles
    set job_ids = array_append(job_ids, new.id)
    where id = auth.uid()
      and job_ids is not null
      and not (new.id = any(job_ids));
  end if;
  return new;
end $$;

revoke execute on function public.grant_creator_job_access() from public, anon, authenticated;

drop trigger if exists job_creator_access on public.jobs;
create trigger job_creator_access before insert on public.jobs
  for each row execute function public.grant_creator_job_access();

drop policy if exists jobs_read on public.jobs;
create policy jobs_read on public.jobs for select to authenticated
  using (is_admin() or (org_id = my_org() and has_job_access(id)));

drop policy if exists jobs_write on public.jobs;
create policy jobs_write on public.jobs for all to authenticated
  using (
    is_admin()
    or (
      org_id = my_org()
      and my_org_role() in ('owner', 'member')
      and has_job_access(id)
    )
  )
  with check (
    is_admin()
    or (
      org_id = my_org()
      and my_org_role() in ('owner', 'member')
      and has_job_access(id)
    )
  );

drop policy if exists candidates_read on public.candidates;
create policy candidates_read on public.candidates for select to authenticated
  using (
    is_admin()
    or (
      org_id = my_org()
      and (job_id is null or has_job_access(job_id))
    )
  );

drop policy if exists candidates_write on public.candidates;
create policy candidates_write on public.candidates for all to authenticated
  using (
    is_admin()
    or (
      org_id = my_org()
      and my_org_role() in ('owner', 'member')
      and (job_id is null or has_job_access(job_id))
    )
  )
  with check (
    is_admin()
    or (
      org_id = my_org()
      and my_org_role() in ('owner', 'member')
      and (job_id is null or has_job_access(job_id))
    )
  );
