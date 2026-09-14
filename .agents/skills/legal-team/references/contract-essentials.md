# Contract Essentials

A checklist for what each core clause actually needs to say, and the ways each one commonly goes wrong. Use this for `/review`, `/draft`, and `/negotiate` — not every contract needs every clause, but every clause present should be checked against this.

## Parties and recitals

Get the legal names and entity types exactly right — "Ormuva Ventures Ltd" and its founder personally are different legal persons, and a contract signed with the wrong one can bind (or fail to bind) the party actually intended. Check that whoever is signing actually has authority to bind the entity.

**Common failure:** a contract that names a person where it should name the company, exposing an individual to personal liability that was meant to sit with the business.

## Scope of work / subject matter

Specific enough that both sides would agree, without a dispute, on whether it was performed. Vague scope ("provide consulting services") is the single most common source of scope-creep disputes.

**Common failure:** scope broad enough to argue either way later — good for nobody, since it just moves the disagreement to when it's most expensive to have it.

## IP ownership and assignment

State explicitly who owns what's created: work product, code, designs, documentation. For anyone doing paid or equity-compensated work for the company — employee, contractor, or equity-for-work hire — the default should be that IP created for the company is assigned to the company, not left with the individual. This includes a "pre-existing IP" carve-out for anything the person brings that predates the engagement, so ownership of that stays clearly separate.

**Common failure:** a contractor or equity-based hire with no IP assignment clause at all — under many jurisdictions' default rules, the creator retains ownership unless it's explicitly assigned, meaning the company may not actually own core product work it paid or granted equity for.

## Confidentiality

Define what counts as confidential (be specific — "all information" is hard to enforce), how long the obligation lasts (including after termination), and carve out standard exceptions (already public, independently developed, required by law to disclose).

**Common failure:** no survival period stated, so confidentiality obligations arguably end the moment the contract does — exactly when a departing party might be most tempted to use what they learned.

## Payment terms

Amount, currency, timing, method, and what happens on late payment (interest, suspension of work, right to terminate). For cross-border work, state the currency explicitly and who bears currency-conversion risk.

**Common failure:** "payment due upon completion" with no defined trigger for what counts as complete — invites a dispute exactly when payment is due.

## Liability and indemnification

A liability cap limits how much one party can be forced to pay the other if something goes wrong — reasonable caps (e.g., tied to fees paid) protect a smaller party from an exposure disproportionate to the deal size. Indemnification means one party compensates the other for a specific category of loss (e.g., IP infringement, a data breach caused by their negligence) — it should be scoped to real, identifiable risks, not open-ended.

**Common failure:** no liability cap at all, or indemnification broad enough to cover the other side's own negligence — both leave one party exposed to a loss wildly out of proportion to what they're being paid.

## Warranties and disclaimers

State what's actually being promised about the product/service (it will perform as described, it doesn't infringe third-party IP) and what's explicitly not promised (fitness for a particular unstated purpose, uninterrupted availability, etc.) — especially important for software/AI-adjacent products, where overpromising performance creates real exposure if it underperforms.

**Common failure:** silence on warranties, which in many jurisdictions means broad implied warranties apply by default — often broader than either side actually intended.

## Termination

How either side can end the agreement: for convenience (with notice), for cause (breach, with a cure period), and what happens to in-progress work, payment for work completed, and any licenses granted, once terminated.

**Common failure:** no "for convenience" exit for a services agreement — locks both sides into a relationship neither wants to continue, which usually produces a worse outcome than a clean exit would have.

## Dispute resolution and governing law

State which jurisdiction's law governs and where disputes get resolved (courts, or a specified arbitration/mediation process first). For cross-border relationships, this matters more than most other clauses — without it, the answer is genuinely uncertain and expensive to resolve.

**Common failure:** silent on governing law in a cross-border contract, leaving a real, unresolved question hanging over any future dispute.

## Assignment and subcontracting

Whether either party can transfer their rights/obligations to someone else (e.g., if the company is acquired, or a contractor wants to bring in help). Usually reasonable to require consent for assignment, at minimum.

**Common failure:** unrestricted assignment rights, meaning a counterparty could hand the relationship off to an unknown third party with no say from the other side.
