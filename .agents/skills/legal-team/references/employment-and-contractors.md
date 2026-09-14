# Employment and Contractor Relationships

Grounded in Nigerian labour and tax law. Flag explicitly when a hire is based outside Nigeria or works for a foreign-registered entity — different rules apply and shouldn't be blended with the Nigerian framework below.

## Employee vs. contractor: it's a substance test, not a label

Calling someone a "contractor" in the agreement doesn't make them one if the actual working relationship looks like employment. Nigerian courts and regulators look at the whole relationship, weighing factors like:

- **Control** — does the company direct *how* and *when* the work is done (employee-like), or just *what* outcome is wanted (contractor-like)?
- **Integration** — is the person embedded in the company's regular operations and team structure, or engaged for a distinct, bounded piece of work?
- **Exclusivity and tools** — does the person work only for this company, using company equipment/systems (employee-like), or do they work for multiple clients using their own tools (contractor-like)?
- **Payment structure** — a steady salary paid on a fixed schedule looks like employment; project- or milestone-based payment looks more like a contractor relationship.

**Why this matters concretely:** under the Nigeria Tax Administration Act 2025, misclassifying an employee as a contractor carries direct financial exposure — administrative penalties per misclassified individual, plus retroactive PAYE tax liability with interest, retroactive pension contributions with a monthly penalty for non-remittance, and NSITF arrears. It also exposes the company to wrongful-termination claims from someone treated as a contractor but legally entitled to employee protections. Genuine contractor relationships avoid all of this — the risk is specifically in mislabeling an employment relationship to sidestep the obligations below.

## Statutory obligations that come with genuine employment

These apply once someone is a genuine employee (thresholds noted where they exist — verify current figures before relying on them for payroll, since rates and thresholds do get updated):

- **Pension (Pension Reform Act 2014)** — a contributory scheme; combined minimum contribution around 18% of monthly emoluments, typically split employer/employee (commonly cited as employer ≥10%, employee ≥8%, though sources vary on the exact split — verify current PenCom guidance). Compulsory for employers with a threshold headcount (commonly cited as 15 or more employees); voluntary but still common practice below that. Requires setting up Retirement Savings Accounts through a licensed Pension Fund Administrator.
- **NSITF (Employees' Compensation Act 2010)** — 1% of total gross monthly payroll, employer-only, funding workplace injury/disability/death compensation. Applies once an employer meets the qualifying threshold (commonly 5+ employees).
- **ITF (Industrial Training Fund)** — 1% of annual payroll, employer-only, funding vocational training; applies to employers with 5+ employees or turnover above a stated threshold (commonly cited as ₦50 million) — verify current thresholds. Employers who document staff training can claim partial reimbursement.
- **PAYE income tax** — withheld from employee salary and remitted to the relevant state tax authority.
- **NHF (National Housing Fund)** — historically a mandatory deduction for eligible employees; treat its current mandatory/voluntary status as something to verify at the time, since this has reportedly shifted.

None of these apply the same way to a genuine independent contractor — but a genuine contractor relationship needs a real contract (see Contract essentials) with correct withholding tax treatment on payments, not just the absence of a payslip.

## Employment contract essentials

A written contract should exist before or at the start of employment, covering: role and reporting line, compensation and review cadence, working hours, leave entitlements (annual, sick, maternity — statutory minimums apply and can be enhanced but not reduced), termination notice period and process, confidentiality, and IP assignment for anything created in the role.

## Hand-offs with ops-team and security-team

A hire touches three skills, and the order matters because each one's output is the next one's input. Keep the boundaries explicit so nothing is done twice or, worse, assumed done by the other:

- **`ops-team` runs the process around the contract.** Before this skill is involved: the job description, sourcing, interviews, and the decision to make an offer (its `/hire`). After the agreement is signed: onboarding (its `/onboard`), the tools and access list, the first-weeks plan, and later the operational side of any departure. The trigger into this skill is "we've chosen someone and know how the role will actually work"; the trigger back out is "the agreement is signed."
- **This skill owns classification and the agreement.** The employee-vs-contractor substance test above, the statutory obligations that follow from it, and the written employment or contractor agreement with its IP assignment, confidentiality, and termination terms. Run the classification against how `ops-team` describes the role actually working (hours, tools, exclusivity), not the title in the job posting — if the description reads like employment, say so before the offer goes out, since that changes the cost of the hire.
- **`security-team` provisions access only after the paperwork.** No repository, cloud, customer-data, or admin access until the agreement (and its IP assignment and confidentiality obligations) is signed — access granted to someone with no signed agreement is the exact gap that leaves the company not owning what they build and with no confidentiality obligation to enforce. `ops-team`'s onboarding plan names what the person needs; `security-team` scopes it to least privilege. On departure, the legal end of the relationship and the access revocation close together, on the same day.

Say plainly at `/employ` which of these three steps is done, which is next, and who owns it.

## Non-compete clauses: weaker protection than founders often assume

Nigerian courts follow the common-law position that clauses in restraint of trade are presumptively unenforceable, and will only uphold a non-compete if it's shown to be reasonable in scope, duration, and geography, and doesn't unfairly block someone from earning a living. Nigerian case law has struck down non-competes that were too broad geographically or too long in duration; courts weigh the employer's genuine need to protect trade secrets and client relationships against the employee's right to work. Practical implications:

- Don't rely on a broad, long-duration, or nationwide non-compete as real protection — it's likely to be found unreasonable and unenforceable if actually tested.
- **Confidentiality and non-solicitation clauses are generally on firmer ground** than an outright non-compete, and usually protect the same underlying interest (trade secrets, client relationships, not being immediately undercut by a departing employee) more reliably. Favor these as the primary protection, with any non-compete narrowly scoped (specific competitors or a short, defined period) if included at all.
- This is a genuine gray area with case-specific outcomes — treat any non-compete as needing a lawyer's read if it's ever actually going to be enforced, not just included in a template.

## When this needs a licensed lawyer, not just this skill

An actual termination for cause (versus a straightforward resignation or mutual departure), any employee grievance or tribunal filing, and any situation where classification is already being challenged by a regulator or a worker should go to a lawyer with Nigerian labour law experience rather than being resolved from a draft alone.
