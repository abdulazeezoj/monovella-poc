# Output Templates

Use the sections relevant to the task — these are checklists, not mandates to fill in every field regardless of relevance.

## /icp

```
## ICP: [segment name]

**Who:** company profile (size, industry, geography, stage) and buyer role(s)
**Trigger:** the event or condition that makes this offer relevant right now
**Pain:** the specific problem, in their language
**Current alternative:** what they do today instead (including "nothing")
**Buying authority:** who approves, who influences, who can block
**Qualification signals:** what makes a lead a genuine fit
**Exclusions:** who looks like a fit but isn't, and why
```

## /outreach

```
Subject: [specific, non-clickbait, states the actual reason for contact]

[1-2 sentences: the real, specific reason you're reaching out to this person/company —
tied to something true about them, not a generic template fill]

[1-2 sentences: the relevant problem or opportunity, stated concretely]

[1 sentence: brief, real proof — a specific result, not a vague claim]

[1 low-friction next step — a question, not a meeting request out of nowhere]
```

Keep it short — cold outreach that reads as a memo gets ignored. Every sentence should be one that couldn't be sent unchanged to a different prospect; if it could, it's not personalized, it's templated.

## /discovery

```
## Discovery: [account/contact]

**Objective:** what this call needs to establish
**Context already known:** don't re-ask this

### Questions
- Current process / how they handle this today
- Pain: frequency, impact, who feels it
- Alternatives already tried, and why they didn't stick
- Desired outcome, in their terms
- Budget signal (indirect is fine — direct if the relationship allows it)
- Decision process and stakeholders
- Timing / urgency driver
- Success criteria — what "worked" would look like to them

### After the call
- Commitments made (by either side)
- Open questions
- Stakeholders identified
- Next action and owner
```

## /pitch

```
## Pitch: [account/context]

**Buyer's specific use case:** (not the generic use case — theirs)
**Problem → outcome bridge:** their stated problem, and the outcome they want
**Shortest credible path:** the minimum shown to prove it solves their problem
**Proof:** the specific evidence used, and why it's relevant to them
**Objection(s) anticipated:** and how they're addressed proactively
**Next step:** the specific ask
```

## /proposal

```
## Proposal: [account]

**Problem:** what discovery actually surfaced
**Outcome:** what success looks like for them
**Solution:** what's being proposed, scoped to what discovery supports
**Scope and responsibilities:** what each side owns
**Timeline:** realistic, checked against actual delivery capacity
**Pricing:** with the logic behind it, not just a number
**Assumptions:** what this proposal depends on being true
**Exclusions:** explicitly out of scope
**Risks:** named plainly, with mitigation
**Success measures:** how both sides will know it worked
**Next step:** the specific decision being asked for
```

## Renewal / expansion conversation (via `/discovery` or `/followup`)

A renewal is discovery on an account you already know, so the evidence bar is higher, not lower: the customer has real usage data and a real support history, and they know whether the last promise was kept. Pull that history from `ops-team` before the conversation — walking in without it reads as not paying attention.

```
## Renewal / expansion: [account]

**Original promise:** what they bought and the outcome they were told to expect
**What actually happened:** usage, results, support history, incidents — from data and ops-team, not memory
**Gap (if any):** where delivery fell short, stated before the customer has to raise it
**What's changed on their side:** new people, new priorities, new budget cycle — re-qualify, don't assume
**Renewal ask:** term, price, any change to scope — with the logic
**Expansion (only if earned):** the specific extra problem now visible, the evidence it's real, and what solving it is worth to them
**Risks to the renewal:** named plainly (a champion who left, an unresolved bug, a cheaper alternative they've mentioned)
**Next step:** decision requested, and by when
```

Never lead a renewal with the expansion pitch: earn the renewal first by showing the original promise held, then raise the expansion as a separate question the customer can decline without endangering the renewal. If the promise didn't hold, the honest move is to say so and fix it, not to bundle it into a bigger deal.

## Post-sale handoff to `ops-team`

The deal closes here; the relationship now lives with `ops-team`, and what makes the next renewal easy or hard is whether ops knew what was promised. Write this at close, before the celebration, and hand it over by name.

```
## Handoff: [account] — [date]

**What was sold:** product/plan/scope, price, term, payment terms — exactly as in the signed proposal
**What was promised:** every commitment made in outreach, demo, proposal, or negotiation, including verbal ones — timeline, integrations, custom work, response times. If it isn't written here, ops will find out the hard way.
**Who's who:** decision maker, day-to-day contact, champion, anyone who was hesitant and why
**Support expectations:** the channel they expect (WhatsApp, email, phone), hours, who they've been told to contact, any SLA language used
**Onboarding steps and owner:** what has to happen for them to reach first value, and who does each step (dev-team, ops-team, the customer)
**Known risks:** a feature they asked about that doesn't exist yet, a limitation glossed over in the demo, a stakeholder who preferred a competitor, an unrealistic timeline agreed under pressure
**Renewal date and trigger:** when this comes back to sales, and what signal earlier than that should bring it back (usage drop, escalation, champion leaving)
```

A promise sales made and ops didn't know about is the most common cause of a churned first-year account. If something on this list was promised that `dev-team` hasn't confirmed, flag it to them in the same handoff rather than letting ops discover it in a support ticket.

## /pipeline

```
| Account | Contact | Value | Stage | Probability | Next action | Owner | Date | Blockers |
```

Stage entry/exit criteria should be evidence-based (e.g. "Discovery complete" means the questions above were actually answered, not that a call happened).

## /forecast

```
## Forecast: [period]

**Method:** stage-weighted / rep judgment / historical conversion — state which
**Assumptions:** listed explicitly, with confidence level for each
**Committed:** deals that meet the evidence bar for this category
**Best case:** deals that could close with a specific named condition met
**Risk to the number:** what could move it down, and by how much
```

Never present a forecast number without the assumptions behind it — the number alone invites false confidence.

## /review findings

```
## Finding: [short title]

**Category:** Targeting / Offer / Proof / Compliance / Manipulation risk / Consistency / Feasibility
**Problem:** what's actually wrong, described concretely
**Risk:** what happens if this ships as-is (lost trust, legal exposure, wasted pipeline, overpromise)
**Evidence:** the specific line, claim, or pattern in question
**Recommendation:** the concrete fix
```

Flag anything that resembles a pattern in `references/outreach-and-ethics.md` as highest priority regardless of how minor it looks — these carry real legal and trust exposure, not just a style preference.
