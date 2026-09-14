# Identity, Access, and Vendor Risk

The risks in this file live above any single code change or PR — they're about who and what has standing access to the company's systems and data, reviewed periodically rather than checked once and forgotten.

## Least-privilege access review

Periodically review (not just at setup): who has access to what, whether that access is still needed for their current role, and whether it's scoped as narrowly as the role actually requires. A person who needed admin access for a one-time task and never had it revoked is a standing, silent risk — the access wasn't wrong when granted, it's wrong that it's still there.

Specific things worth checking directly rather than assuming are fine: shared/generic logins (a single "admin" account multiple people use — untraceable to an individual and impossible to revoke for just one person), access granted "temporarily" with no actual expiry or review date, and service accounts/API keys with broader scope than the integration they're for actually needs.

## Onboarding — least privilege from day one

Most over-privileged access was never granted by mistake; it was granted on someone's first day because nobody had written down what the role needed, so they got what the last person had. The trigger for provisioning is `ops-team`'s onboarding plan (its `/onboard`), which names what the new person needs to do their job; this skill's job is to turn that into the narrowest access that lets them do it, and to make sure it happens only after `legal-team` confirms the agreement (with its IP assignment and confidentiality terms) is signed. No signed paperwork, no access — a contributor working from a verbal arrangement inside the repository is a legal and a security gap at once.

For each new person:

- **Start from the role, not from a peer.** Provision against the list of systems the onboarding plan says the role touches, at the lowest level that works (read before write, a scoped role before admin). "Same as X" copies X's accumulated exceptions.
- **Individual accounts, always.** No sharing a login to save a seat — it's untraceable and can't be revoked for one person later.
- **MFA before first login to anything that matters**, and enrollment in the password manager as part of day one, not a later reminder.
- **Anything elevated gets an expiry.** If the role genuinely needs admin for a setup task, grant it with a written review date and take it back when the task is done.
- **Record what was granted, where, and why**, in the same place the offboarding checklist reads from — offboarding is only as complete as the record of what was provisioned. Add the person to the periodic access review from the start.

## Offboarding — a genuine, recurring gap

Any time someone leaves — an employee, a contractor, or an equity-based collaborator whose engagement ends — their access needs to be revoked across every system they touched: code repositories, cloud accounts, shared drives, email/communication tools, any admin panels, and API keys or credentials they held or generated. This should be a checklist run at the time of departure, not something caught later during an unrelated audit. Coordinate with `legal-team`'s handling of the same departure from the employment/contractor-agreement side — the legal end of the relationship and the access end of it should close together, not on different timelines.

## Vendor and third-party security due diligence

Before integrating a new tool, API, or vendor that will touch company or user data, establish:

- **What data it can actually access** — the real scope, not the minimum the integration could theoretically use. A tool given broad API scope "in case it's needed later" is broader access than it needs, by default.
- **Where that data goes and is stored** — which region, whether it's used to train the vendor's own models (relevant specifically for AI tool integrations), and how long it's retained.
- **The vendor's own security posture** — do they publish a security page, hold a relevant certification (SOC 2, ISO 27001) appropriate to what they're handling, and have a track record without major unaddressed incidents.
- **The legal instrument needed** — a Data Processing Agreement is required under frameworks like the NDPA for any processor touching personal data on the company's behalf; that's `legal-team`'s document to put in place, but this skill's job to flag that it's needed before the integration goes live, not after.

Scale the depth of this review to what the vendor can actually reach — a vendor integrated only with anonymized, non-sensitive data warrants a lighter check than one with access to user health records or payment data.

**This skill's `/vendor` versus `ops-team`'s `/vendor-ops`.** They answer different questions about the same vendor. `/vendor` is the pre-integration gate: should this be connected at all, with what scope, and what has to be in place first (DPA, key scoping, where the data lands). It ends with a proceed / conditions / don't-integrate call. `/vendor-ops` is the ongoing relationship once it's live: contract renewals, SLAs, performance, cost, and day-to-day coordination — including suppliers that never touch data at all. Route back here, not to `/vendor-ops`, when the relationship changes in a way that changes the risk: the vendor asks for broader access, adds an AI/model-training use of data, has a public incident, changes region or ownership, or gets swapped for a different provider. A vendor review is a point-in-time judgment; a material change resets it.

## Secrets management strategy (org level)

Beyond `dev-team`'s per-commit secrets scanning (catching a secret before it enters git history), the org-level question is broader: are secrets stored in a real secrets manager (not scattered across `.env` files, chat messages, or shared documents), is there a rotation policy for anything long-lived (API keys, service credentials), and is access to the secrets manager itself scoped per person/service rather than one shared vault everyone can read everything from. A leaked secret that's rotated within hours is a non-event; the same leak against a credential nobody's rotated in two years is a real incident waiting to be discovered by someone else first.
