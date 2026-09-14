# Support and Retention

How to run customer support and retention for a venture where the founder cannot be the support desk. The aim is a three-layer system where most questions never reach a human, the ones that do are the ones that should, and every departing customer teaches the venture something it can act on.

## The three-layer support model

Design support as three layers, each catching what the one above it doesn't. Review weekly what reached the bottom layer; whatever keeps showing up there is the next thing to push up.

**Layer 1: Self-serve.** Resolves the common question before anyone writes in. Belongs here: an FAQ built from questions customers actually asked (not the ones the founder imagines they'd ask), a "how to" page per core task, in-product hints at the exact step where people get stuck (design with `ui-ux-team`), a status page or pinned notice when something is known-broken, and order or delivery tracking the customer can check themselves. Written by `content-team` from the categories this file identifies. Test: could a new customer answer the top five questions at 11pm without messaging anyone?

**Layer 2: Automated first line.** Handles the predictable rest with no founder attention. Belongs here: auto-acknowledgement with a real expected response time, templated replies for routine categories (how to reset a password, where is my order, what does plan X include), automatic status updates when an order ships or a ticket changes state, an AI-assisted reply drafter for categories with a stable correct answer, and a keyword or menu-based router that tags and sorts incoming messages. Built by `dev-team`; `security-team` sets what the automation may see and do (it should never see full payment details, never issue refunds, and never promise a delivery date it can't verify). Test: does every automated reply say what happens next and how to reach a person?

**Layer 3: Human escalation.** The founder or a designated person, with a response-time commitment that is actually kept. Belongs here, always: anything involving money (refund, double charge, failed payment with money debited), health or safety (a product that could harm, a service used in a medical or child-care context), an angry or distressed customer, a legal threat or regulator mention, a press or public-complaint risk, and anything the automation has already failed to resolve once. Test: could a human read the triage note and act without re-asking the customer anything?

## WhatsApp Business setup for a solo founder

In Nigeria most customers will reach for WhatsApp before email or an in-app form, so set it up deliberately rather than letting it be a personal chat that happens to have customers in it. Use the WhatsApp Business app (or the platform API via a provider once volume justifies it; `dev-team` and `security-team` review the provider first) on a business number that is not the founder's personal line.

- **Business profile:** venture name, one-line description, opening hours, location if physical, website, and a catalog link. Customers check this before they trust the number.
- **Greeting message:** sent on first contact. State who this is, what it can help with, the expected response time, and the one self-serve link that answers most questions. Keep it under four lines.
- **Away message:** set for outside opening hours and whenever the founder is unreachable. State when a reply is coming and give the emergency route (a second number or a form) for money, health, or safety issues only.
- **Quick replies:** one per routine category (order status, pricing, how to pay, delivery areas and timing, returns, account access). Write each with the customer's most common phrasing in mind, review monthly against real chats, and retire the ones never used.
- **Labels:** use a fixed set that mirrors the ticket categories below plus a stage (`new`, `waiting-on-customer`, `waiting-on-us`, `resolved`). Label every chat on first reply. Unlabelled chats are how tickets get lost.
- **Catalog:** for physical goods or fixed-price services, list items with price, photo, and availability so pricing questions become self-serve. Keep it current; a stale catalog creates more support than none.
- **Rules:** never take card details in chat, confirm bank transfers only against a real receipt or bank alert, and move anything sensitive (identity documents, medical details) to a channel `security-team` has approved.

## Ticket categorisation scheme

Track tickets by category, not just volume, so a spike in one type surfaces a product or process gap rather than living as a hundred individually closed chats. Use these as the default set and add venture-specific ones only when a category would hold more than a handful of tickets a month.

| Category | Typical contents | Owner of the fix |
|----------|------------------|------------------|
| Access | login, password, OTP not arriving, account locked | `dev-team` |
| Billing | charged wrong amount, double charge, refund, receipt | `finance-team` + `dev-team` |
| Payment failure | transfer not reflecting, card declined, USSD failed | `dev-team` + payment provider |
| Order/delivery | where is it, wrong item, damaged, late | ops (this skill) + supplier |
| How-to | "how do I…", feature confusion | self-serve layer, `ui-ux-team` |
| Bug | something is broken and reproducible | `dev-team` |
| Feature request | "can it do X" | `product-team` |
| Complaint | quality, attitude, unmet promise | founder, then this skill for the root cause |
| Cancellation | wants to stop, downgrade, or delete | `/retain` |
| Other | anything that doesn't fit, reviewed weekly for a new category | this skill |

Record for every ticket: category, channel, severity, time to first response, time to resolution, and whether it escalated. That is enough for the weekly review; don't build a bigger schema until the small one is filling up.

## Escalation rules

Escalate to a human immediately, no automation reply beyond an acknowledgement, when any of these is present:

- **Money:** a refund request, a charge the customer disputes, money debited without service delivered, or any promise that would cost the venture money to honour.
- **Health or safety:** any report that a product or service could have caused harm, or is being used in a context where failure hurts someone.
- **Anger or distress:** insults, threats, all-caps, repeated messages in a short window, or any mention of going public, a lawyer, a regulator, or a consumer-protection body. If a regulator or legal action is mentioned, also inform `legal-team` the same day.
- **Repeat:** the customer has already been through the automated layer once on the same issue.
- **VIP or account-level:** a customer `sales-team` has flagged as a key account, a reseller, or a partner.

When escalating, write a triage note (format in `templates.md`) so the human acts without re-reading the whole thread.

## Response-time commitments by tier

Set commitments the venture can actually keep with its real staffing; a promise missed is worse than a slower promise kept. Defaults for a solo founder, adjusted to real hours:

| Tier | First response | Resolution or firm update | Applies to |
|------|----------------|---------------------------|------------|
| Urgent | within 1 hour during stated hours, 4 hours outside | same day | money, health, safety, service down |
| High | within 4 hours | 1 business day | angry customer, order problem, access blocked |
| Normal | within 1 business day | 3 business days | how-to, billing question, minor bug |
| Low | within 2 business days | next review cycle | feature request, feedback |

Publish the "first response" numbers in the greeting and away messages. Track the actual numbers weekly; if a tier is missed more than a couple of times in a row, either add capacity or change the promise, don't quietly keep missing it.

## Churn investigation method

Never guess the churn reason. Sort each churned or disengaging customer into one of four buckets using data first, then a direct question. Each bucket has a different fix, and treating them all with a generic win-back email wastes the effort.

1. **Payment failure.** They didn't leave; the payment did. Check: last successful charge, failed-charge events, card expiry, whether a retry or a bank-transfer fallback was offered. Common in Nigeria with card declines and transfer delays. Fix: dunning that actually reaches them (WhatsApp or SMS, not just email), a manual transfer option, a grace period before cutting service. Route the retry logic to `dev-team`.
2. **Never activated.** Signed up or paid once and never reached the moment the product is useful. Check: did they complete the first key action (first order, first upload, first invoice sent) and how long after signup. Fix: onboarding and first-run guidance with `ui-ux-team` and `product-team`; a personal message within the first days for high-value signups.
3. **Faded.** Used it, then usage tapered with no complaint. Check: usage frequency over the last 30 to 90 days, last login, last core action. Fix: find the moment usage dropped and what changed then (a price change, a feature removed, a competitor, a season). Ask them; this bucket has the least obvious cause.
4. **Frustrated.** Left after a bad experience. Check: support tickets in the last 60 days, unresolved or slowly resolved tickets, a complaint or a low rating. Fix: resolve the specific thing, apologise specifically, and decide whether the root cause needs a SOP or a product change. These are the ones most likely to say why if asked properly.

Keep an "unknown" column. A customer who can't be placed and doesn't answer stays unknown; don't fill the gap with a plausible story.

## Exit-question script

Send within a day of cancellation or clear disengagement, on the channel they used most. One message, short, from a named person, no survey link as the first move.

> Hi [name], this is [founder] from [venture]. I saw you [cancelled / haven't used X since date]. No pressure to come back; I'd just like to know the one main reason so we can do better. Was it [most likely reason from the data], or something else?

If they reply, ask at most two follow-ups: "What would have needed to be different?" and "Is there anything we can fix for you now?" Log the answer verbatim against the bucket. If they don't reply after one gentle nudge three days later, stop and record "no response". For a frustrated customer who was wronged, lead with the fix and the apology, then ask.

## Weekly review ritual

Thirty minutes, same time each week, from the ticket log and the usage data. Output uses the `/review` format in `templates.md`.

1. Volume by category this week versus the last four weeks. Name any category up noticeably.
2. What reached the human layer, and why each one couldn't be handled a layer up. Pick the single most frequent one and decide: self-serve article, quick reply, automation, or product fix.
3. Response-time actuals against commitments by tier. Note misses honestly.
4. Open tickets older than the resolution commitment; close, escalate, or re-promise each one.
5. Churn this week by bucket, plus exit answers received. Route product findings to `product-team`, payment findings to `dev-team` and `finance-team`.
6. One thing to stop doing manually. Write it as a request to `dev-team` or `content-team` with the ticket count that justifies it.

## What to pull from usage events

Ask `dev-team` to expose these as a simple export or dashboard; a spreadsheet is enough at small scale. Per customer:

- Signup date, plan or first purchase, acquisition channel if known.
- Activation: date of first key action, and days from signup to it.
- Engagement: count of core actions per week for the last 12 weeks, last active date.
- Billing: last successful charge, failed charges with reason code, payment method.
- Support: ticket count by category in the last 60 days, any unresolved ticket, last rating if collected.
- Status: active, at-risk (no core action in a period that's long for this product), churned (cancelled or lapsed past the grace period).

Define "at-risk" from real behaviour (for example, the gap after which most past churners never returned), not a round number picked for convenience. `product-team` owns which metric matters most; this skill runs the weekly pull and acts on it.
