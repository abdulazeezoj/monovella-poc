# Discovery and prioritization frameworks

A framework is a shortcut to a shared decision language, not a source of truth. Pick the one that matches the kind of decision being made and the data actually available. Naming the framework being used ("this is a RICE pass," "this is a Kano-style read") also makes it clear to the user what kind of confidence to place in the output.

## Jobs to Be Done (JTBD)

**What it's for:** Finding the real problem underneath a feature request or a stated user need. Shifts the question from "what does the user want built" to "what job is the user hiring this product to do."

**When to use it:** Early discovery, when a request feels solution-first ("add a button that does X") and the underlying motivation isn't clear yet, or when a product isn't landing despite positive feedback (feedback often describes the job badly).

**How to run it:** Write the job as `When [situation], I want to [motivation], so I can [expected outcome]`. Pull candidate jobs from interview transcripts, support tickets, or churn/cancellation reasons if available — don't invent them. Distinguish the functional job (the task) from emotional and social jobs (how they want to feel, how they want to be seen), since solutions that only serve the functional job often underperform.

**When it's the wrong tool:** Once the problem is already well understood and the team needs to sequence known work — that's a prioritization framework's job, not JTBD's.

## RICE (Reach, Impact, Confidence, Effort)

**What it's for:** Comparing a backlog of initiatives with a single, defensible number when there's enough data to estimate reach.

**How it works:** `RICE score = (Reach × Impact × Confidence) / Effort`
- **Reach**: number of users/events affected in a given period (e.g., "customers per quarter").
- **Impact**: effect per user, usually a rough multiplier (e.g., 3 = massive, 2 = high, 1 = medium, 0.5 = low, 0.25 = minimal).
- **Confidence**: percentage reflecting how much evidence backs the reach/impact estimates (100% = strong data, 80% = medium, 50% = mostly a guess). Low confidence should pull the score down hard, not get glossed over.
- **Effort**: person-time to build, in a consistent unit (person-months is common).

**When to use it:** Growth-stage products with real usage data to estimate reach and impact against. Best for teams choosing between several already-understood initiatives, not for deciding whether an idea is worth pursuing at all.

**When it's the wrong tool:** Early-stage products without usage data — the reach/impact numbers become fake precision on top of a guess. Say so if asked to RICE-score something with no underlying data, and suggest Opportunity Scoring or a simple Value vs. Effort read instead.

## MoSCoW (Must / Should / Could / Won't)

**What it's for:** Scope negotiation across a cross-functional group ahead of a release or sprint — less a ranking method, more a way to force agreement on what's actually non-negotiable.

**How it works:** Sort items into Must have (release fails without it), Should have (important but not release-blocking), Could have (desirable if time allows), Won't have this time (explicitly out of scope for now, not forever).

**When to use it:** Scoping a release or sprint with multiple stakeholders who each think their item is a "must." Forces an explicit conversation about what "must" actually means.

**Watch for:** Scope creep into "Must" from stakeholder pressure rather than evidence — hold the line on what genuinely blocks the release.

## Kano Model

**What it's for:** Understanding how a feature affects satisfaction — separating features that just prevent dissatisfaction from ones that actively delight.

**How it works:** Classify features into: Basic/threshold (expected; absence causes dissatisfaction, presence doesn't add much delight — e.g., "the app doesn't crash"), Performance (satisfaction scales roughly linearly with how well it's done), Delighters/excitement (unexpected; absence isn't noticed, presence creates disproportionate satisfaction). Classification ideally comes from a paired survey question per feature ("how do you feel if this is present" / "how do you feel if this is absent") — don't fabricate this data if it wasn't collected; describe it as a hypothesis instead.

**When to use it:** Deciding whether to invest further in a mature/table-stakes area versus a differentiating one, or explaining to a stakeholder why a "boring" reliability fix matters as much as a flashy feature.

## Opportunity Scoring / Outcome-Driven Innovation

**What it's for:** Finding underserved needs when there isn't enough usage data yet for RICE — common in early-stage products.

**How it works:** For a set of desired outcomes, ask users to rate each on importance and current satisfaction (both roughly 1–10). Opportunity = Importance + max(Importance − Satisfaction, 0). High-importance, low-satisfaction outcomes are the biggest opportunities.

**When to use it:** Pre-PMF products deciding where to focus, when interview or survey data on importance/satisfaction exists or can cheaply be gathered.

## Working Backwards

**What it's for:** Forcing clarity on customer value before any building starts, by writing the end-state first.

**How it works:** Draft the press release and FAQ for the finished product/feature as if it's shipping today — customer problem, why existing solutions fall short, how this solves it, a representative customer quote. If it's hard to write a compelling press release, that's a signal the value proposition isn't sharp yet, not a writing problem to push through.

**When to use it:** New product or major feature concepts, especially when the team risks getting pulled into solution details before the value proposition is settled.

## Cost of Delay / CD3

**What it's for:** Sequencing decisions when *when* something ships matters as much as *what* ships — e.g., time-sensitive market windows, compliance deadlines, or compounding technical debt.

**How it works:** Estimate the cost of delaying an initiative by one time period (lost revenue, growing risk, compounding debt), then divide by duration to get Cost of Delay Divided by Duration (CD3) — favors initiatives that are both high-cost-to-delay and quick to deliver.

**When to use it:** Choosing between a high-value-but-slow initiative and a lower-value-but-fast one, or justifying why a smaller urgent fix should jump the queue ahead of a bigger planned initiative.

## Riskiest assumption first (impact vs. uncertainty)

**What it's for:** Deciding which assumption to test first when there are several and only time to check one or two — the usual situation when building from a hunch (see "Building from a hunch" in `SKILL.md`).

**How it works:** List the assumptions the product depends on (users have this problem, they'll pay this much, this channel reaches them, the AI step is reliable enough, ops can fulfil at this volume). Place each on a 2×2 grid:
- **Impact if wrong** — does the product die, or does it need a tweak?
- **Uncertainty** — is there real evidence, or is it a belief?

Test the high-impact, high-uncertainty corner first. High-impact but well-evidenced assumptions don't need a test; low-impact ones can be found out in production. The test should be the cheapest thing that produces a real signal and, wherever possible, runs alongside building rather than in front of it — a concierge version, a pre-order, a landing page with a real call to action (`content-team` builds it), five conversations with the actual buyer.

**When to use it:** Any time `/validate` is asked for without a specific assumption named, or when a plan lists several risks and treats them as equally worth worrying about.

**Watch for:** Testing the assumption that's easiest to test instead of the one that matters, and reclassifying a scary assumption as "low uncertainty" because the founder feels sure — conviction isn't evidence, which is why it's a separate axis.

## When retention, not acquisition, is the metric

Acquisition numbers are the easiest to grow and the easiest to be fooled by: ads, a launch post, or a referral bonus can fill the top of the funnel with people who never come back. Retention is the metric that matters when:

- The business model depends on repeat behaviour (subscriptions, repeat orders, marketplace liquidity, a savings or payment habit).
- The product is past first launch and the question is "is this working," not "can we reach anyone."
- Acquisition is expensive or the market is small enough that churned users don't get replaced — common in a niche Nigerian B2B segment.
- Growth is happening but revenue isn't following, which usually means a leaky bucket rather than a top-of-funnel problem.

In those cases, define the retention cohort precisely (which action, which period) before spending on acquisition, and treat a retention problem as a product and `ops-team` problem to fix first — pouring more users into a product that loses them just makes the loss faster. Acquisition is still the right focus pre-launch, or when the product is a one-off purchase where "coming back" isn't the job.

## Choosing between them

- Several assumptions, unclear which to test → Riskiest-assumption grid.
- Problem still fuzzy → JTBD first, before any scoring framework.
- Value proposition unclear on a new concept → Working Backwards.
- Early stage, no usage data → Opportunity Scoring.
- Growth stage, usage data available, comparing many initiatives → RICE.
- Cross-team scope negotiation for a release → MoSCoW.
- Deciding where satisfaction investment goes → Kano.
- Timing/sequencing matters as much as value → Cost of Delay.

Don't run a heavier framework than the decision warrants — for a two-option call with a fairly obvious answer, reasoned prose beats a scoring exercise.
