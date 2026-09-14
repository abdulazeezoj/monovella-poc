# Formation and Equity Essentials

Grounded primarily in Nigerian company law (CAMA 2020), since that's the relevant framework for entities incorporated in Nigeria — flag explicitly when a different jurisdiction's rules would apply instead (e.g. a Delaware C-corp structure for a US-facing fundraise), since the two frameworks differ materially and shouldn't be blended without saying so.

## Nigerian incorporation basics (CAMA 2020)

- Companies register with the Corporate Affairs Commission (CAC). A private company limited by shares is the standard startup structure.
- CAMA 2020 allows a **one-person company** — a single-founder company is legally straightforward to form, without needing a second subscriber purely for formality.
- **Minimum issued share capital:** ₦100,000 for a private company (₦2,000,000 for a public company). Under CAMA 2020, share capital must be *fully issued* at incorporation to the subscribers of the memorandum — there's no "authorized but unissued" pool the way the older 1990 Act allowed, so the share split among founders/subscribers is effectively locked in at formation and needs to be decided deliberately, not left vague.
- The Memorandum of Association must state: company name, that the registered address is in Nigeria, the nature of the business, whether it's private or public, and that liability is limited by shares (for a standard limited company).
- After incorporation, register with the Federal Inland Revenue Service (FIRS) for a Tax Identification Number — required to operate and file taxes.
- Related but distinct entities (a parent venture, a subsidiary product, a personal consulting vehicle) are separate legal persons even when one founder controls all of them — contracts, IP, and liabilities attach to the specific entity named, not to "the founder's businesses" generally. Keep this distinction explicit in any drafting; conflating entities is a common, costly mistake (e.g. a contract signed by the wrong entity, or IP created for one company but never assigned from another).

## Founder and contributor equity

Every person receiving equity for work — a co-founder, an early employee, or someone joining on an equity-for-work basis (a designer, a technical contributor) — needs the same two protections, regardless of how much trust exists personally:

**Vesting.** Equity should be earned over time, not granted in full upfront. The overwhelmingly standard structure is **four-year vesting with a one-year cliff**: nothing vests until twelve months of contribution, then typically 25% vests at the twelve-month mark, with the remainder vesting monthly or quarterly over the following three years. This protects the company (and the other equity holders) if someone leaves early — without it, someone who contributes for three months before leaving could retain a full, disproportionate stake indefinitely. This isn't a signal of distrust; it's a standard, expected term that any future investor will look for during due diligence, and its absence is itself a red flag to them.

**IP assignment.** Whoever holds equity or gets paid for work needs to formally assign IP created for the company — covering both past contributions (anything built before the formal agreement was signed, if it relates to the business) and future ones. Without this, a departing contributor or equity holder can have a real claim to work the company has been treating as its own, which becomes a serious problem the moment a due-diligence process or dispute surfaces it.

A written agreement covering both — not a verbal understanding — should exist before, or immediately as, someone starts contributing meaningfully. The agreement doesn't need to be adversarial in tone to be real; it protects everyone involved, including the person receiving the equity, by making the terms of the arrangement unambiguous.

## Ongoing corporate governance

Incorporation isn't a one-time event — a company has continuing obligations to stay in good legal standing, and the risk with these is that nothing visibly breaks when they're missed until a due-diligence process or a filing suddenly needs them:

- **Annual returns to the CAC** — due yearly; lapsing creates escalating penalties and can eventually put a company at risk of being struck off the register.
- **Board and shareholder resolutions** — major decisions (issuing new shares, changing directors, approving a funding round, amending the memorandum/articles) need to be formally resolved and documented, not just agreed verbally, even in a single-founder or small-team company.
- **Statutory registers** — a Nigerian company is required to maintain registers of members (shareholders), directors, and charges (debts secured against company assets). These should be kept current as changes happen, not reconstructed later.
- **Filing changes** — a new director, a change of registered address, an allotment of new shares: each has a corresponding CAC filing requirement, generally with a time limit from when the change occurred.

For a group of related entities (a parent venture, a subsidiary product, a separate consulting vehicle), keep each entity's governance current independently — one entity being in good standing doesn't cover another, even under common ownership.

## Fundraising instruments

Different instruments trade off differently and it's worth knowing which is actually being discussed before drafting or reviewing anything:

- **SAFE (Simple Agreement for Future Equity)** — not a loan and not immediate equity; it converts into equity at a future priced round, usually at a discount to that round's price and/or subject to a valuation cap. Simpler and faster to execute than a priced round, common for early pre-seed money.
- **Convertible note** — similar conversion mechanic to a SAFE, but structured as debt: it accrues interest and has a maturity date, which creates a real (if often deferred or renegotiated) repayment obligation if it doesn't convert before maturity.
- **Priced equity round** — shares issued directly at an agreed valuation now, rather than deferred to a future round. Requires more documentation (a shareholders' agreement, updated articles, share allotment filings) and typically real investor legal review.
- **Shareholders' agreement** — governs the relationship between shareholders once there's more than one meaningful holder: voting rights, board composition, protective provisions (things that need investor consent, like taking on debt or issuing more shares), transfer restrictions (rights of first refusal, tag-along/drag-along rights), and what happens on exit.

Key terms worth understanding in any of these before signing: valuation cap and discount rate (SAFE/note), what triggers conversion, what happens if no qualifying round ever occurs, board seats or observer rights granted, and any protective provisions that constrain the company's future decisions (these can be more consequential long-term than the headline valuation).

**This is squarely a "get a lawyer involved directly" zone once real investor money is on the table** — this skill's role is helping understand what a proposed term actually means and preparing questions/positions to bring into that review, not producing the final, signed version of a priced round's documentation.

## Cap table basics

Track, for every entity: who holds what percentage, what class of security (ordinary shares, preferred, an option/equity promise not yet formalized), vesting status, and any conditions attached. Keep this current as equity is granted, not reconstructed later from memory — a cap table assembled after the fact during a fundraising round is a common source of due-diligence delay and disputes about what was actually promised.

Financial modeling of a cap table (dilution math across funding rounds, option pool sizing, valuation-driven ownership percentages) is a finance-discipline task, not a legal-drafting one — this skill handles the legal documentation of who owns what and under what terms; the numeric modeling belongs with a finance-focused skill.

## When this needs a licensed lawyer, not just a draft

Incorporation filings themselves, any amendment to memorandum/articles, a priced funding round (SAFE, equity round, convertible note) once real investor money and their counsel are involved, and any dispute over an existing equity or IP arrangement — all of these should go to an actual corporate/startup lawyer for review or filing. This skill's role in those situations is preparing clean facts and a first-draft document for that lawyer to work from efficiently, not producing the filed or signed version directly.
