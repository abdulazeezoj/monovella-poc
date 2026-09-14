# Output Templates

Use the sections relevant to the task; these are checklists, not mandates to fill in every field regardless of relevance. Where a field is unknown, say "unknown" and what would establish it, rather than filling it with a plausible guess.

## /support

Two parts: the reply the customer gets, and the note the founder (or the next person) needs.

```
## Support: [customer or ticket ref] — [category]

**Severity:** Urgent / High / Normal / Low
**Escalate to human:** Yes (money / health / safety / anger / repeat / key account) / No
**Channel:** WhatsApp / email / in-app / phone / social

### Reply to customer
[Acknowledge the specific problem in their words. State what has been done or will be done.
Give the next step and a time you will actually keep. Sign with a name.]

### Triage note (internal)
**What actually happened:** [facts only, from the thread and any system check]
**What's unknown:** [what still needs checking, and where]
**Root cause (if known):** [product bug / process gap / supplier / customer error / unknown]
**Fix for this customer:** [refund, replacement, manual action, credit — and who does it]
**Recurring?** [first time seen / seen N times in the last 30 days / pattern]
**Prevent the next one:** [self-serve article / quick reply / automation / product fix / SOP — with the owning team]
```

## /retain

```
## Retention investigation: [signal]

**Signal:** [what was observed: cancellations up, usage down, a segment lapsing, one key account]
**Scale:** [how many customers, what revenue, over what period — actual numbers or "unknown"]

### What's known
| Bucket | Count | Evidence source |
|--------|-------|-----------------|
| Payment failure | | billing events |
| Never activated | | activation events |
| Faded | | usage frequency |
| Frustrated | | support tickets, ratings |
| Unknown | | |

### Investigation plan
1. [Data to pull, from where, by when]
2. [Who to ask directly, on which channel, using the exit-question script]
3. [What would confirm or rule out the leading hypothesis]

### Findings (after investigation)
**Confirmed reasons:** [with counts and verbatim quotes]
**Still unknown:** [and whether it's worth chasing further]
**Intervention by bucket:** [specific fix per bucket, owning team, and what "worked" would look like in 30 days]
**Handed to:** product-team / dev-team / finance-team / sales-team as relevant
```

## /hire

Three artefacts, produced in order.

```
## Job description: [title]

**Summary:** [one sentence on what they own]
**What you'll do:** [5–7 concrete outcomes or recurring tasks]
**Your first 90 days:** [2–3 lines]
**Must-have:** [3–5, each testable]
**Nice-to-have:** [up to 3]
**How the work happens:** [location, hours, tools, reports to, team size]
**Pay and terms:** [range; engagement type after legal-team confirms]
**To apply:** [the one role-specific thing to send]
```

```
## Interview plan: [title]

**Sourcing channels:** [named channels, with why each fits this role]
**Stage 1 — Screen:** [hard constraints checked, the one must-have question]
**Stage 2 — Work sample:** [the task, materials provided, time expected, paid or not, rubric items]
**Stage 3 — Interview:** [work-sample walkthrough, 4–6 behavioural questions tied to must-haves, one venture-specific scenario]
**Stage 4 — References:** [how many, who, the questions]
**Decision by:** [date]; **offer and hand-off to legal-team by:** [date]
```

```
## Scorecard: [candidate] for [title]

| Criterion | Score (1–4) | Evidence |
|-----------|-------------|----------|
| Must-have 1: [name] | | |
| Must-have 2: [name] | | |
| Work sample: [rubric item] | | |
| Work sample: [rubric item] | | |
| Communication | | |
| Would want to work with daily | | |

**Reference check summary:** [per referee, two lines]
**Recommendation:** Hire / No / Hold — [one line of reasoning against the must-haves]
```

## /onboard

```
## Onboarding plan: [name or role]

**Start date:** [date]
**Before day one:**
- [ ] Agreement signed — legal-team
- [ ] Access provisioned to minimum needed — security-team (list: [systems])
- [ ] Equipment / stipend decided
- [ ] Venture brief and week-one tasks written

**Days 1–30 — learn and do small real work**
Goal: [one line]
Tasks: [shadowing, SOPs to read, first bounded task, first recurring task]
Success looks like: [observable]

**Days 31–60 — own the core**
Goal: [one line]
Tasks: [primary responsibility, first SOP improvement, direct customer/supplier contact]
Success looks like: [observable]

**Days 61–90 — own outcomes**
Goal: [one line]
Tasks: [metric owned, improvement run, process documented]
Success looks like: [the JD's 90-day outcomes]

**Check-ins:** end of week 1, week 2, then every 2 weeks. Same four questions each time.
**Probation decision:** [date], criteria: [the must-haves and 90-day outcomes]; legal-team confirms the mechanism.
```

## /sop

```
## SOP: [name]

**Purpose:** [what this prevents, in one or two sentences]
**Owner:** [name]; **Backup:** [name]
**Trigger:** [schedule / event / request]
**Inputs:** [files, access, stock, approvals needed before starting]

**Steps**
1. [action] — [who] [tag: script / scheduled / form / alert / human]
2. [action] — [who] [tag]
3. ...

**Done right looks like:** [the observable result]
**If it goes wrong:**
- [likely failure] → [what to do, who to tell]
- [likely failure] → [what to do, who to tell]

**Automation request for dev-team:** [tagged steps, frequency, time by hand, cost of failure]
**Last reviewed:** [date, by whom]
```

## /vendor-ops

```
## Supplier scorecard: [supplier] — [what they supply]

**Load-bearing:** Yes / No
**Period reviewed:** [dates]; **Deliveries in period:** [n]

| Dimension | Score (1–4) | Evidence |
|-----------|-------------|----------|
| Reliability | | on-time [x/n], fill rate [%] |
| Quality | | defect/return rate [%], batch consistency |
| Terms | | price vs alternatives, payment terms, MOQ, price stability |
| Lead time | | quoted [d] vs actual [d], variability |
| Backup | | [named backup / none], tested [yes/no] |
| Relationship | | responsiveness, named contact |

**Trend vs last period:** [up / flat / down, on which dimension]
**Single-supplier risk:** [none / named — with switching cost and trigger]
**Actions:** [conversation with supplier, trial order with backup, buffer stock (finance-team to price), spec change]
**Next review:** [date]
```

## /review findings

```
## Finding: [short title]

**Area:** Support / Retention / Hiring / Onboarding / SOP / Vendor
**Severity:** Critical / Major / Moderate / Minor
**Category:** Missed commitment / Unknown treated as known / Single point of failure / Manual work that should be automated / Process gap / Process nobody follows
**Issue:** [what's actually failing, with the evidence: counts, dates, examples]
**Impact:** [what it costs when it happens: a lost customer, a stockout, a bad hire, founder hours]
**Recommendation:** [the specific fix, the owning team, and what "fixed" looks like]
```

Severity guide (same scale as the other team skills):
- **Critical** — customers are being lost or harmed now, a load-bearing supplier has no backup and is failing, a hire or departure is exposing the venture, or a commitment is being missed repeatedly.
- **Major** — a recurring problem with a clear cost and no process, an escalation rule not being followed, an unknown being treated as known in a decision.
- **Moderate** — a gap that costs time or precision but not customers or money yet.
- **Minor** — presentation, labelling, or a process that works but is undocumented.

The weekly `/review` (support or ops) is a short list of these findings plus the three numbers that moved: volume by category, response-time actuals against commitments, and churn by bucket (support), or on-time delivery, stock at reorder, and QC rejects (ops).
