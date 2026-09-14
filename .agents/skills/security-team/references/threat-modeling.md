# Threat Modeling

The goal is to find the threats that matter for *this specific system* before it's built or shipped — not to produce a generic list that could apply to any application.

## The STRIDE method

A practical, widely-used way to systematically ask "what could go wrong" for a system, by category:

- **Spoofing** — can someone impersonate a user, service, or system component they aren't? (e.g. forging a request to look like it came from an authenticated user)
- **Tampering** — can someone modify data or code they shouldn't be able to? (e.g. altering a request payload, modifying data in transit or at rest)
- **Repudiation** — can someone deny having done something, with no way to prove otherwise? (e.g. no audit log for a sensitive action, so a dispute has no evidence trail)
- **Information disclosure** — can someone see data they shouldn't? (e.g. an API response that leaks another user's data, an error message that reveals internal system details)
- **Denial of service** — can someone make the system unavailable to legitimate users? (e.g. an unthrottled endpoint that's trivial to overwhelm)
- **Elevation of privilege** — can someone gain more access than they should have? (e.g. a regular user reaching admin functionality through a missing authorization check)

Work through each category against the system's actual components and data flows, not abstractly — "could someone tamper with this specific request payload" is a useful question; "could tampering happen" in the abstract isn't.

## Trust boundaries and data flow

Before applying STRIDE, sketch (even informally, in text) the system's actual data flow: what components exist, what data moves between them, and where the **trust boundaries** are — the points where data crosses from a less-trusted context into a more-trusted one (client to server, an external API into the application, an untrusted user upload into storage). Trust boundaries are where the highest-value threats concentrate, because that's where an assumption about "this data is already safe" most often turns out to be wrong.

For an AI-integrated system specifically, treat model output as crossing a trust boundary the same way user input does — an LLM's output (including anything influenced by retrieved or injected content) is untrusted until validated, not automatically safe because it came from "the model." `dev-team`'s `references/ai-engineering.md` covers the implementation side of this in depth; threat-model the boundary here, hand the defense-in-depth implementation there.

## Prioritizing findings

Not every identified threat deserves the same response. Prioritize by realistic **likelihood** (how plausible is this attack path, given who can actually reach it and what skill/access it requires) and **impact** (what's the realistic damage — data exposed, users affected, reversibility) for this specific system, not a generic severity label copied from a template. A theoretical threat requiring insider access to an air-gapped system is not the same priority as a threat exploitable by any anonymous internet user against a public endpoint, even if both are "technically" the same STRIDE category.

Translate every finding worth acting on into something concrete and actionable — a requirement `dev-team` can actually implement ("this endpoint needs a server-side ownership check before returning the record") — not a vague concern ("authorization could be stronger"). A threat model that doesn't produce actionable requirements didn't actually reduce risk, however thorough it looked.

## When to run one

Worth a real threat-modeling pass: a new system or major feature, especially one touching authentication, payments, or sensitive data; a significant architecture change (new trust boundary, new external integration); before a compliance audit or after a near-miss/incident that suggests a blind spot. Not every small feature needs a formal session — use judgment on the deeper Working Method question of proportioning effort to actual risk, the same way `dev-team` proportions its security checklist layers to what a change actually touches.
