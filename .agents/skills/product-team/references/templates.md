# Templates

Use only the sections that are relevant to the task at hand — these are checklists, not forms to fill out mechanically. Delete sections that don't apply rather than writing "N/A."

## Spec template (`/spec`)

```markdown
# [Feature name] — Specification

## 1. Context and problem
What problem this solves, for whom, and why now. Link to the /idea or research that motivated it.

## 2. Goals and non-goals
- Goals: what this must achieve
- Non-goals: what this explicitly does not cover (prevents scope creep and future confusion)

## 3. Users, roles, evidence, and assumptions
Who uses this, in what role/permission level. What evidence supports the need (cite it). What's still assumption vs. confirmed fact.

## 4. Scope, stories, and business rules
What's in scope this release. Core user stories. Any business rules/constraints (e.g., "a user can have at most one active subscription").

## 5. Functional requirements
Specific, testable behaviors. Avoid vague terms ("fast," "secure," "AI-powered") without defining the expected behavior.

## 6. Permissions and data access
Who can see/do what. Any role-based access control.

## 7. User and system flows
Reference the full flow doc, or summarize inline for small features. See flow template below.

## 8. States, errors, and edge cases
Loading, empty, success, failure, retry, cancellation states. Edge cases (concurrent edits, offline, rate limits, etc.)

## 9. Data, analytics, privacy, safety, security, and compliance
What data is collected/stored, retention, what's tracked for analytics, privacy considerations, relevant compliance (GDPR, HIPAA, etc. if applicable).

## 10. Dependencies and constraints
Technical dependencies, team dependencies, timeline constraints.

## 11. Acceptance criteria
Specific, testable conditions that define "done."

## 12. Support and operations
A feature isn't done when it ships — it's done when it runs without the founder in the loop. Cover:
- Support load: which questions, confusions, and failure cases this feature will generate (billing disputes, "where is my X," a step that silently fails). If you can't name any, look harder — every feature generates some.
- Prevention: what self-serve (help text, empty states, an FAQ entry, a status page) or automation (retries, confirmation messages, an automated first-line reply) removes the most common ones before a human sees them.
- What `ops-team` needs: the support script or SOP for what's left, the admin tools or data views a support person needs to resolve a case, the escalation path to `dev-team`, and any training or supplier/vendor step this depends on.
- Monitoring after launch: the two or three signals that mean this feature is broken or being misused (error rate, drop-off at a step, ticket volume on a topic), the threshold that counts as a problem, and who gets alerted — `dev-team` for a system fault, `ops-team` for a support or retention signal. Ties into `dev-team`'s `/operate` runbook.

## 13. Release, rollout, open questions, and risks
Rollout plan (full launch, phased, flag-gated), open questions still unresolved, known risks.
```

## Flow template (`/flow`)

```markdown
# [Task name] — Flow

## Entry points
How the user arrives at this flow (which screens/triggers).

## Preconditions
What must be true before this flow can start (auth state, permissions, data prerequisites).

## Happy path
Step-by-step: user action → system response → next state. Number each step.

## Decision points / branches
Where the flow forks based on user choice or system state, and what happens down each branch.

## Loading / empty / success / failure states
What the user sees in each state, and how they recover from failure (retry, fallback, support contact).

## Permissions checks
Where in the flow permissions are checked, and what happens on failure (blocked, degraded, redirected).

## Cancellation / abandonment
What happens if the user backs out partway through — is partial progress saved?

## Notifications
Any system notifications triggered during or after the flow (email, push, in-app).

## Completion
What "done" looks like for the user, and any follow-up system/admin steps (e.g., a backend job, an ops queue entry) that aren't user-visible but are part of the flow.
```

## Roadmap template (`/roadmap`)

Organize by **outcome**, not by feature list, and by **confidence horizon**, not by fixed dates unless dates are actually committed.

```markdown
# [Product/area] Roadmap

## Now (committed, in progress or about to start)
- Outcome: [what changes for the user/business]
- Work: [what's being built]
- Status/dependencies:

## Next (planned, sequencing may shift)
- Outcome:
- Assumptions this depends on:
- Decision gate: [what needs to be true/confirmed before this becomes "Now"]

## Later (directional, not committed)
- Outcome hypothesis:
- Why it's not committed yet:

## Explicitly not planned
- [Item] — why it's out of scope for now
```

## Sprint story template (`/sprint`)

```markdown
### [Story title]

**Outcome:** What changes for the user/system when this ships.
**Scope:** What's included; what's explicitly excluded.
**Acceptance criteria:**
- [ ] Specific, testable condition
- [ ] ...
**Dependencies:** Other stories, teams, or external factors this needs.
**Design/spec reference:** Link.
**Tests:** What needs test coverage (unit, integration, manual QA).
**Definition of done:** Code merged, tests passing, instrumentation added, docs updated, deployed to [environment], post-launch operations in place (monitoring and alert owner set, support answer or SOP handed to `ops-team`, `dev-team`'s `/operate` runbook updated if a new failure mode was introduced).
**Committed / Stretch:** [which]
```

## Decision record template (`/decision`)

```markdown
# Decision: [short title]

**Date:**
**Options considered:**
1. [Option] — pros/cons
2. [Option] — pros/cons

**Evidence:** What data/research informed this.
**Decision:** What was chosen.
**Rationale:** Why, in plain terms.
**Revisit if:** The specific condition that should trigger reconsidering this (e.g., "if activation drops below X" or "if this hasn't been validated by [date]").
```

## Experiment / metrics definition template (`/metrics` or experiment design within `/validate`)

```markdown
## Experiment: [name]

**Hypothesis:** If we [change], then [metric] will [move], because [mechanism].
**Audience:** Who's included/excluded.
**Change:** Exactly what's different for the treatment group.
**Primary metric:** The one metric that decides success.
**Guardrail metrics:** What shouldn't get worse (e.g., latency, churn, support volume).
**Sample size / duration:** How long or how much data before a valid read is possible.
**Decision rule:** What happens if the metric moves, doesn't move, or guardrails break — decided in advance, not after seeing results.
```

For ongoing product health (not a single experiment), define per area:
- **Adoption:** Are new/target users reaching this?
- **Activation:** Are they getting to first value?
- **Task completion:** Are they succeeding at the core task, and how often do they fail/abandon?
- **Retention:** Are they coming back (where relevant to this product)?
- **Quality/reliability:** Error rates, latency, uptime.
- **Safety:** Any harm/misuse indicators relevant to the product.
- **Operational cost:** Cost per user/transaction if relevant.
- **Satisfaction/trust:** Qualitative or survey signal, clearly labeled as such rather than presented as a hard metric.

## Support-quality and retention metrics (`/metrics`, run against by `ops-team`)

`product-team` defines these; `ops-team` runs the operation that moves them. Define them together so a number that goes red has an owner and a next action, not just a dashboard tile. Pick the ones that fit the product — a marketplace and a one-off physical order have different retention shapes.

```markdown
## Support and retention metrics: [product/area]

**Support volume:** tickets/messages per [100 active users | order | week], split by topic — the topics tell product what to fix; the total tells ops what to staff.
**First-response and resolution time:** median and worst-case, by channel (WhatsApp, email, in-app). State the target, not just the measurement.
**Self-serve deflection:** share of questions resolved without a human (help content, automated first-line reply, status page). Rising deflection with flat satisfaction is the goal; rising deflection with falling satisfaction means the automation is hiding problems.
**Repeat contact rate:** how often the same user comes back about the same issue — the honest quality signal, since a fast wrong answer looks great on response time.
**Escalations to dev-team:** count and cause — each one is either a bug or a missing admin tool.
**Retention:** the cohort measure that fits the product (week-N active, repeat purchase within [period], renewal rate), with the cohort definition written down so it's not redefined every month.
**Churn reason:** categorized from actual cancellation/exit conversations, not guessed. Feeds `/prioritise`.
**Owner and review cadence:** who looks at this, how often, and what threshold triggers a `/retain` or `/support` pass from ops-team versus a spec change from product-team.
```

Guard against two things: measuring satisfaction only among people who answered a survey (survivor bias), and celebrating low ticket volume when it's really low usage.
