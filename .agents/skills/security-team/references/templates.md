# Output Templates

Use the sections relevant to the task — these are checklists, not mandates to fill in every field regardless of relevance.

## /threat-model

```
## Threat model: [system/feature]

**Scope:** [what's covered, what's explicitly out of scope]
**Data handled:** [and its sensitivity class]
**Trust boundaries:** [where data crosses from less-trusted to more-trusted context]

| Threat (STRIDE category) | Likelihood | Impact | Priority | Mitigation / requirement |
|---|---|---|---|---|

**Handed to dev-team:** [the specific, actionable implementation requirements]
```

## /audit and /comply findings

```
## Finding: [short title]

**Severity:** Critical / Major / Moderate / Minor
**Area:** Access control / Cloud config / Vendor / Compliance gap / Awareness
**Issue:** what's actually wrong, described concretely
**Risk:** what happens if this goes unaddressed and is actually exploited
**Evidence:** what was checked to find this
**Recommendation:** the specific fix, and who owns it (dev-team / legal-team / this skill)
```

Severity guide (same scale as the other team skills):
- **Critical** — exploitable now, with real access to sensitive data or system control (e.g. no MFA on a root cloud account, an unrevoked ex-employee's admin access).
- **Major** — a real, meaningful gap that isn't immediately catastrophic (e.g. no offboarding checklist, an unreviewed vendor with broad data access).
- **Moderate** — a real but narrower gap (e.g. missing billing anomaly alerts).
- **Minor** — hygiene/process improvements with low immediate risk.

Order findings by severity, not by where they were found.

## /incident

```
## Incident: [short title]

**Status:** Detecting / Containing / Recovering / Resolved
**Severity:** [based on realistic scope and impact]
**Timeline:** [key events with timestamps]

**Confirmed:** [facts actually established]
**Suspected:** [plausible but not yet confirmed]
**Unknown:** [genuinely not yet determined]

**Containment actions taken:** [what, when, by whom]
**Personal data in scope:** yes/no/unknown — [if yes or unknown, legal-team looped in at (time)]
**Next actions:** [with owners]
```

Post-incident review (after resolution):

```
## Post-incident review: [incident]

**What happened:** [factual timeline]
**Root cause:** [not just the symptom]
**What worked:** [in the response]
**What didn't:** [without assigning blame to individuals]
**Follow-up actions:** [specific, with owners and target dates]
```

## /vendor

```
## Vendor assessment: [name]

**What it will access:** [actual scope, not theoretical minimum]
**Where data goes:** [region, retention, AI-training-use if applicable]
**Vendor's security posture:** [certifications, public security info, track record]
**DPA needed:** yes/no — [flagged to legal-team]
**Recommendation:** proceed / proceed with conditions / don't integrate
```
