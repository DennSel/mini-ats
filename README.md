# KandSys — a mini applicant tracking system (ATS)

KandSys is a small ATS for recruitment. An organisation posts its jobs, adds candidates with
profile details (LinkedIn URL, contact info, notes, interview booking) and follows every
candidate through a fixed six-stage pipeline on a compact kanban board with drag and drop.
The UI is in Swedish, desktop-first but usable on mobile.

The customer is an **organisation** with several users. A platform **admin** creates
organisations and their first owner; after that the owners invite their own colleagues. An
admin can also act on behalf of any customer by selecting the customer's organisation, and
everything an admin does happens inside that organisation's data.

## Status

The full UI is up and running, but it is backed by an **in-memory store with mock data** —
nothing is persisted yet. The Supabase backend (schema, row level security, auth and
persistence) is being wired in; see [Roadmap](#roadmap). Features that are not backed by a
real backend yet are hidden behind feature flags in the UI, not deleted.

The first commit of the UI-only mock version is kept and tagged, so the demo frontend is
always runnable: see [Try the mock version](#try-the-mock-version).

## Running the app

Prerequisites: [Bun](https://bun.sh) (use Bun — `npm install` is known to fail in this repo).

```sh
bun install
cp .env.example .env   # optional today; required once the Supabase backend is wired in
bun run dev            # dev server with the mock store
```

Other commands:

| Command             | What it does                                                 |
| ------------------- | ------------------------------------------------------------ |
| `bun run lint`      | ESLint + Prettier                                            |
| `bun run typecheck` | `tsc --noEmit`                                               |
| `bun run test`      | Vitest unit tests (the pure rules in `src/lib/ats-logic.ts`) |
| `bun run build`     | production build                                             |
| `bun run preview`   | serve the production build                                   |

### Try the mock version

```sh
git checkout mock-ui-v0
bun install
bun run dev
```

That tag is the frontend-only snapshot: the whole app runs on mock data with made-up logins,
no backend needed. The login page has demo buttons that fill in the credentials, and the full
list of fictional users (with their organisation roles) is in `src/lib/mock-data.ts` at that
tag. All accounts and data in it are invented; never reuse those passwords anywhere. Run
`git checkout main` to get back.

## Environment variables

Copy `.env.example` to `.env` (ignored by git). The app runs without them today; they become
required as the Supabase integration lands. Only public values ever live in files:

| Variable                        | Scope  | Purpose                                                              |
| ------------------------------- | ------ | -------------------------------------------------------------------- |
| `VITE_SUPABASE_URL`             | client | Supabase project URL (public)                                        |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | client | publishable key (public; access is restricted by row level security) |

The secret key (service role / `sb_secret_…`) bypasses row level security. It exists only in
Supabase and in Lovable's project settings — never on a local machine, in this repo, in code
or in a chat. If server functions ever need it, they read it from platform secrets at
runtime; it is never bundled into the client.

Secrets hygiene: before each commit, run `git status` and `git diff --staged` (no `.env`, no
unexpected `.gitignore` changes, no long key-like strings). Push protection is enabled on
GitHub. If a secret leaks anyway, rotate it in Supabase — create a new key, revoke the old
one — because removing it from the code is not enough; git history keeps it.

## Data model

Four entities; every row is scoped to an organisation (`org_id`), and access is enforced by
row level security in the target backend (tables `orgs`, `profiles`, `jobs`, `candidates`).

```
Organization 1─* User
Organization 1─* Job
Organization 1─* Candidate *─1 Job   (job_id nullable)
```

- **Organization** — `id`, `name`. The tenant that owns all its jobs, candidates and users.
- **User** (`profiles`) — `name`, `email`, platform role (`admin` or `customer`), organisation
  role, `orgId`. The mock also models per-member job access (`jobIds`: undefined = all jobs;
  owners and admins always see all); this is being simplified away with the backend.
- **Job** — `title`, `location`, `description`, `status` (`open`/`closed`), `createdAt`.
- **Candidate** — `name`, `email`, `phone`, LinkedIn URL, additional links (`label` + `url`),
  free-text note, optional interview time/link, `stage`, `createdAt`. A candidate belongs to
  one job, or to none (`job_id` null = the organisation's dormant pool, visible to the whole
  organisation). Within a kanban column the order is kept by a `position` value (double
  precision) so drag and drop survives persistence.

The pipeline has six fixed stages: **Ny, Screening, Intervju, Erbjudande, Anställd, Avslag**
(new, screening, interview, offer, hired, rejected). Stages are not configurable, and moving
a candidate to a different job restarts the candidate at "Ny".

### Roles and permissions

Platform admins can do everything. Customer users follow their organisation role:

| Permission                                                    | Owner | Recruiter | Reviewer | Viewer |
| ------------------------------------------------------------- | :---: | :-------: | :------: | :----: |
| Move candidates (drag, stage, notes, book interview)          |   ✓   |     ✓     |    ✓     |   —    |
| Manage candidates (create/edit/delete, links, job assignment) |   ✓   |     ✓     |    —     |   —    |
| Manage jobs (create/edit, open/close)                         |   ✓   |     ✓     |    —     |   —    |
| Manage team (invite/remove colleagues, set roles)             |   ✓   |     —     |    —     |   —    |

An organisation always keeps at least one owner. As the backend lands this model is narrowed
to three organisation roles — owner, member and reader — while recruiter/reviewer/job access
move to the extension list. Permission checks live in one place (`can()` in
`src/lib/ats-logic.ts`); the same rules are enforced again by row level security on the
server, since hiding something in the UI is never a permission.

## Assumptions

- The customer is an organisation with multiple users; the organisation owns its data and
  adds its own members. No open registration — only admins and owners create accounts.
- Scale is tens of jobs and hundreds of candidates per organisation, so filtering (by job
  and candidate name, in the board's `job` and `q` URL parameters) happens client-side and
  there is no pagination yet.
- Candidates are entered manually. There is no LinkedIn import; the profile URL is stored as
  a link.
- The pipeline is fixed at six stages, the same for every organisation.
- Swedish UI, desktop-first, usable on mobile.
- Unfinished features are hidden behind feature flags and listed in the roadmap, never
  silently deleted.

## Roadmap

1. Supabase schema (`orgs`, `profiles`, `jobs`, `candidates`) with row level security:
   an organisation's data is only visible and writable inside that organisation.
2. Real authentication (Supabase Auth, email + password); roles come from the profile;
   the mock logins and demo buttons are removed from the working tree.
3. Server-side account creation with the service role: admins create organisations and
   first owners; owners invite colleagues — always forced to the customer role and their own
   organisation, decided on the server, never by the UI.
4. Replace the in-memory store with Supabase queries behind the same `useAts()` interface.
5. Optional extension: AI-assisted CV screening — a server function that takes CV text plus
   the job description and returns validated JSON, rather than importing anything.

## Before going live (GDPR)

Not done yet — required before onboarding a first customer:

- **Region:** create the Supabase project in an EU region and verify data residency; sign a
  data processing agreement with the sub-processor.
- **Lawful basis and consent:** decide and document why candidate data is processed, and add
  a privacy notice to candidates (what is stored, purpose, retention, their rights).
- **Retention (gallring):** define and automate deletion/anonymisation, e.g. candidates
  removed a set time after a job is closed or their process ends — the dormant pool included.
- **Data subject rights:** a working routine for access/export and erasure requests,
  including deleting a whole organisation's data.
- **Minimisation:** the free-text note field must not become storage for special-category
  data; instruct users accordingly.
- **Access control:** verify that open sign-up is disabled in Supabase Auth and that row
  level security keeps organisations isolated (verified by tests, not by the UI).

## Tech stack

TanStack Start (SSR via Nitro), React 19, TanStack Router and Query, Tailwind CSS 4,
shadcn/ui, dnd-kit, react-hook-form + zod, Vitest. Bun as package manager; GitHub repo,
CI with GitHub Actions, hosting via Lovable Publish.
