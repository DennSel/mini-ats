<!-- LOVABLE:BEGIN -->

> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.

<!-- LOVABLE:END -->

## Architecture

- All app data lives in an in-memory React context (`src/lib/ats-store.tsx`) seeded from `src/lib/mock-data.ts`; pure rules live in `src/lib/ats-logic.ts` so they can be unit-tested. Why: step 1 is UI-only, a backend replaces the store later.
- Authenticated pages sit under the pathless `_app` layout, which redirects to /login when no user is set. Why: one guard for every signed-in page.
- Colors are design tokens in `src/styles.css` (`:root` light, `.dark` dark default); components never hardcode colors. Why: both themes must share identical components.
- Permissions are checked only via `can(user, permission)` in `src/lib/ats-logic.ts` (exposed as `can` on the store); UI hides/disables actions with it. Why: one place to change role rules when a backend arrives.
- Job access per member: `User.jobIds` (undefined = all; owners/admins always all), applied only via `visibleJobs`/`visibleCandidates` in `ats-logic.ts`, exposed as `orgJobs`/`orgCandidates` on the store. Why: pages never filter by job access themselves.

## Conventions

- Code comments are always written in English. UI copy, labels, aria-labels and other user-facing strings stay in Swedish (the product language).
