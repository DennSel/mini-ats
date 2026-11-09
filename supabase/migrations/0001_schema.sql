-- 0001_schema.sql: enums, tables and indexes for KandSys (step 02).
-- Draft from docs/plan/02-schema.md plus candidates.created_by (UI sync 2026-11-08).

create type app_role as enum ('admin','customer');
create type org_role as enum ('owner','member','viewer');
create type job_status as enum ('open','closed');
create type stage as enum ('new','screening','interview','offer','hired','rejected');

create table orgs (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now());

create table profiles (
  id uuid primary key references auth.users on delete cascade,
  role app_role not null default 'customer',
  org_role org_role not null default 'member',
  org_id uuid references orgs on delete cascade,
  full_name text not null,
  email text not null,
  check ((role = 'admin') = (org_id is null)));

create table jobs (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references orgs on delete cascade,
  title text not null,
  location text not null default '',
  description text not null default '',
  status job_status not null default 'open',
  created_at timestamptz not null default now());

create table candidates (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references orgs on delete cascade,
  job_id uuid references jobs on delete set null,
  name text not null,
  email text not null default '',
  phone text not null default '',
  linkedin text not null default '',
  note text not null default '',
  links jsonb not null default '[]',
  interview_at timestamptz,
  interview_link text,
  stage stage not null default 'new',
  position double precision not null default 0,
  created_by uuid references profiles on delete set null,
  created_at timestamptz not null default now());

create index on jobs (org_id);
create index on candidates (org_id, job_id);
