# Incident Response

## The practical operational playbook

Regardless of which formal framework version is cited, the operational shape responders actually use is consistent, and worth having ready before it's needed:

1. **Preparation** — before anything happens: who's the responder (even if it's one person for a small team), how to reach them, where logs/alerts actually live, and a basic communication plan (who gets told, and what, at each stage).
2. **Detection and analysis** — something looks wrong. Confirm it's real before treating it as an incident (alert fatigue and false positives are real), then scope it: what's affected, since when, and what's the realistic worst case if it's not contained now. Track everything as **confirmed**, **suspected**, or **unknown** explicitly — don't let a plausible guess get treated as a confirmed fact partway through the writeup.
3. **Containment and eradication** — stop the damage from spreading (revoke a compromised credential, isolate an affected system, block an exploited path) before pursuing full root cause. A fast, imperfect containment beats a slow, perfect one — the damage compounds while the incident is uncontained.
4. **Recovery** — restore affected systems/data to a known-good state, verify the actual vulnerability or exposure is closed (not just the symptom), and confirm normal operation before standing down.
5. **Post-incident review** — a blameless writeup: what happened, the timeline, what worked, what didn't, and concrete follow-up actions with owners. The point is closing the gap that allowed it, not assigning fault — a review that produces blame instead of fixes teaches people to hide problems next time, not to report them faster.

## A note on frameworks, so this doesn't go stale

This operational shape maps to NIST SP 800-61's long-standing four-phase model (Preparation; Detection & Analysis; Containment/Eradication/Recovery; Post-Incident Activity) from Revision 2 — which remained the de facto shared vocabulary across the security industry for over a decade. NIST withdrew Revision 2 in April 2025 and replaced it with Revision 3, which restructures incident response around the six functions of the NIST Cybersecurity Framework 2.0 (Govern, Identify, Protect, Detect, Respond, Recover) as a continuous risk-management activity rather than a strictly linear cycle. For a small team, the practical playbook above still covers the real work — but if incident response is being formally documented against NIST for a compliance or contractual reason, reference the current Rev. 3 / CSF 2.0 structure explicitly rather than citing the older four-phase model as current.

## Keeping this playbook and dev-team's /operate runbook in sync

The playbook above says *when* to act; `dev-team`'s `/operate` runbook says *how*. Deploy, roll back, restore from backup, and rotate a secret are the runbook's steps, written and tested by the people who run the system; this playbook names the moment each one is invoked (a bad release → roll back; a leaked credential → rotate; data corruption or a compromised host → restore to a known-good point; a hotfix that closes the exploited path → deploy). Don't duplicate the mechanics here — a second copy of "how to rotate the database password" drifts from the real one within a month and is the one someone follows at 2am.

What sync actually means in practice:

- **Every containment or recovery action in this playbook points at a named runbook step**, and every runbook step that matters in an incident (rotate, roll back, restore) is referenced from here. If the playbook needs an action the runbook doesn't have, that's a finding for `dev-team`, raised before an incident, not discovered during one.
- **Re-check the pairing whenever either side changes** — a new deploy pipeline, a new secrets manager, a new backup target, or a revised playbook step. Both files should name the same systems.
- **Exercise them together.** A tabletop that walks a plausible incident through both documents (this one for decisions, the runbook for commands) is the cheapest way to find the step that exists on paper but not in reality — a restore that has never been run is the usual one.
- **Preserve evidence before the runbook step runs.** Rolling back or rebuilding a host is the right containment move and also destroys what was on it; capture logs and a snapshot first where the risk allows it (see Evidence preservation below).

## Guardrails for an automated first-line support bot

`ops-team`'s `/support` sets up automated first-line support with human escalation; this skill sets the limits on what that layer may do, because a support bot is an internet-facing component that talks to strangers and holds a key to customer data — treat it as such in the threat model (prompt injection through a customer message is user input crossing a trust boundary, per `references/threat-modeling.md`). Before it goes live, and again whenever its access grows:

- **Access is read-mostly and scoped to the asking customer.** It may look up the requester's own account and order or ticket status; it may not read other customers' records, export data, or reach internal admin tools. Any write it can perform (a refund, a plan change, an address change, an account deletion) is either behind a human approval step or hard-limited in size and rate, with a fresh identity check before anything account-changing.
- **No secrets in reach.** Its credentials are its own, least-privilege service account, not a founder's login or a broadly scoped API key; it cannot see or emit API keys, internal URLs, or other users' data even when asked cleverly. Test this with adversarial messages before launch, and repeat when the underlying model or prompt changes.
- **Log every conversation and every action** with timestamps and the account it acted on, retained on the same terms as other customer-data logs — this is both the incident evidence trail and the way `ops-team` audits support quality. Customer messages in those logs are personal data; `legal-team`'s privacy policy has to cover the bot and its logging.
- **Escalation is a path, not a promise.** A live human is reachable by a route the bot can't block; escalate on anything involving payments, health or other sensitive data, a distressed or angry customer, a request the bot isn't allowed to fulfil, an attempt to extract data or change its behavior, and any pattern of repeated failures. Escalation events go to a person promptly, not into a queue nobody watches.
- **Kill switch.** Someone named can turn it off or drop it to canned responses in minutes if it starts leaking, hallucinating commitments, or being abused, without a deploy. That moment is an incident under this playbook — contain first, then investigate the logs.

## Roles and communication during an incident

Even for a small team, name (in advance, not during) who's actually driving the response, who has authority to make containment calls (e.g. taking a system offline), and who needs to be informed and when. Communicate factually and without speculation to anyone outside the immediate response — "we've identified unauthorized access to X, contained as of [time], investigating scope" is usable; guessing at cause or scope before it's confirmed creates a statement that may need walking back later, which costs more trust than a delayed update would have.

## Evidence preservation

Resist the urge to "clean up" immediately — wiping a compromised system or overwriting logs before capturing them destroys the evidence needed to actually understand what happened and whether it's really contained. Preserve logs, snapshots, and relevant artifacts before remediation where practical, especially if there's any chance law enforcement, a regulator, or a cyber-insurance claim will need them later.

## When personal data is in scope

The moment an incident plausibly involves personal data (user records, health data, credentials), loop in `legal-team` immediately, not after full confirmation — data-protection frameworks like Nigeria's NDPA carry real, time-bound notification obligations to the regulator and, in significant-risk cases, to affected individuals. Waiting for complete certainty before looping in legal is how a notification deadline gets missed; a "this may involve personal data, investigating" flag is not a false alarm even if it later turns out to be a narrower scope than first feared.

## When this needs a professional, not just this skill

Anything involving a suspected sophisticated or persistent attacker, ransomware, a confirmed breach of sensitive data at real scale, or a situation where legal/regulatory/law-enforcement involvement is likely should bring in a professional incident-response firm or specialist directly — this skill's role in that situation is helping triage severity quickly, structure the initial containment, and prepare clean, organized facts for that professional to work from immediately, not substituting for them.
