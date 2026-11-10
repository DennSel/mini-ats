# KandSys — a mini applicant tracking system (ATS)

KandSys is a small ATS for recruitment. An organisation posts its jobs, adds candidates with
profile details (LinkedIn URL, contact info, notes, interview booking) and follows every
candidate through a fixed six-stage pipeline on a compact kanban board with drag and drop.
The UI is in Swedish, desktop-first but usable on mobile.

The customer is an **organisation** with several users. A platform **admin** creates
organisations and their first owner; after that the owners invite their own colleagues. An
admin can also act on behalf of any customer by selecting the customer's organisation, and
everything an admin does happens inside that organisation's data.

## Architecture & status

The application runs on **TanStack Start (React 19 + Nitro SSR)** backed by **Supabase (PostgreSQL, Row Level Security and Supabase Auth)**:

- **Multi-tenant isolation in the database:** Every row in `orgs`, `profiles`, `jobs` and `candidates` is scoped to an organisation (`org_id`) and protected by PostgreSQL Row Level Security (`supabase/migrations/0001_schema.sql`–`0003_harden_rls_functions.sql`), verified by 10 automated pgTAP tests (`supabase/tests/rls.test.sql`).
- **Authentication & server-side account creation:** Open sign-ups are disabled. Users sign in with email and password via Supabase Auth (`src/lib/auth.ts`). Creating new accounts goes through a TanStack Start server function (`src/lib/users.functions.ts`) that verifies the caller's JWT and profile, validates permissions with the pure `decideCreateUser` rule (`src/lib/create-user-rules.ts`), creates the account using `SUPABASE_SERVICE_ROLE_KEY` on the server, and rolls back if profile creation fails.
- **Data layer & optimistic kanban:** `src/lib/ats-store.tsx` uses TanStack Query (`useQuery` / `useMutation`) behind the `useAts()` interface. Kanban card order is persisted via a `double precision` `position` column (`src/lib/position.ts`) with midpoint calculation, automatic column renumbering when gaps drop below `0.000001`, and optimistic drag-and-drop updates with rollback on error.
- **Feature flags:** UI elements that are planned as future extensions (editing/deleting users, changing a colleague's role, per-job access restriction) are hidden behind explicit flags in `src/lib/features.ts`, not deleted.

The initial UI-only mock version is preserved on a git tag so the standalone frontend snapshot remains runnable at any time: see [Try the mock version](#try-the-mock-version).

## Running the app

Prerequisites: [Bun](https://bun.sh) (use Bun — `npm install` is known to fail in this repo).

```sh
bun install
cp .env.example .env   # fill in VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY
bun run dev
```

Other commands:

| Command             | What it does                                                               |
| ------------------- | -------------------------------------------------------------------------- |
| `bun run lint`      | ESLint + Prettier                                                          |
| `bun run typecheck` | `tsc --noEmit`                                                             |
| `bun run test`      | Vitest unit tests (permissions, position math, `decideCreateUser`, drafts) |
| `bun run test:db`   | pgTAP row level security tests against local Supabase (`supabase test db`) |
| `bun run build`     | production build                                                           |
| `bun run preview`   | serve the production build                                                 |

To load the demo organisations (`Nordvik Tech AB` and `Solberg Logistik`), jobs and candidates into Supabase, run `supabase/seed.sql` in the Supabase Dashboard SQL Editor (safe to run multiple times).

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

Copy `.env.example` to `.env` (ignored by git). Only public values ever live in `.env` files on disk:

| Variable                        | Scope       | Purpose                                                                                                  |
| ------------------------------- | ----------- | -------------------------------------------------------------------------------------------------------- |
| `VITE_SUPABASE_URL`             | client      | Supabase project URL (public)                                                                            |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | client      | publishable / anon key (public; access is restricted by RLS)                                             |
| `SUPABASE_SERVICE_ROLE_KEY`     | server-only | used only in `src/lib/users.functions.ts` via platform runtime secret (`SB_SERVICE_ROLE_KEY` on Lovable) |

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
  role (`owner`, `member`, `viewer`), `orgId`.
- **Job** — `title`, `location`, `description`, `status` (`open`/`closed`), `createdAt`.
- **Candidate** — `name`, `email`, `phone`, LinkedIn URL, additional links (`label` + `url`),
  free-text note, optional interview time/link, optional `resumePath` (private Storage path, e.g. `<org_id>/<candidate_id>/cv.pdf`), `stage`, `position`, `createdBy`, `createdAt`.
  A candidate belongs to one job, or to none (`job_id` null = the organisation's dormant pool,
  visible to the whole organisation). Within a kanban column the order is kept by a `position`
  value (`double precision`) so drag and drop survives persistence.

The pipeline has six fixed stages: **Ny, Screening, Intervju, Erbjudande, Anställd, Avslag**
(new, screening, interview, offer, hired, rejected). Stages are not configurable, and moving
a candidate to a different job restarts the candidate at "Ny".

### Roles and permissions

Platform admins (`role = 'admin'`) can do everything across all organisations. Customer users
(`role = 'customer'`) follow their organisation role (`org_role`):

| Permission                                                    | Owner | Member | Viewer |
| ------------------------------------------------------------- | :---: | :----: | :----: |
| Move candidates (drag, stage, notes, book interview)          |   ✓   |   ✓    |   —    |
| Manage candidates (create/edit/delete, links, job assignment) |   ✓   |   ✓    |   —    |
| Manage jobs (create/edit, open/close)                         |   ✓   |   ✓    |   —    |
| Invite colleagues (`createUser` server function)              |   ✓   |   —    |   —    |

Permission checks live in one place on the client (`can()` in `src/lib/ats-logic.ts`) and are
enforced independently in PostgreSQL Row Level Security (`supabase/migrations/0002_rls.sql`)
and in `decideCreateUser` (`src/lib/create-user-rules.ts`), since hiding something in the UI is
never a permission.

## Assumptions

- The customer is an organisation with multiple users; the organisation owns its data and
  adds its own members. No open registration — only admins and owners create accounts.
- Account creation (`createUser`) sets a temporary password with `email_confirm: true` via the
  Supabase Admin API instead of sending confirmation emails, so demo and review accounts can
  sign in immediately without an SMTP setup or real inbox.
- Scale is tens of jobs and hundreds of candidates per organisation, so filtering (by job
  and candidate name, in the board's `job` and `q` URL parameters) happens client-side and
  there is no pagination yet.
- Candidates are entered manually. There is no LinkedIn import; the profile URL is stored as
  a link.
- The pipeline is fixed at six stages, the same for every organisation.
- Swedish UI, desktop-first, usable on mobile.
- Unfinished features are hidden behind feature flags (`src/lib/features.ts`) and listed in
  the roadmap, never silently deleted.

## How it was built

### Toolchain

- **Google Stitch:** Early visual exploration to set the layout feel, typography and dense kanban proportions.
- **Lovable:** Built the interactive React + TanStack Start UI skeleton against an in-memory store (`mock-ui-v0`) and iterated on mobile navigation and candidate drafts.
- **Chat AI:** Used to challenge scope, narrow the role model to what could be enforced end-to-end in RLS, and structure the step-by-step backend plan before writing migration code.
- **Coding agents (Claude Code & Antigravity):** Implemented the PostgreSQL schema, RLS policies and triggers, pgTAP database tests, Vitest unit tests, TanStack Query data layer, and the `createUser` server function, with human diff review before every commit and manual SQL execution in the Supabase Dashboard (no `supabase login` token or service-role key ever stored on disk).

### Three lessons learned

1. **Explicit table grants vs. RLS policies when `auto_expose` is disabled:** Disabling automatic Data API exposure in Supabase meant RLS policies alone were not enough — explicit `GRANT` statements were required, and an initial AI draft only granted `SELECT` on `orgs` to `authenticated`, which would have blocked platform admins from creating organisations. Running Supabase Security Advisor also caught that `SECURITY DEFINER` helper and trigger functions needed explicit `REVOKE EXECUTE FROM public, anon` (`0003_harden_rls_functions.sql`).
2. **Mutating the database tests to prove they can fail:** In the pgTAP test suite (`supabase/tests/rls.test.sql`), an initial privilege-escalation test (`update profiles set role = 'admin'`) looked green only because RLS blocked the row; when we temporarily opened a permissive `UPDATE` policy to verify the test would fail, PostgreSQL rejected the query on the table's `CHECK ((role = 'admin') = (org_id is null))` constraint instead of testing role escalation. Updating the test to also set `org_id = null` made the mutation check fail as intended before restoring the strict policy.
3. **SSR/client bundler boundaries and browser Web Locks:** Two subtle runtime issues surfaced when wiring real auth: `@tanstack/start-plugin-core` excluded `@tanstack/react-router` from Vite's dependency optimizer, leaving its transitive CommonJS dependency `use-sync-external-store/shim/with-selector` unbundled on cold loads of `/`, and awaiting `loadUser()` directly inside Supabase's `onAuthStateChange` risked deadlocking `navigator.locks`. Inspecting the page via headless Edge CDP pinpointed the CJS `SyntaxError` immediately (`vite.optimizeDeps.include`), and deferring `loadUser()` with `setTimeout(..., 0)` plus an 8-second timeout kept auth initialization resilient.

## Future extensions

1. **AI-assisted CV screening:** A server function that takes pasted CV text plus the job description and returns validated structured JSON (summary, strengths, gaps, suggested interview questions).
2. **Account lifecycle & granular roles:** Editing/removing team members (`FEATURES.editUser`, `FEATURES.deleteUser`, `FEATURES.changeMemberRole`, `FEATURES.removeMember`) and per-job access restrictions (`FEATURES.jobAccessRestriction`) backed by a `job_members` table.

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
- **Access control & onboarding:** verify that open sign-up is disabled in Supabase Auth, that
  row level security keeps organisations isolated (verified by tests, not by the UI), and
  replace the demo temporary-password creation (`email_confirm: true`) with an email
  invitation flow (`auth.admin.inviteUserByEmail`) or forced password change on first login.
- **Resume and CV storage:** CVs are stored in a private Supabase Storage bucket (`resumes`, max 5 MB, PDF only) with RLS enforcing organisation boundaries. Signed URLs expire after 60 seconds, and files are cleaned up on candidate and organisation deletion. Before production, ensure explicit candidate consent is gathered for CV storage and define an automated purge policy for old files.

## Tech stack

TanStack Start (SSR via Nitro), React 19, TanStack Router and Query, Tailwind CSS 4,
shadcn/ui, dnd-kit, react-hook-form + zod, Vitest. Bun as package manager; GitHub repo,
CI with GitHub Actions, hosting via Lovable Publish.
