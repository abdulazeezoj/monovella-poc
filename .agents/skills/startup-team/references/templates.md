# Output Templates

Use the sections relevant to the task — these are checklists, not mandates to fill in every field regardless of relevance.

## /opportunity

```
## Opportunity: [idea]

**Problem and who has it:** [specific, not generic]
**Current alternative:** [what they do today]
**Evidence rung:** [opinion / anecdote / observed behavior / repeated behavior / real payment — name where the current evidence actually sits]
**Real addressable opportunity (Nigerian context):** [sizing grounded in local price point, distribution, and purchasing power — not a global TAM figure]
**Existing competition and defensibility:** [who, and what makes their position defensible or not — and what the venture's own unfair advantage actually is, if any]
**Why now:** [the actual enabling condition, or the honest absence of one]
**Load-bearing assumptions:** [the 2-3 things that, if wrong, sink the whole opportunity — prioritized by impact × uncertainty]
**Fit with existing ventures/resources:** [synergy or focus-fragmentation]
**Impact/SDG angle (only if genuinely present):** [the specific mechanism connecting the business model to a measurable outcome — omit rather than force this]

**Call: Pursue now / Pursue later / Don't pursue**
**Reasoning:** [plain, specific]
**If "later" — the condition that would flip this:** [specific]
**If "now" — first concrete step:** [usually a handoff to product-team's /idea]
```

## /status

```
## Venture status: [name]

| Function | Current state | Signal |
|----------|---------------|--------|
| Product | | on track / at risk / blocked |
| Design | | |
| Engineering | | |
| Security | | |
| Sales | | |
| Content | | |
| Legal | | |
| Finance | | |
| Operations | | |

**Operations, in one line each:**
- Support layers in place: [self-serve / automated first line / human escalation with a response-time promise — which exist, which don't]
- Retention signal: [what the churn or repeat-use number actually says, or "not measured yet"]
- Hiring status: [open roles, where each is in ops-team's process, or "none open"]
- SOP coverage: [which recurring tasks have a written process, which still live in the founder's head]
- Supplier risk: [any single vendor or supplier whose failure stops the operation, or "none / not applicable"]

**Runs without the founder?** [yes / mostly / no — and the specific thing that still needs the founder each week]

**The single biggest constraint right now:** [specific, not a list]
**What closes it:** [concrete next action, and which team owns it]
```

## /focus

```
## Focus: [period, e.g. "this week/month"]

**Ventures in play:** [list]

| Venture | Time-sensitivity | Path to next milestone | Cost of neglect this cycle |
|---------|-------------------|--------------------------|------------------------------|

**Recommendation:** [which venture gets primary attention, and why]
**Explicitly deprioritized:** [named, with the reasoning — not silently dropped]
```

A venture that has been set up to run itself — automated support with a human escalation path, monitored infrastructure with alerts and tested backups, documented SOPs — is the one that can safely be deprioritized this cycle; say so explicitly in the "cost of neglect" column. A venture that can't run itself is a standing claim on the founder's week whatever the recommendation says, and closing that gap (`dev-team`'s `/operate`, `ops-team`'s `/support` and `/sop`) is often the highest-leverage focus item of all, because it's what frees the founder for the next one.

## /readiness

```
## Readiness check: [milestone]

**What this milestone actually requires from each team:**

| Team | Requirement | Status | Gap |
|------|-------------|--------|-----|

**Go / No-go: [call]**
**If no-go — the specific blocking gap(s):** [named, not vague]
**If go — what's still worth watching:** [residual risk, not a hidden requirement]
```

For a **public launch**, the requirements table should include at least these rows — they're the ones most often missing when "the build is done" gets mistaken for "ready":

```
| dev-team | /operate pass: monitoring, actionable alerts, tested backup and restore, budget alerts on every paid service, runbook | | |
| ops-team | Support layer: self-serve help, automated first line, human escalation with a stated response-time promise | | |
| security-team | Pre-launch pass appropriate to what's now internet-facing | | |
| legal-team | Terms of service and privacy policy live before real users arrive | | |
| content-team / sales-team | GTM plan with one beachhead segment, one primary channel, one first offer | | |
```

A launch that still needs the founder watching a dashboard and answering every message by hand is a no-go on the operations rows, however finished the product looks.

For a **raise**, add the readiness-specific fields from `references/investment-readiness.md`:

```
**Stage claimed vs. evidence bar for that stage:** [honest gap, if any]
**Risk category weakest right now:** [problem / market / execution / financial]
**The ask:** [amount, milestone it buys, timeframe — flag if this isn't stated this concretely yet]
**Fallback if this round doesn't close:** [named, with rough confidence — not "there isn't one"]
```
