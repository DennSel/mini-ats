-- 0005_resume_upload.sql: private resume (CV) uploads per organisation.
-- A private bucket with server-side limits (5 MB, PDF only). Objects are isolated
-- per organisation by RLS using the path convention <org_id>/<candidate_id>/cv.pdf.
-- The file name is fixed to cv.pdf so user-controlled names can never reshape the path.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('resumes', 'resumes', false, 5242880, array['application/pdf']::text[])
on conflict (id) do nothing;

alter table public.candidates
  add column if not exists resume_path text;

-- An upload path must point at a real candidate in that organisation, so a
-- member cannot upload into made-up paths even inside their own org folder.
create or replace function public.resume_candidate_ok(p_name text) returns boolean
  language sql stable
  security definer set search_path = public, storage
as $$
  select exists (
    select 1 from public.candidates c
    where c.org_id::text = (storage.foldername(p_name))[1]
      and c.id::text = (storage.foldername(p_name))[2]
  )
$$;

revoke execute on function public.resume_candidate_ok(text) from public, anon;
grant execute on function public.resume_candidate_ok(text) to authenticated, service_role;

-- Reading (list metadata, signed URLs) is allowed for everyone in the org that
-- owns the path; writing additionally requires owner/member and a valid candidate.
create policy resumes_read on storage.objects for select to authenticated
  using (
    bucket_id = 'resumes'
    and (
      is_admin()
      or (storage.foldername(name))[1] = my_org()::text
    )
  );

create policy resumes_write on storage.objects for all to authenticated
  using (
    bucket_id = 'resumes'
    and (
      is_admin()
      or (
        (storage.foldername(name))[1] = my_org()::text
        and my_org_role() in ('owner', 'member')
      )
    )
  )
  with check (
    bucket_id = 'resumes'
    and (
      is_admin()
      or (
        (storage.foldername(name))[1] = my_org()::text
        and my_org_role() in ('owner', 'member')
        and resume_candidate_ok(name)
      )
    )
  );

-- Cleanup: Supabase blocks direct deletes on storage.objects, so the app removes
-- files through the Storage API when a candidate is deleted and before an
-- organisation is deleted (see deleteCandidate/deleteOrg in the store). The
-- resumes_write policy above is what authorises those removals.
