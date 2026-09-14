# Output templates

Use only the sections relevant to the change — these are checklists, not forms to fill out mechanically.

## `/plan` output

```markdown
# Plan: [feature or fix]

## Outcome
What changes for the user/system when this ships.

## Scope
In scope / explicitly out of scope for this change.

## Approach
The chosen design, in a sentence or two, and why it's the simplest option that meets the requirement. If a simpler alternative was rejected, say why.

## Data / schema changes
New tables/columns, migrations needed, backfill plan if any.

## Affected areas
Files/modules/services touched, and anything downstream that could break.

## Tests needed
Unit / integration / e2e / migration / security, scoped to what actually needs coverage.

## Risks
What could go wrong, and the mitigation (or why it's accepted).

## Acceptance criteria
Specific, testable conditions that define done.
```

## `/review` findings format

```markdown
### [CRITICAL | MAJOR | MODERATE | MINOR] — [short title]

**Where:** file:line (or PR diff hunk reference)
**Problem:** what's wrong, concretely.
**Impact:** what breaks or what's exposed if this ships as-is.
**Evidence:** the specific code/config that shows the issue.
**Fix:** a concrete suggested change — not just "consider improving this."
```

Severity guide:
- **Critical** — data exposure, auth bypass, tenant isolation break, will cause an incident.
- **Major** — real bug or security gap that will surface under normal use, not just an edge case.
- **Moderate** — correctness/maintainability issue that should be fixed but isn't urgent.
- **Minor** — style, naming, or small efficiency notes.

## Change/implementation summary (end of `/build`, `/fix`, `/deploy`)

```markdown
## What changed
Brief description, file-level if useful.

## Key decisions
Any non-obvious choice made and why.

## Verification
Commands run and their results (tests, lint, build, manual flow check). State plainly what wasn't verified and why.

## Deployment / migration actions
What needs to happen for this to go live (env vars, migrations, feature flags, manual steps).

## Known limitations / remaining risk
What's intentionally out of scope or not yet handled.
```

## Frontend slice report (each slice of `/build` on a screen, sent to `ui-ux-team`'s `/review`)

```markdown
# Slice [n]: [screen or feature] — [what this slice covers, one line]

## What was built
[Components added or changed, routes touched, which part of the visual plan this implements. Note any place the plan couldn't be followed as written and what was done instead.]

## Screenshots
| Width | States captured | File / location |
|-------|-----------------|-----------------|
| Phone (e.g. 390px) | loading / empty / error / success | |
| Tablet (e.g. 820px) | | |
| Desktop (e.g. 1280px) | | |
[Include a focus-visible shot and a reduced-motion pair when the slice has interactive or animated elements. Long names and large naira amounts in at least one state.]

## Tests run
- Component/unit: [command, result]
- End-to-end (critical flow): [command, result]
- Accessibility pass (axe or equivalent): [violations, or none]
- Keyboard-only walk-through: [done / not yet, anything unreachable]
- Browser console and network: [clean, or what logged/failed]

## Findings for ui-ux-team
[What looked wrong when actually viewed, what was fixed in this slice, what's open and needs a design call. Name the screenshot and state for each.]

## Not yet verified
[Anything that couldn't be run and why — no environment, no credentials, no assistive-tech test.]

## What's next
[The next slice, and anything blocked on ui-ux-team's review before it can start.]
```

## `/debug` notes

```markdown
## Symptom
What's actually observed (error message, stack trace, repro steps).

## Evidence gathered
Logs, recent diffs, environment differences, timing — whatever was actually checked.

## Root cause
Confirmed cause, with the evidence that confirms it (not just the first plausible theory).

## Fix
The smallest sound change that addresses the root cause, plus the regression test added.
```

## `/operate` runbook

```markdown
# Runbook: [system]

## What this is
[One paragraph: what the system does, who uses it, what "healthy" looks like in numbers.]

## Deploy
[Exact commands or pipeline name, expected duration, how to confirm it worked.]

## Roll back
[Exact steps to the previous version, including a served model where relevant.]

## Restore from backup
[Where backups live, how to restore, last tested date, expected data loss window.]

## Rotate a secret
[Each secret: where it's used, how to rotate, what to restart.]

## Alerts and what to do
| Alert | Meaning | First action | Escalate to |

## Recurring automation
[Dependency updates, certificate renewal, scheduled jobs, cost reports: what runs, when, where its health is visible.]

## Known weak points
[Single points of failure, manual steps not yet automated, and the plan for each.]
```

## `/operate` health report

```markdown
# [System] health, [date]

- Uptime / error rate / p95 latency: [numbers vs. last period]
- Cost: [this period vs. budget], biggest movers
- Backups: last success, last restore test
- Updates: pending security updates, anything blocked
- Alerts that fired: [count], which were actionable, which should be tuned
- Model (if any): drift signal, last retrain, current metric vs. acceptance bar
- The one thing to fix next, and why
```
