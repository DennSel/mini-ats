# Mini-ATS steg 1 – full UI med mockdata

Svensk UI, ingen backend. Följer design.md (tokens, effekter, avsnitt 5) och de mörka referensbilderna. Inget från "Ta bort"-listan byggs.

## Teman och design
- Exakt de färgkoder som står i design.md (inga egna färger) läggs in i `src/styles.css`: `:root` = ljust, `.dark` = mörkt (standard). Extra tokens: surface-lowest/low/high/highest, text-faint, primary-container, accent-2, accent-3, pink, success, error, sex kolumnfärger, gradienterna och glöd-skuggorna enligt design.md.
- Typsnitt Plus Jakarta Sans, Inter, JetBrains Mono via `<link>` i root.
- Utilities: glas-panel, primär gradientknapp med glöd, ambient bakgrundscirklar.
- Tema-växlare i profilmenyn, sparas i localStorage (try/catch); script i head undviker blink.

## Data
- `src/lib/mock-data.ts`: 1 admin, 2 kunder i 2 organisationer, 3 jobb/org, ~12 kandidater/org över sex stadier.
- `src/lib/ats-store.tsx`: React context med inloggad användare, vald org (admin), CRUD för jobb, kandidater, användare, organisationer. Nollställs vid omladdning.

## Routes
- `/` → `/board` eller `/login`. `/login`. Skyddad layout `_app` (pathless, renderar Outlet) med sidebar, kundbanner (admin) och mobil toppbar med slide-in-meny.
- `/jobs`, `/board` (search params `job`, `q` via zod-adapter), `/admin` (icke-admin omdirigeras till `/board`). Admin hamnar på `/admin` efter inloggning, kund på `/board`.

## Skärmar (enligt avsnitt 5)
- Login: glaskort, visa/dölj lösenord, svenska fel, demo-snabbknappar Admin/Kund.
- Jobb: räknar-pill, Skapa nytt jobb, segment Alla/Öppna/Stängda + sök, tabell → kort på mobil, dialog med radiokort, Visa på tavlan.
- Tavla: verktygsrad (jobb, debounced namnsök, Rensa, Lägg till kandidat), sex färgkodade kolumner, kompakta kort, dnd-kit inom/mellan kolumner, Flytta till-meny, sidopanel med stadieväljare, redigerbar anteckning, Redigera och Radera (bekräftelse). Mobil: horisontell snap-scroll ~85 % bredd.
- Admin: flikar Användare/Organisationer + sök, tabell/kort, formulär Skapa användare med befintlig eller ny organisation.

## Tekniskt
- Installera react-hook-form, zod, @hookform/resolvers, @tanstack/zod-adapter, @dnd-kit/core, @dnd-kit/sortable, @dnd-kit/utilities, och shadcn-komponenter som behövs (dialog, sheet, dropdown-menu, select, alert-dialog, input, textarea, button, sonner).
- Komponenter per skärm under `src/components/{layout,login,jobs,board,admin}`.
- Unika head()-metadata per route. Små tester för regler: admin-skydd, filtrering per org, stadieflytt.
