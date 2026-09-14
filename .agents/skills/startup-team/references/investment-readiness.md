# Investment Readiness and Pitch

The framework for `/readiness [raise]` and for the "raise" branch of `/orchestrate`. Fundraising readiness isn't primarily about the pitch deck — it's about whether the evidence, numbers, and documents an investor will actually check are in order *before* the meeting. A polished deck covering for missing evidence gets found out in the first real follow-up question.

## The six questions every investor is actually asking

Underneath whatever specific questions come up in a meeting, an investor is checking six things: is the **problem** big and urgent enough to matter, is the **market** large enough to make the outcome worth the risk, does the **business model** actually let the venture capture value it creates (not just create it), is there real **traction** — evidence of demand, not just interest, does the **team** look like it can execute on this specific problem, and is there a plausible path for capital to **return** (an exit, or in Nigeria's context sometimes a credible path to sustained profitability an investor can hold through). A readiness check should be able to point to real evidence for each of the six, not assert that all six are fine.

## Readiness scales with stage — don't apply a Series A bar to a pre-seed idea

- **Idea stage:** evidence standard is mostly problem quality and team credibility — is this a real problem, does this founder have a right to be working on it.
- **Pre-seed:** real customer evidence (see the evidence ladder in `references/opportunity-evaluation.md`) plus a credible MVP plan — not revenue yet, but not just opinions either.
- **Seed:** early traction that's starting to repeat — a first cohort, early retention, some signal the model works more than once.
- **Series A:** a GTM motion that's shown it can be repeated deliberately (not just a lucky first channel), and unit economics an investor can actually model.
- **Growth:** predictable, controllable expansion — the story shifts from "does this work" to "how fast and how safely can this scale."

Naming which stage a venture is actually at — honestly, not aspirationally — is most of what determines whether a specific readiness gap is a real blocker or premature to worry about.

## Valuation is risk reduction, not a formula

Especially pre-revenue, an early valuation isn't computed from a multiple — it reflects how much risk the venture has already retired in an investor's eyes, across four categories, each with the kind of evidence that actually reduces it:

- **Problem risk** — reduced by evidence the pain is real, repeated, and costly (interview patterns showing a consistent story, an existing paid workaround, real pilot demand).
- **Market risk** — reduced by a reachable beachhead that plausibly connects to a bigger total opportunity (a bottom-up serviceable-obtainable-market figure, actual channel reach, real comparables — not a TAM slide alone).
- **Execution risk** — reduced by evidence this specific team can actually deliver (prior relevant execution, genuine founder-market fit, a domain network that shortens the path).
- **Financial risk** — reduced by internally consistent numbers (pricing, cost structure, and runway that hang together, a simple model with clearly labeled assumptions, a milestone-based use of the raise rather than a vague "12-18 months runway").

When assessing readiness, name which of these four categories still has the weakest evidence — that's usually the actual gap, more useful than a generic "needs more traction."

## Matching the funding type to the stage and the need

Five broad types, each with a different implicit expectation from the capital provider — matching the ask to the right type matters as much as the amount:

- **Grant** — non-dilutive, usually tied to a specific program or impact thesis (see the SDG-fit note in `references/opportunity-evaluation.md` for when this is a real option, not a stretch).
- **Debt** — repayment obligation and cash-flow discipline; appropriate once there's revenue predictable enough to service it.
- **Angel** — early-stage belief plus a network, usually smaller checks, often the right fit before there's enough traction for a fund.
- **VC** — appropriate when the venture is genuinely pursuing high growth and a real exit path; VC money comes with an expectation of eventual scale that a smaller, steadier business shouldn't take on.
- **Strategic** — capital from a party that also gets business synergy or market access — worth the added complexity (potential conflicts, slower process) mainly when that synergy is real and significant.

**Grants run as a parallel track, not a fallback.** When the venture's impact mechanism genuinely clears the four-part SDG-fit test in `references/opportunity-evaluation.md`, `finance-team`'s `/grant` should be screening and applying alongside the equity conversation, not after it stalls — grant cycles have their own calendars and application lead times, and non-dilutive money that lands before a priced round improves the founder's negotiating position on that round directly. Two cautions: a grant with reporting obligations the venture can't sustain is a cost, not free money, and a generic impact narrative bolted on to qualify wastes more founder time than it's worth.

A quick investor-fit filter, useful before spending time on any specific investor: **stage fit** (do they invest at this stage), **sector fit**, **geography fit**, **value-add fit** (do they bring something beyond capital that matters here), **check-size fit** (is the amount being raised in their actual range). A mismatch on two or more of these is usually worth flagging before the founder spends weeks pursuing that specific conversation.

## What due diligence actually checks

A data room organized around the same six investor questions moves faster than one organized as a generic document dump: company overview (what's actually being funded), business model (how value becomes revenue), market and traction (is demand real and reachable — retention data, LOIs, churn, not just growth charts), product and tech (can this team build and maintain it), financial model (how long the capital lasts and what it's meant to prove), team and hiring (why this team, why now, what the hiring plan is), legal and compliance (anything that could block a deal — cap table cleanliness, IP assignment, entity status; this is where `legal-team`'s stage-gated hygiene work from `references/orchestration-playbook.md` gets tested), and supporting evidence in an appendix. A `/readiness` check for a raise should be able to say, section by section, what exists and what's missing — not just "mostly ready."

**Investors also check whether the operation holds up without the founder**, and this usually surfaces in diligence rather than the pitch. Three things get looked at: **support load** (how many customer issues reach a human, how fast they're resolved, and whether that scales with customers or with the founder's hours — `ops-team`'s support layer and its response-time promise are the evidence here); **churn handling** (not just the churn number, but whether there's a retention process that catches an at-risk customer before they leave, and what's been learned from the ones who did); and **key-person dependency** (what stops if the founder is unavailable for two weeks — deploys, supplier calls, payroll, a customer escalation — and whether a runbook, an SOP, or a second person covers it). A venture where all three still route through the founder reads as execution risk, however good the traction is, because the raise is meant to fund growth the founder can't personally absorb.

## Before any term sheet conversation: know the fallback

Never let a founder walk into investor negotiations with no fallback — the strength of a negotiating position depends heavily on having at least one credible alternative if this specific deal falls through (another interested investor, enough runway to wait for better terms, a path to revenue that reduces the need to raise at all). A simple way to make this concrete: list the real alternatives, and for each, note the runway or milestone it buys, how likely it actually is, the downside if it doesn't come through, and a rough confidence score — then know, going in, what the walk-away line actually is. This isn't paranoia about a specific investor; it's the difference between a founder negotiating from a real position and one who can be read as having no other option.

**The three common early instruments**, briefly, since which one is on the table changes what actually matters in the conversation: a **SAFE** is fast and doesn't require agreeing a valuation up front, but stacking several SAFEs with different caps/discounts can create dilution surprises that only become visible at the priced round — worth modeling before signing more than one. A **convertible note** behaves more like debt (it has a maturity date and can create real repayment pressure if the company hasn't converted by then). A **priced round (e.g., RCPS)** involves formal rights, and the terms that matter most are usually liquidation preference and anti-dilution provisions — not the headline valuation number, which is easy to fixate on while missing what actually controls the outcome in a bad scenario.

## The ask itself

A vague ask ("we're raising for marketing and operations") is a readiness gap on its own — a credible ask states amount, what it proves, and over what timeframe, in one sentence: *"We are raising [amount] to reach [milestone] in [months], enabling [the next round or the next revenue goal]."* The underlying discipline: the round should be sized to buy a specific, named reduction in risk (one of the four categories above), not just to extend runway in the abstract.

## The pitch deck itself

The deck is secondary to the readiness underneath it, but a strong deck does four specific jobs: **clarity** (an investor should be able to explain the company back in one sentence after seeing it), **credibility** (claims are backed by real behavior — revenue, pilots, usage — not adjectives), **momentum** (it shows what's changed over time, not a static snapshot), and **the ask** (a concrete, specific next step). A useful check on any deck: does every slide reduce risk or build belief in one of the six investor questions above? A slide that does neither belongs in the appendix, not the main narrative.

A common, workable slide order: cover/one-liner → problem → solution/product → why now → market (sized bottom-up, not a TAM slide alone) → business model → traction → go-to-market → competition (never "we have no competitors" — reframe as *"customers currently solve this through X, but we win because Y"*) → financials and use of funds → team → the ask/next milestone. Two other common mistakes worth flagging when reviewing a deck: leading with the technology before the user value is obvious, and a team slide that just introduces people rather than making the case for founder-market fit.

Three related documents serve different purposes and shouldn't be conflated: the **pitch deck** is for a first meeting, aimed at earning the next conversation; an **investor-update (IR) deck** is for ongoing communication with people who already invested — short, honest, metric-driven, covering what changed since the last update, pipeline, risks, and asks; an **information memorandum (IM)** is a deep-diligence document used only once an investor needs real depth (full commercial, financial, legal, and risk detail). Using the wrong one in the wrong moment — an IM-length document at a first meeting, or a pitch-deck-thin update to an existing investor — reads as a readiness gap in itself.

**After a meeting**, the follow-through matters as much as the pitch: a same-day thank-you with the deck and whatever was specifically requested, requested documents sent within 24-48 hours while interest is fresh, milestone-based (not just calendar-based) periodic updates, and always naming the next concrete ask (a second meeting, an intro, a term sheet conversation) rather than leaving the next step ambiguous.
