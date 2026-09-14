# Monovella Design Review Chat

Date: 2026-09-08  
Review target: `docs/designs/monovella-connected-care-vertical-slice.md` and
`docs/plans/monovella-foundation-engineering-plan.md`  
Outcome: design review completed; engineering re-review completed

## Starting point

The approved product design defined a safe, invite-only connected-care vertical
slice. The engineering plan defined the modular-monolith, data, authorization,
payment, result-safety, and operational controls. The review found that the
system behavior was specified more clearly than the user experience.

Initial design-completeness score: 4/10.

Existing assets included Monovella brand marks and the approved palette. There
was no `DESIGN.md`, web implementation, or reusable UI component system.
The local visual-mockup generator was unavailable, so the review proceeded
text-first rather than generating visual variants.

## Decisions accepted

The user selected **A** for every design decision.

1. **Shared Care Journey architecture**
   - Role-specific hubs remain focused on daily work: **My care**, **Today**,
     **Work queue**, and **Exceptions**.
   - Selecting work opens one permission-aware Care Journey workspace rather
     than a collection of disconnected object pages.

2. **Persistent next-action state**
   - Every journey shows what is happening, who owns the next action, expected
     timing where available, and a safe action the viewer may take.
   - Delayed, blocked, failed, and escalated work gets visible recovery copy,
     not color-only status badges.

3. **Critical-result trust boundary**
   - Patient communication remains calm and non-diagnostic, with a safe support
     route.
   - The requesting specialist and operations team receive the urgent,
     acknowledgement-driven escalation workflow.

4. **Visual direction**
   - Monovella uses a warm editorial care-navigator direction.
   - Warm paper and ink support reading; deep teal supports structural emphasis;
     clay is reserved for meaningful attention or action.

5. **Design-system governance**
   - A compact repository-level `DESIGN.md` is the source of truth for visual
     foundations, responsive behavior, accessibility, components, and
     patient-facing content boundaries.

6. **Responsive priority**
   - Patient flows are mobile-first and work at 320px and above.
   - Specialist, laboratory, and operations workspaces remain responsive but
     use desktop space for high-density queues and document work.

7. **Invite-only entry**
   - Patients enter through a branded referral invitation link or access code,
     then verify identity, create an account, receive a Monovella ID, and give
     required consent before discovery or journey access.

## Design-review outputs

- Added `DESIGN.md`.
- Added T16 to the engineering plan for the experience foundation.
- Added a design-review task artifact under `~/.gstack/projects/monovella-mvp/`.
- Updated the engineering plan’s review report.
- Final design-completeness score: 9/10.

## Follow-on engineering re-review

The design changes were revalidated against architecture. The user again
selected **A** for each recommendation.

1. Add an authoritative PostgreSQL referral-invitation aggregate and atomic
   redemption command.
2. Add a server-owned, permission-aware `JourneyWorkspaceView` projection.
3. Add a versioned server-owned journey-presentation policy for state copy and
   allowed actions.
4. Add viewport-specific Playwright and accessibility coverage for patient and
   partner workspaces.
5. Treat Redis UI Pub/Sub as a payload-free refetch hint, with PostgreSQL-backed
   workspace revalidation on focus, reconnect, and bounded polling.

These produced T17 through T21 and an updated QA test-plan artifact.

## Design-consultation re-review (2026-09-08, later same day)

Ran `/design-consultation` against the existing, approved `DESIGN.md` to
check it for completeness rather than re-litigate the direction.

### Starting point

`DESIGN.md` was structurally sound (9/10 from the design review above) but
several sections were left as placeholders: typography named no actual
fonts ("a readable system sans-serif stack"), color had no muted text,
border, hover, or full semantic set, and motion, radius, and a dark-mode
call were unspecified entirely. Aside wasn't available on this Linux
session; competitive research ran through WebSearch instead, and confirmed
the existing warm/editorial direction is ahead of, not behind, where 2026
healthcare UI trends are heading (away from clinical blue toward "earthy
minimalism").

### Decisions accepted

The user selected **A** ("Ship it") for every proposal.

1. **Aesthetic, palette, layout, principles, invite-only entry** — confirmed
   unchanged. No completeness gap found here.
2. **Typography** — Fraunces (display/hero only), Source Sans 3 (body/UI/
   labels), JetBrains Mono (data/tables, tabular figures). Fraunces is a
   deliberate risk: a literary serif tied to the "one whole health story"
   brand narrative, breaking from the all-sans convention most telemedicine
   products default to.
3. **Color** — kept the brand-locked tokens (`surface-canvas`,
   `text-primary`, `action-primary`, `attention`, `surface-raised`) exactly
   as approved; added `text-muted`, `border-subtle`, `border-strong`,
   `action-primary-hover`, `success`, `warning`, and `critical-staff`
   (staff-only, never patient-facing, per the existing critical-result
   trust boundary).
4. **Motion** — minimal-functional only, strict `prefers-reduced-motion`
   compliance.
5. **Radius and elevation** — soft-but-not-bubbly scale (6/10/16/9999px),
   flat cards by default.
6. **Dark mode** — deferred for v1 as a deliberate scope cut, not an
   oversight; the token structure supports adding it later.

### Design-consultation outputs

- Updated `DESIGN.md` with the completed typography, color, motion, radius,
  and spacing-density sections, plus a Decisions Log.
- Updated `AGENTS.md` to point at `DESIGN.md` as the source of truth for
  visual and UI decisions.
- Published a design-system preview Artifact (fonts, colors, components,
  and three real screens: patient "My care" hub, invite-only entry,
  specialist/ops work queue) for visual sign-off before writing the file.
- Committed as `9935cd7` — `docs(design): complete design system
  typography, color, and motion tokens`.

## Review status

CEO, engineering, and design reviews are recorded as clean, and the
`/design-consultation` completeness re-review found no gaps requiring a
direction change — only placeholders to fill in. The product is ready for
implementation planning, but real clinical data remains blocked by the
separately tracked legal, clinical, consent, access-control, and partner
service-level launch gates.
