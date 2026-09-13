# Monovella — V0 Prototype

A clickable prototype of Monovella V0: the patient and expert app, Monovella's
own back office, and verified pharmacy and lab accounts, all in one React Router
app.

V0 itself ships as two clients (see `../../Product_Docs/PRODUCT_ARCH_V0.md`): an
Expo app for patient and expert, Android and iOS only, and a React Router v8 PWA
for the marketing site, back office and provider portal. This prototype covers
both in one place so every screen can be reviewed from one URL. `/app` is the
stand-in for the Expo app, not a plan to ship those screens on the web.

It is built directly from the product documents in `../../Product_Docs`:

| Document | What it decides here |
|---|---|
| `PRODUCT_SCREEN_V0.md` | Every screen and every state each screen must design for |
| `PRODUCT_BRAND.md` | Type, colour, elevation, motion, components — applied as tokens, not copied by eye |
| `openapi.json` v0.34.0 | The shape of every piece of data on screen |
| `PRODUCT_SPEC_V0.md` | What is in V0 at all, and the WCAG 2.2 AA commitment |
| `PRODUCT_ARCH_V0.md` | Naive-UTC timestamps, cursor pagination, the one-app route-group split |

## Running it

```bash
mise install       # node 24, pnpm, biome
mise run install   # prototype dependencies and Playwright browsers
mise run dev       # http://localhost:5173
```

Other tasks: `mise run build`, `mise run preview`, `mise run typecheck`,
`mise run lint`, `mise run format`, `mise run unit`, `mise run integration`,
`mise run e2e`, `mise run test`, `mise run check`, `mise run shots`.

## What's in it

- **`/`** — the landing page: Monovella's own public front door.
- **`/tour`** — the prototype tour: what Monovella is, and a way into each of
  the five seats.
- **`/screens`** — every screen from `PRODUCT_SCREEN_V0.md` with its ID, linked.
- **`/app`** — the patient/expert app (Expo in V0, shown here on the web).
  Patient by default; the pill in the top bar opens
  a drawer to switch to a dependant's record or to the account's own expert
  context (P0) — switching to Expert never changes the account holder's name.
- **`/console`** — Monovella's Back-Office Console (B1–B22). Navigation is a
  sidebar from `@4xl` up and a bottom tab bar below it — never a hamburger,
  because the counts on it are the thing a reviewer needs on screen at all times.
- **`/pharmacy`**, **`/lab`** — the Provider Portal (V1–V13), one set of
  components parameterised by `provider_type`, exactly as BO8 specifies.
- **`/verify/:code`** — the public, unauthenticated report check (P66).

## How it works

**No backend.** The prototype's data is a Postgres database, `public/prototype.pgdata`,
opened in the browser with PGlite (Postgres compiled to WebAssembly). It is a static
asset like any image: there is no server, and nothing is queried over a network.
Every row is shaped like the response `openapi.json` defines: `_kobo` integers,
naive-UTC timestamps, `null` where the API allows null. `app/data/types.ts`
mirrors the schemas; `app/data/selectors.ts` holds the read logic (including P19's
open loops, which the spec derives client-side from data already fetched rather
than from a new endpoint).

**One data model, one dialect.** `scripts/gen-prisma.ts` reads the fixtures and
writes `prisma/contract.prisma`; `mise run schema` plans that offline into
`prisma/postgres.sql`, with native enums, array columns and `timestamptz`. The
prototype runs that same DDL, so what you see on screen and what Monovella plans
to build in `PRODUCT_ARCH_V0.md` cannot drift into different shapes. Enum values
come from `Product_Docs/openapi.json`, and the generator lists the enum-shaped
columns the specification has not yet pinned down rather than inventing values
for them.

No production database has run this schema. PGlite proves the DDL is valid and
that the fixtures satisfy it; it says nothing about indexes, partitioning,
row-level security or retention, which the real build has to decide itself.

**The seed is a real integrity check.** `mise run seed` inserts every fixture row
into Postgres, so a reference to a consultation, patient or expert that does not
exist, or a status `openapi.json` does not permit, fails the seed with the
offending row named instead of surfacing as a surprise on one screen. `mise run dev` and `mise run build` reseed
first, so a fixture edit is never invisible in what is served.

**Actions really run.** Accepting a request, completing a checkout, cancelling a booking,
finalising a SOAP note, uploading a result: each mutates the in-memory dataset through
`app/store/prototype.tsx`, so a flow can be walked end to end. State is held in
`sessionStorage`; the reset control in the prototype bar restores the fixtures.
Completing signup and the patient-profile form creates a separate simulated
account, with an unverified patient record, empty care history and no expert
credentials or saved cards. The supplied directory and counterparties stay
available for the next booking. This is local demonstration state, not real
authentication or tenant isolation.

**A frozen clock that still ticks.** Fixtures are anchored to
2026-08-29T09:15:00Z so the story reads the same in six months. `app/lib/clock.ts`
returns that anchor plus however long the tab has been open, so response
deadlines and countdowns run live from it.

**Layouts respond to their frame, not the window.** The mobile app and the web
console both use CSS container queries, so switching Phone → Tablet in the
prototype bar reflows the layout rather than scaling it — and the same code is
what runs full-bleed on a real device.

**Every documented state is reachable, without a control on the page.** Where
`PRODUCT_SCREEN_V0.md` enumerates states — each `ConsultationStatus`, a 409
conflict, a rate limit, an empty list, a flagged document — the screen *declares*
them with a headless `<ScreenStates>` that renders nothing, and the switcher
appears in the prototype bar at the foot of the window. So a reviewer can reach
every state, and no page ever renders a control that isn't Monovella's.

## Regenerating the data

```bash
mise run db
```

That runs the three steps in order. `scripts/gen-fixtures.ts` writes every file in
`app/data/*.json` from one anchor date, so the cast, the timestamps and the
cross-references stay consistent. `scripts/gen-prisma.ts` regenerates both schemas
from those fixtures. `scripts/seed-db.ts` rebuilds `public/prototype.pgdata`.

Edit `scripts/gen-fixtures.ts`, never `app/data/*.json`, `prisma/postgres.sql`
or `prisma/contract.prisma` directly.

## Checks

Three test layers, the same shape `Product/api`, `Product/web` and
`Product/mobile` use. There is deliberately no load layer: those three have one
because they serve traffic, and this one never deploys and reads a WebAssembly
Postgres opened in the tab, so there is nothing to put load on.

- `mise run unit` — no browser, no database, nothing running. The clock
  contract (no route may read the host clock), the fixture relationships
  (checkout arithmetic, uniqueness, patient scoping, cross-references), the
  screen manifest against `PRODUCT_SCREEN_V0.md` in both directions, and the
  journey registry against `USER_JOURNEY.md`. Seconds.
- `mise run integration` — the real PGlite database. It applies the generated
  `prisma/postgres.sql` from nothing and checks that the guards actually bite:
  a dangling foreign key, a status outside its CHECK, a missing NOT NULL and a
  duplicate primary key are each rejected. Seeding proves a good row goes in;
  this proves a bad one stays out, which is a different claim.
- `mise run e2e` — Playwright. It starts and seeds its own dev server, and
  reuses one already running, so nothing needs to be open in another terminal.
  Two projects:
  - **journeys** — the sixteen scenarios of `USER_JOURNEY.md`, each test tagged
    `@happy` or `@sad`. `mise run e2e -- --grep @sad` runs every documented
    failure path.
  - **sweeps** — every declared screen state through the prototype bar; the
    320px WCAG 2.2 AA smoke test (reflow, target size, accessible names, label
    association, heading order, image alternatives); and the traceability check
    that every screen either declares its states or is recorded in
    `STATIC_BY_DESIGN` with a written reason.
- `mise run test` — all three, cheapest first.
- `mise run check` — lint, typecheck, build, then all three layers. This is the
  prototype's standing evidence, run on the current tree rather than recorded in
  a document that goes stale.
- `mise run shots` — captures every screen in the manifest at phone and desktop
  widths, in both themes, into `screenshots/`.

The accessibility sweep passes clean. It does not replace the
assistive-technology and device testing `PRODUCT_SPEC_V0.md` §10 commits to
before launch, and it cannot check colour contrast in situ or screen-reader
output.

### Reading the journey coverage

Every end-to-end journey declares which `USER_JOURNEY.md` checklist bullet it
walks. A reporter prints a per-scenario table on every run and writes
`tests/e2e/test-results/journey-coverage.json`:

```
  A  First-run activation and referral conversion   6/7  paths   6 happy   2 sad  (1 deferred)
  ...
  16 scenarios, 152 paths: 72 covered, 6 excused, 74 not yet covered.
```

It fails the run on three things: coverage falling below `COVERAGE_FLOOR`, so a
journey cannot be quietly deleted or left broken; a scenario walking no failure
path; and a scenario walking no honest path. Each of the last two can be
excused, in `tests/e2e/journeys.ts`, with a written reason.

It does **not** fail on a documented path that has no test yet. Those are
printed in full instead. Marking them "deferred" to turn the gate green would be
exactly the kind of claim this repository exists not to make: the list is the
gap, stated, and it is where the next journey to write comes from.

## Records kept here

`USER_JOURNEY.md` is a manual click-through script for demonstrating the
prototype, one scenario per user type. Its personas are constructed test data,
not customer evidence. It is the only document here that is not about how to run
the code: everything Monovella has actually decided lives in `../../Product_Docs`,
which stays authoritative and concise.

## What this prototype is not

- Not a backend, and not a validation of the API contract. It renders the shapes
  faithfully; it does not exercise them.
- Not a security or privacy implementation. There is no auth, no tenant
  isolation, no data minimisation — the sign-in screens are drawings of sign-in
  screens.
- Not evidence of demand. It shows what the product would be, not that anyone
  wants it.

## The cast is invented

Amara Okonkwo — patient, and, in her switchable expert context, a verified
dermatologist — GreenLife Pharmacy, Lagos Diagnostics and everyone else in
this data are fictional. No real patient, expert, pharmacy or lab appears
anywhere in it.
