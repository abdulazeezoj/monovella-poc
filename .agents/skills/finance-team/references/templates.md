# Output Templates

Use the sections relevant to the task — these are checklists, not mandates to fill in every field regardless of relevance.

## /runway

```
## Runway: [entity]

**Cash on hand:** [amount, as of date]
**Gross burn (monthly):** [total operating expense]
**Revenue (monthly):** [current]
**Net burn (monthly):** gross burn − revenue
**Runway:** cash on hand ÷ net burn = [X months]

**Scenarios:**
| Scenario | Net burn | Runway |
|----------|----------|--------|
| Current pace | | |
| [a specific change, e.g. "+1 hire"] | | |
| [a specific change, e.g. "cut marketing 30%"] | | |
```

## /model (financial model summary)

```
## Model: [entity/period]

**Known (actual):** [figures with source/date]
**Assumed (labeled):** [each assumption stated explicitly, e.g. "10% MoM growth from month 3"]
**Derived:** [calculated outputs — runway, break-even, projected cash]

**Sensitivity:** [which assumption(s) the conclusion moves most on]
```

## /raise (fundraising math)

```
## Raise model: [round]

**Pre-money valuation:** [amount]
**Amount raised:** [amount]
**Post-money valuation:** pre-money + raised
**New investor ownership (post-money basis):** raised ÷ post-money

**Option pool:** current [X]% → required [Y]% post-money
  — expansion timing: pre-money (dilutes existing holders) / post-money (shared with new investor)
**SAFE/note conversions included:** [list each, with cap/discount, and resulting shares]

**Fully diluted ownership after the round:**
| Holder | Shares | % |
|--------|--------|---|
| Founders | | |
| Option pool | | |
| SAFE/note holders | | |
| New investor | | |

**What this means in plain terms:** [the actual founder ownership change, stated directly]
```

## /tax

```
## Tax position: [entity]

**Entity type and turnover band:** [as it affects CIT/VAT/WHT treatment]
**Applicable obligations:** [CIT, VAT, WHT, Development Levy, payroll contributions — only those that actually apply]
**Exemptions/incentives to check:** [small-company thresholds, Startup Act eligibility]
**Filing calendar:** [what's due, when]
**Verification status:** [confirmed against current FIRS/NRS guidance / needs verification — be explicit]
```

## /grant

```
## Grant screen: [venture / need]

**Impact mechanism (from startup-team's four-link test):** [one line — the specific mechanism, and the SDG(s) it can defensibly claim]
**Checked on:** [date] — every row verified against the live call, not a summary

| Program | Category | Eligibility fit | Funds / excludes | Ceiling & currency | Co-funding | Deadline | Reporting & audit burden | Call |
|---------|----------|-----------------|------------------|--------------------|------------|----------|--------------------------|------|
| [name + link] | DFI / foundation / accelerator / government / corporate | [hard miss or fit, and why] | [funds X; excludes Y] | [amount, currency, tranche or reimbursement] | [amount or none] | [date] | [frequency, audit yes/no, est. founder hours] | Pursue / Marginal / Skip |

**"Reporting costs more than the grant" test (for each Pursue):** [est. total founder hours × stated value of time + audit fee] vs. [net award after co-funding] → [verdict]
```

```
## Budget and use of funds: [program]

**Source model:** [which model/version the lines come from] — same labeled assumptions carried across
**Funded period:** [start–end] **Currency:** [call's currency, at rate X as of date]

| Funder category | Line item | Qty | Unit cost | Basis (quote / actual / assumption) | Grant | Co-funding | Total |
|-----------------|-----------|-----|-----------|--------------------------------------|-------|------------|-------|
| | | | | | | | |
| **Totals** | | | | | = requested amount | = required match | |

**Excluded by the call and funded elsewhere:** [item → source of that money on the runway model]
**Overhead/indirect:** [funder's rule applied]
**Runway effect:** awarded and disbursed on [schedule] → [runway]; not awarded → [runway]
```

```
## Impact metrics: [program]

| Dimension | Metric (funder's indicator name where one exists) | Definition & unit | Data source | Baseline | Target | Reporting period |
|-----------|-----------------------------------------------------|-------------------|-------------|----------|--------|------------------|
| Access / Affordability / Reliability / Income & productivity / Safety & trust | | | [existing system or planned collection] | [figure with date, or "none — baseline study in period 1"] | | |

**Why these dimensions:** [where the business model itself produces the change]
**Not claimed:** [dimensions deliberately left out, and why]
```

```
## Application outline: [program]

| Call section (their heading) | Source document | Status | Gap |
|------------------------------|-----------------|--------|-----|
| [e.g. Problem statement] | [product-team spec §X] | ready / adapt / missing | [what real work fills it] |

**Word/page limits and format constraints:** [from the call]
**Attachments required:** [registration docs, financials, letters, CVs — which exist, which don't]
**Owner and deadline:** [internal submit-by date, ahead of the call's closing date]
```

```
## Post-award calendar: [program]

| Date | Obligation | Type | Evidence needed | Prep starts |
|------|------------|------|-----------------|-------------|
| | [tranche condition / narrative report / financial report / milestone / audit / site visit / closing report] | | | |

**Fund traceability:** [account or ledger tag per budget line; reallocation tolerance and consent rule from the agreement]
**Sent to legal-team for agreement review:** [date] — IP, clawback, publicity, investor conflicts
**Needs a licensed accountant:** [audit, grant income tax treatment]
```

## /review findings

```
## Finding: [short title]

**Severity:** Critical / Major / Moderate / Minor
**Category:** Unrealistic assumption / Missing cost / Calculation error / Compliance gap / Presentation risk
**Issue:** what's actually wrong, described concretely
**Impact:** what happens if this goes unnoticed (a bad decision, an investor catching it in diligence, a filing error)
**Recommendation:** the specific fix
```

Severity guide (same scale as the other team skills):
- **Critical** — a number that's simply wrong, an assumption that invalidates the model's conclusion, a real compliance/filing gap.
- **Major** — an unrealistic assumption that meaningfully changes the outcome, a missing real cost category.
- **Moderate** — a narrower gap that affects precision but not the core conclusion.
- **Minor** — presentation, labeling, or formatting issues.
