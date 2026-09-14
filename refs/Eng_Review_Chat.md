# Engineering Review Chat — Monovella

Date: 2026-09-08
Review target: `docs/designs/monovella-connected-care-vertical-slice.md`
Outcome: lab-first foundation engineering plan approved.

## Scope

The first build covers the canonical Care Journey, consent/audit, verified
specialist booking, provider-direct payment, specialist lab request, verified
lab booking, and released-result delivery. Pharmacy is modelled but not activated.

## Approved engineering decisions

- React Router plus a modular FastAPI monolith; PostgreSQL is the authoritative
  transactional store.
- RustFS holds private S3-compatible clinical attachments; Redis is limited to
  TTL-bound public cache, rate limits, and best-effort UI fan-out.
- Care Journey grants are purpose-specific, versioned, revocable, audited, and
  assigned to named active staff memberships, never an organization broadly.
- Named server-side state-transition commands enforce actor/predecessor checks,
  locking/versioning, idempotency, audit, and transactional outbox writes.
- PostgreSQL slot holds are authoritative, linked to payment attempts, expire,
  and create coordinator remediation for late paid holds.
- Providers are merchants for v1. Webhooks are verified and reconciled; provider
  refunds and partial refunds are recorded but never initiated by Monovella.
- Lab result draft and authorized release are separate. Critical handoffs need
  acknowledgement, deadline, retry, fallback contact, and coordinator alert.
- Verification expiry, suspension, organization deactivation, or staff removal
  immediately revokes clinical access unless a narrow continuity exception exists.
- Notifications use fixed non-clinical templates. Files are validated, scanned,
  forced to download by default, and safely previewed only on an isolated origin.
- Audit storage is database-enforced append-only. An operations exception queue
  tracks deadline-bound partner, payment, result, and escalation failures.
- Server-side cohort capability gates control real data, payment, lab booking,
  result release, and notifications, with a five-minute rollback runbook.

## Test strategy

- PostgreSQL-backed pytest integration tests for commands, concurrency, and state.
- Frontend unit/component tests and Playwright end-to-end patient/provider flows.
- Payment and RustFS contract tests; security tests for access, audit, messages,
  attachments, capacity hold expiry, and critical-result escalation.

## External review

Claude CLI was available but full review requests exceeded the chat capture
window. The user supplied two independent review outputs. Every actionable
finding was accepted and incorporated. The reported missing product-spec file
was resolved after the specification was consolidated into the design document;
the obsolete plan reference was replaced.

## Artifacts

- `docs/plans/monovella-foundation-engineering-plan.md`
- `TODOS.md`
- `~/.gstack/projects/monovella-mvp/abdulazeezoj-main-eng-review-test-plan-20260908-153600.md`
- `~/.gstack/projects/monovella-mvp/tasks-eng-review-20260908-154100.jsonl`
- `~/.gstack/projects/monovella-mvp/tasks-eng-review-outside-20260908-160500.jsonl`

## Remaining launch prerequisites

1. Nigerian legal, privacy, and clinical-operating approval before live care.
2. Initial partner SLAs for availability, booking response, result release,
   critical-result escalation, and fallback contacts.

## Next step

Implement the engineering plan in task order, beginning with PostgreSQL schema,
access/audit foundation, and the coordinator exception queue.
