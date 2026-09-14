# Monovella CEO Review Chat

Date: 2026-09-08

Purpose: Strategic review record for the connected-care vertical slice
Status: Complete with launch blockers

## Starting point

The review began after the product specification was consolidated into `docs/designs/monovella-connected-care-vertical-slice.md`. The standalone `Product_Docs/PRODUCT_SPEC.md` was removed so the design document is the single product reference.

The strategic question was whether Monovella should build a broad four-sided healthcare marketplace, a patient-owned care navigator, or a provider operating system.

## Market conclusion

The review found that Nigerian healthcare software already includes hospital- and facility-operated products spanning records, laboratory, pharmacy, billing, and administration. Monovella should not compete by recreating a hospital operating system.

Its wedge is a patient-owned, cross-provider care journey for a working adult who needs a verified specialist and the next clinical action completed without losing time, money, or clinical context.

## Product path selected

**Selected:** care-journey navigator with a lab-result spine.

The first build includes verified specialist booking, payment evidence, specialist-issued laboratory requests, partner-lab booking, result return to the patient and requesting specialist, and a coordinator exception queue. Pharmacy remains modeled but is activated only after the lab loop is proven.

## Review posture

**Selected:** hold scope.

The review did not expand the product. It focused on making the agreed pilot safe, testable, observable, and operationally credible.

## Decisions accepted

1. **Real-data gate:** use synthetic records and partner walkthroughs until legal, clinical, consent, and access-control approval permits real records, results, and payment collection.
2. **Partner reliability:** admit only partners that accept measurable targets for slot confirmation, lab booking confirmation, and result upload; escalate breaches through a coordinator queue.
3. **Critical results:** laboratories apply their own routine/critical classification; critical results trigger an auditable escalation to the requesting specialist and partner contact, with non-diagnostic patient messaging.
4. **Payment ownership:** the specialist or laboratory remains merchant for v1. Monovella stores immutable, verified payment evidence and opens a booking only after verification. Refunds remain partner-operated and are reconciled in Monovella.
5. **Journey ownership:** every active journey has one named Monovella operations owner; blocked states require an escalation deadline and ownership transfers are recorded.
6. **Notifications:** persist critical notification events, retry transient failures, and escalate unresolved critical notices to the exception queue.
7. **Clinical privacy:** store clinical files privately; authorize every access server-side or with short-lived, audience-bound links. Notifications carry no diagnosis, result, test name, or attachment.
8. **Pre-pilot validation:** run five scripted synthetic journeys covering normal flow, cancellations, failed payment verification, delayed confirmations, duplicate events, critical-result escalation, and notification retries.
9. **Rollout:** launch only to named partners and referred patients; independently gate real data, payments, lab booking, result upload, and notifications; retain a five-minute rollback procedure.
10. **State integrity:** define actor-owned state machines, reject invalid transitions, use idempotency keys for external events, and audit every transition.
11. **Authorization:** use patient-owned, journey-scoped grants with consent version, purpose, expiry/revocation, and clinical-access audit events.
12. **Operations visibility:** ship a dashboard for overdue handoffs, notification failures, payment mismatches, critical-result acknowledgements, and journey owners, plus a short runbook for each alert.

## Explicitly deferred

- Pharmacy fulfilment activation, live inventory, substitutions, controlled-drug workflows, and delivery dispatch.
- Monovella-held funds, provider settlement, commissions, and automatic refunds.
- Hospital EHR/LIS integrations, insurance adjudication, clinical triage, and public-marketplace acquisition.

## Launch blockers

1. Final Nigerian legal requirements and approved consent wording for live records.
2. Exact response-time commitments from the first verified partner cohort.

## Next review

An engineering review is required before implementation. It should convert these product decisions into data boundaries, permissions, payment verification, state transitions, failure handling, and test coverage.

## Primary artifact

- `docs/designs/monovella-connected-care-vertical-slice.md`
