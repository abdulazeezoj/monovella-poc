# SOPs and Vendor Operations

How to turn "we handle this somehow" into "here's exactly how, and who owns it", and how to run supplier relationships so the numbers `finance-team` modelled hold up in practice. Process exists to prevent the second occurrence of a problem, not to add ceremony.

## When a SOP is worth writing

Write one when any of these is true:

- The same thing has gone wrong twice, and the second time it was the same cause.
- Something high-stakes is about to happen for the first time (first bulk order, first payroll, first customer data export, first product recall).
- A task is about to be handed from the founder to someone else, or from one person to another.
- A task runs on a schedule and depends on someone remembering it.
- A regulator, a bank, an auditor, or a big customer will ask "how do you do this".

Don't write one for a task done once, a task only the founder will ever do and that has never gone wrong, or anything the tool already enforces. An unused SOP is worse than none. Review each SOP when it fails, when the tool changes, or every six months, whichever comes first; delete the ones nobody has opened.

## SOP structure

One page where possible. Keep the format identical across SOPs so people know where to look. Full template in `templates.md`.

1. **Name and purpose.** What this is for and the specific failure it exists to prevent, in one or two sentences. If the failure can't be named, the SOP probably isn't needed.
2. **Owner.** One named person accountable for the outcome and for keeping the SOP current. A backup person if the process is load-bearing.
3. **Trigger.** What starts it: a schedule ("every Friday by noon"), an event ("a supplier delivery arrives"), or a request.
4. **Inputs.** What you need before starting: files, access, stock, information, approvals.
5. **Steps.** Numbered, one action each, in the order they happen, with who does it if more than one person is involved. Include the check that catches the common mistake at the point where it happens, not at the end.
6. **Done right looks like.** The observable result: a reconciled sheet with zero variance, a signed delivery note with counted quantities, a confirmation message sent to the customer. This is the part people skip and the part that makes the SOP checkable.
7. **If it goes wrong.** The two or three most likely failures and what to do about each, including who to tell.
8. **Automatable steps.** See below.
9. **Last reviewed.** Date and by whom.

Write in imperative voice ("Count the cartons against the delivery note") rather than descriptions ("Cartons are counted"). Prefer a short checklist to a paragraph.

## Marking automatable steps for dev-team

For each step, ask: does this need judgment, or just consistency? Consistency is a candidate for automation. Tag steps in the SOP as one of:

- **[script]** — a deterministic transformation: reconcile a payment export against orders, generate a delivery manifest, rename and file receipts.
- **[scheduled]** — something that runs on a timer: a Monday stock-level check, a reminder three days before a supplier's payment is due, a weekly export of support metrics.
- **[form]** — structured input that currently arrives as free text: a delivery-receipt form with quantity and condition fields, a customer-return form, a supplier onboarding form.
- **[alert]** — a threshold that should notify someone instead of waiting to be noticed: stock below reorder point, a delivery past its promised date, a payment failure count spike.
- **[human]** — a judgment call, a negotiation, a customer conversation, an exception. Leave it with a person.

Hand the tagged steps to `dev-team` as a single request with the SOP attached, how often the step runs, how long it takes by hand, and what the failure costs. That's enough for them to size it. `security-team` reviews anything that touches customer data or money before it runs unattended. Automate one step, confirm it works for a few cycles, then the next; a half-automated process nobody trusts is worse than a manual one people follow.

## Supplier scorecard

Score every supplier that is load-bearing (the venture can't deliver without them) quarterly, and any new supplier after their first three deliveries. Score 1 to 4 per dimension with a line of evidence; no evidence, no score. Format in `templates.md`.

| Dimension | What to measure | Where the evidence comes from |
|-----------|-----------------|-------------------------------|
| Reliability | on-time delivery rate, fill rate (ordered vs delivered), how they communicate a delay | delivery log, chat history |
| Quality | defect or return rate, consistency batch to batch, whether they fix problems or argue | QC records, customer returns tagged to supplier |
| Terms | price versus alternatives, payment terms (upfront, on delivery, credit), minimum order, price stability in naira, invoicing accuracy | quotes, invoices, `finance-team`'s landed cost |
| Lead time | quoted versus actual, variability, ability to expedite | order and delivery dates |
| Backup | does a tested alternative exist, and how long would switching take | the backup register below |
| Relationship | responsiveness, a named contact, willingness to negotiate when things change | judgment, with examples |

Watch trends more than snapshots. A supplier drifting from 4 to 3 on reliability over two quarters is the early warning; act then, not at the stockout. Share the scorecard with the supplier where the relationship can take it; most will improve when they know what's measured.

## Single-supplier risk

A single supplier on anything load-bearing is a named risk, not a fact of life, the same way `security-team` treats a single point of failure in infrastructure. For each load-bearing input, keep a backup register: the input, the primary supplier, the identified backup, whether the backup has actually been tested with a small order, the switching cost (time, money, quality change), and what would trigger the switch.

Mitigations, cheapest first: qualify a second supplier with a small trial order before there's a crisis; keep a buffer stock sized to the primary's realistic worst-case lead time; agree a written price and lead-time commitment with the primary; and split volume between two suppliers for the most critical input even at a slightly worse unit price. In Nigeria, factor in the things that actually cause failures: FX moves on imported inputs, port and customs delays, fuel and transport disruption, power affecting a manufacturer's output, and a supplier's own cash-flow problems. Ask `finance-team` to price the buffer stock and the dual-sourcing premium; flag it to `startup-team` if the exposure is venture-level.

## Quality control for physical goods

Check at the points where a defect is cheapest to catch, and record every check so the supplier scorecard has evidence.

- **Incoming inspection.** Count against the delivery note before signing. Open a sample proportional to the batch (a few units from a small delivery, more from a large one, and everything for high-value items). Check against a written spec: dimensions, weight, colour, packaging, expiry date, labelling. Photograph anything wrong before it's moved. Reject or quarantine on the spot; a signed delivery note with no notes is agreement that it was fine.
- **Storage.** Conditions the product needs (temperature, humidity, off the floor, away from sun), first-expiry-first-out for anything perishable, and a monthly count reconciled against the stock record.
- **Outgoing check.** Before dispatch: right item, right quantity, right customer, undamaged packaging, any required insert or label. A second pair of eyes for high-value orders, or a photo of the packed order when it's one person.
- **Returns and complaints.** Log every return with the reason and the supplier or batch it came from. A return rate rising on one batch is a supplier conversation; rising across batches is a spec or handling conversation.
- **Spec sheet.** One per product, agreed with the supplier in writing, with photos of acceptable and unacceptable examples. Disputes get settled against it.

For regulated goods (food, drugs, cosmetics, medical devices, anything with a NAFDAC or SON requirement), treat the applicable registration, labelling, and storage rules as part of the spec, and ask `legal-team` to confirm what currently applies before the first order.

## Weekly ops review

Thirty minutes, same time each week, from the delivery log, the stock record, the QC log, and the supplier chats. Output uses the `/review` format in `templates.md`.

1. **Deliveries.** Each delivery due this week: arrived on time, on spec, in full? Note each miss against the supplier.
2. **Stock.** Anything at or below reorder point, anything over-stocked or approaching expiry. Place or plan orders now with the real lead time.
3. **Quality.** Returns, complaints, and incoming-inspection rejects this week, tagged to supplier or batch. Anything recurring becomes a supplier conversation or a spec change.
4. **Money.** Supplier payments due this week and next; confirm with `finance-team` that cash is there. Any price change notices received.
5. **Process misses.** Anything that went wrong in a process this week. Second occurrence of the same thing means a SOP is written or fixed before next week's review.
6. **Risks.** Any change in the backup register: a primary supplier wobbling, a backup no longer available, an FX or logistics change that affects lead time or price.
7. **One thing to move to automation.** Pick the manual step that cost the most time this week and tag it for `dev-team`.
