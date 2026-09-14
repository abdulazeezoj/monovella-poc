# Output Templates

Use the sections relevant to the task — these are checklists, not mandates to fill in every field regardless of relevance.

## /review findings

```
## Finding: [short title]

**Severity:** Critical / Major / Moderate / Minor
**Clause/Location:** [section or clause referenced]
**Category:** Missing protection / Ambiguity / One-sided term / Compliance gap / Invented-risk (over-drafted)

**Issue:** what's actually wrong, described concretely
**Exposure:** what happens if this goes unaddressed and the situation it's meant to cover actually occurs
**Recommendation:** the specific fix — proposed language where useful, not just "clarify this"
**Needs a lawyer:** yes/no, and why
```

Severity guide (same scale as the other team skills, so findings read consistently):
- **Critical** — missing IP assignment, no liability cap on a real risk, unclear or absent governing law on a cross-border deal, a compliance gap involving sensitive data. Fix before signing/shipping.
- **Major** — a real gap or one-sided term that creates meaningful exposure but isn't immediately catastrophic (e.g. no "for convenience" termination, vague scope).
- **Moderate** — a real but narrower gap (e.g. missing confidentiality survival period).
- **Minor** — wording clarity, formatting, internal consistency.

Order findings by severity, not by where they appear in the document.

## /draft

```
[Document title, entity names, and jurisdiction stated at the top]

[Standard sections per references/contract-essentials.md, drafted from the
actual facts provided — no placeholder terms left unfilled without flagging
them explicitly as "NEEDS INPUT: ___"]

---
DRAFT — for review by a licensed lawyer before use or signature.
This is a first-pass draft based on the facts provided; it has not been
reviewed by counsel and should not be treated as final.
```

**`/draft` for a grant-agreement review memo** — the output is a memo on someone else's document, not a new agreement, so use this shape instead. It's written for `finance-team` (who owns the application and the numbers) and the founder deciding whether to sign; keep the hard conditions separate from what could be negotiated, since a funder often won't move on the former and will on the latter.

```
## Grant agreement review: [funder — programme — entity receiving it]

**Governing law / dispute resolution:** [as stated in the agreement]
**Amount and disbursement conditions:** [milestones, tranches — figures from the
  document, not estimated]

**Hard conditions the company is binding itself to:**
- IP: [who owns / licenses what's built with the money]
- Clawback: [triggers, amount, timeline]
- Reporting and audit: [cadence, format, record-keeping period]
- Publicity: [credit obligations, approval needed before announcing]
- Exclusivity / restrictions: [other funding, sector, geography, post-grant obligations]

**Conflicts found:** [with existing investor rights, prior IP assignments,
  entity structure — or "none found" against the documents actually checked]
**Negotiable terms worth raising:** [with proposed language where useful]
**Hand-offs:** finance-team [reporting/tracking to set up before disbursement];
  content-team [publicity wording to follow]
**Recommendation:** sign / sign with changes / don't sign — and why

---
DRAFT — for review by a licensed lawyer before the agreement is signed.
Based on the agreement text as provided; sections not provided were not reviewed.
```

## /risk

```
## Risk scan: [plan/product/situation]

| Risk | Category | Severity | What closes it |
|------|----------|----------|-----------------|
| ...  | Contract / IP / Equity / Compliance / Dispute | Critical/Major/Moderate/Minor | concrete next action |

**Highest-priority items:** [the 1-3 things worth doing first, and why —
not everything at once]
```

Named risks, not vague unease — each row should be specific enough that the person reading it knows exactly what document or action closes it.

## /structure (equity/entity)

```
## Structure: [situation]

**Entities involved:** [name each, and how they relate]
**Proposed equity/ownership:** [who gets what, and the logic]
**Vesting:** [schedule and cliff]
**IP assignment:** [what's covered, from whom, as of when]
**Open questions:** [anything that depends on a decision not yet made]
**Documents needed:** [the actual agreements this requires]
```

## /employ

```
## Employment/contractor check: [role]

**Proposed classification:** Employee / Contractor
**Substance test:** control, integration, exclusivity, payment structure —
  assessed against how the role actually works, not just the intended label
**Recommendation:** [classification] because [specific factors]
**If employee — statutory obligations triggered:** pension, NSITF, ITF, PAYE
  (only those that actually apply at current headcount/turnover)
**Agreement needed:** [employment contract / contractor agreement], covering
  role, compensation, IP assignment, confidentiality, and termination terms
**Non-compete note:** [whether one is warranted, and realistic enforceability
  given Nigerian courts' reasonableness test — confidentiality/non-solicitation
  as the more reliable alternative]
```

## /govern

```
## Governance check: [entity]

**Filings due/overdue:** [annual return status, any pending director/address changes]
**Resolutions needed:** [decisions made or pending that need formal documentation]
**Registers to update:** [members / directors / charges]
**Priority order:** [what to close first, and why]
```

## /comply

```
## Compliance check: [area, e.g. data protection]

**Applicable framework(s):** [name them, with jurisdiction]
**Current status:** [what's in place today, from what was provided]
**Gaps:** [specific, each tied to a specific requirement]
**Remediation checklist:** [ordered, concrete steps — not just "get compliant"]
```
