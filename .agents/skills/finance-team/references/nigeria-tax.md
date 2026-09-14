# Nigerian Tax and Statutory Obligations

**Read this with extra caution on specifics.** Nigeria's tax framework changed substantially via the Nigeria Tax Act 2025 and Nigeria Tax Administration Act 2025 (NTA/NTAA), effective 1 January 2026 — a genuine overhaul, not a minor update. Even current sources disagree on some specifics post-reform (notably the small-company CIT turnover threshold, cited as both ₦50 million and ₦100 million across otherwise credible sources). Treat every rate and threshold below as needing a live verification against FIRS/NRS's own current published guidance before it's relied on for an actual filing or decision — this file gives the shape of the system, not a citable figure.

## Companies Income Tax (CIT)

Nigeria now uses a small-company exemption: qualifying small companies (turnover below a threshold in the ₦50-100 million range depending on source — verify current figure) with fixed assets below ₦250 million pay **0% CIT**. Above the small-company threshold, rates step up (a "large company" rate of 30% is consistently cited; some sources describe an intermediate "medium company" tier). Some sectors (notably professional services — law, accounting, engineering firms) are reportedly excluded from the 0% small-company rate regardless of turnover — worth checking specifically if the entity in question is services-classified rather than product-classified.

**Even a CIT-exempt company still has to:** register for a Tax Identification Number, keep proper financial records, and file annual returns (even a nil return) — exemption from paying doesn't mean exemption from filing or record-keeping. This is a common, costly misunderstanding.

## VAT

Standard rate is 7.5%. A small-business VAT exemption applies below a turnover threshold commonly cited as ₦25 million — verify current status, since this may have moved with the broader reform. The 2026 reform reportedly also expanded input VAT recovery (businesses can now recover VAT paid on a broader range of purchases tied to taxable supplies, not just raw materials) — relevant to actual VAT-payable calculations, not just the registration threshold.

## Withholding Tax (WHT)

WHT functions as an advance payment against final income tax, deducted at source on qualifying payments (typically cited around 5% for most services and 2% for goods, for resident payees). A "safe harbor" exemption reportedly applies for small businesses/unincorporated entities on transactions at or below ₦2 million per month, provided a valid tax ID is on file with the paying counterparty — relevant for Sinovx-type consulting income from smaller clients. Verify current rates and the safe-harbor threshold before relying on either.

## Capital Gains Tax (CGT)

Reformed alongside CIT — the corporate CGT rate has reportedly been raised and harmonized with the CIT rate (moving well above its old lower rate), and now explicitly reaches indirect offshore transfers of shares in some circumstances. Relevant to any equity sale or exit modeling, and to the Nigeria Startup Act's investor CGT exemption below, which sits as a specific carve-out against this general rate.

## Development Levy

A new consolidated levy (reportedly around 4% of assessable profits) that replaces several previously separate levies (Tertiary Education Tax, IT Levy, NASENI Levy, Police Trust Fund Levy) into one. Small companies exempt from CIT are commonly also exempt from this levy — verify the exact linkage.

## Payroll-linked statutory contributions

See `legal-team`'s `references/employment-and-contractors.md` for the employment-law side of these; from the numbers side, budget for: pension (contributory, commonly cited combined minimum around 18% of emoluments split employer/employee, mandatory above a headcount threshold), NSITF (1% of gross payroll, employer-only), ITF (1% of annual payroll, employer-only, above a headcount/turnover threshold), and PAYE (withheld from employee pay, remitted to the relevant state authority). Budget these as real employment costs on top of gross salary when modeling the cost of a hire, not as an afterthought.

## Nigeria Startup Act 2022 incentives — worth actively checking eligibility for

Distinct from the general tax framework above: a company that obtains the **Startup Label** (via NITDA's Startup Portal) as a qualifying "labelled startup" — broadly, a Nigerian-incorporated company under 10 years old, with objectives centered on digital technology innovation, and at least one-third Nigerian founder/co-founder shareholding — can access:

- **Pioneer Status Incentive** — an income tax holiday (Companies Income Tax exemption) for an initial 3 years, extendable by 2 more, for eligible sectors.
- **Full R&D expense deduction** — research and development costs incurred wholly in Nigeria are fully tax-deductible, without the restrictions that otherwise apply.
- **Reduced withholding tax** — a labelled startup can withhold only 5% (versus the standard rate) on payments to non-resident companies providing technical, consulting, professional, or management services.
- **ITF exemption** — exemption from the standard 1% payroll ITF contribution where the startup provides in-house training instead.
- **Investor-side incentives** — a tax credit for qualifying investors (angels, VCs, PE funds) investing in a labelled startup, and CGT exemption on disposal of that investment after a minimum holding period (commonly cited as 2 years) — genuinely useful to know when talking to investors, since it's a real incentive for them, not just the company.

This is worth flagging proactively for any Nigerian tech-product venture that meets the criteria and hasn't yet applied — it's a real, underused benefit specifically because it requires an active application (via the Startup Portal) rather than applying automatically.

## When this needs a licensed accountant or tax advisor, not just this skill

Actual return preparation and filing, any FIRS/NRS audit or inquiry, the Startup Label application itself (or at minimum a professional review before submitting), and any multi-entity consolidation or cross-border tax question should go to a qualified accountant/tax advisor rather than being finalized from this skill's output alone.
