# Consent and Claims

Two separate questions before any campaign or piece of marketing copy ships: is the venture *allowed to send this to this person*, and is *what it says defensible*. A campaign can fail either one on its own. This file is the working standard for both; `legal-team` verifies the specifics for the jurisdiction and sector, and anything in the "route to legal-team" section at the end goes there before publication, not after.

The reason this matters more for a small venture than a big one: a large company can absorb a fine, a blocked sender number, or a public correction. A venture with one WhatsApp business number and a few thousand subscribers cannot. Lose the number or the list and the marketing function is gone.

## Consent: general principles

These hold everywhere, and they're the baseline even where the local law is looser.

- **Opt-in means a deliberate action for marketing specifically.** Someone who bought once, filled in a support form, or handed over a number to receive an OTP did not opt in to promotions. A pre-ticked box is not consent. "By continuing you agree to receive offers" buried in terms is not consent. The person should be able to say, if asked, "yes, I asked for these messages."
- **Record it.** Where and when each contact opted in, to what (email, SMS, WhatsApp, all three), and from which form or flow. A list the venture can't explain the origin of is a list it shouldn't send to. Purchased and scraped lists are the highest-risk source in every jurisdiction, and in practice they also perform badly.
- **Separate transactional from promotional.** An order confirmation, delivery update, password reset, or appointment reminder is transactional and can go to anyone who transacted. The moment it carries an offer, an upsell, or "while you're here," it becomes promotional and needs marketing consent. Don't smuggle promotions into transactional messages; it's the most common way small ventures get flagged.
- **Every promotional message carries a way out.** An unsubscribe link in every marketing email, a stop instruction in every promotional SMS, a clear "reply STOP" or equivalent for WhatsApp broadcasts. The opt-out has to actually work, be honoured quickly, and not require logging in, calling anyone, or explaining why.
- **Identify the sender.** The venture's real name in the message, a real reply path, and for email a real address. A message that hides who sent it is spam by definition, whatever it says.
- **Purpose stays the purpose.** A number collected for delivery updates is for delivery updates. Using it for a new product's launch needs a fresh opt-in, or at minimum a message asking whether they want to hear about it, with no penalty for saying no.
- **Children and vulnerable groups.** No marketing to minors without a lawful basis and a parent's consent; extra care with health, debt, and gambling-adjacent audiences. When in doubt, don't build the segment.

## Channel specifics

**Email.** Opt-in, sender identity, a subject that matches the body, a working unsubscribe honoured promptly, and a physical address or equivalent identifier. Watch deliverability as a compliance signal: rising spam complaints mean the list or the content is wrong, not that the subject line needs to be punchier.

**SMS.** Stricter than email nearly everywhere because it interrupts. Opt-in that specifically covers SMS, sender identification in the message body, a stop instruction, business-hours sending, and low frequency. In Nigeria the NCC runs a Do Not Disturb service that lets subscribers block promotional messages; a venture sending promotional SMS has to respect it, and the aggregator or telco it sends through usually enforces it, so a campaign that ignores it simply won't deliver and may get the sender ID revoked. Verify the current NCC rules and the aggregator's terms before the first send.

**WhatsApp.** Opt-in is required by the platform's own business messaging policy as well as by law: the person must have agreed to receive messages from the business on WhatsApp, and the platform can restrict or ban a number that gets reported. Broadcasts to people who haven't agreed, or from personal numbers at scale, are the fastest way to lose the number. Message templates on the business platform go through approval and have categories (marketing, utility, authentication) with different rules and costs; write to the current policy, not from memory. A "stop" reply has to be honoured.

**Nigeria specifically.** The Nigeria Data Protection Act (NDPA) 2023, enforced by the Nigeria Data Protection Commission, governs how the venture collects, stores, and uses contact data, and requires a lawful basis and valid consent where consent is the basis. The NCC's rules govern telecoms marketing, including unsolicited SMS and the Do Not Disturb service. Both have moved recently and may move again; `legal-team` verifies the current sections, guidance, and any registration or audit obligations before the venture's first campaign, and again when it adds a channel. Recipients outside Nigeria bring their own rules (GDPR and PECR in the EU and UK, CAN-SPAM in the US, CASL in Canada); `sales-team`'s outreach reference summarises them and `legal-team` confirms.

## Claims: what makes one risky

A claim is risky when it would matter to the buyer's decision and the venture can't prove it on demand. Some categories are risky by nature.

**Health claims.** Anything that says or implies a product prevents, treats, cures, diagnoses, or reduces the risk of a condition, or improves a health outcome. This includes soft phrasing ("supports," "helps with," "clinically inspired") and implication by imagery (a lab coat, a stethoscope). Health-adjacent apps and consumer products sit here even when they don't think they do. Regulators in Nigeria (NAFDAC for products, the relevant professional bodies for services) and advertising standards bodies treat these strictly, and the platforms reject the ads outright.

**Financial claims.** Returns, yields, savings, "guaranteed," "risk-free," "no fees" when there are conditions, and anything about a licence or regulatory status. A fintech that isn't licensed for an activity can't imply it is; one that is licensed still can't promise outcomes. Investment and lending copy has its own rules (CBN, SEC Nigeria, and whichever body regulates the specific product) and `legal-team` reviews all of it.

**Comparative claims.** "Cheaper than X," "faster than Y," "the only," "the first," "Nigeria's leading." Each one needs a current, like-for-like basis the venture can show. A competitor's pricing changes; "the first" is almost never checkable; "leading" by what measure. Naming a competitor also raises trademark and defamation questions. Prefer a specific, self-referential claim ("settles in under 24 hours for bank transfers" if that's measured and true) over a comparative one.

**Testimonials and social proof.** A quote used in marketing needs the person's permission for that use, must reflect a real experience, and can't be edited into something they didn't say. Paid or incentivised endorsements have to be disclosed. Logos of companies that piloted but didn't buy, or trialled and left, don't belong on the page.

**Numbers.** Any figure in copy (users, transactions, uptime, savings, percentage anything) has to come from a source the founder can name and would show. Round honestly and say so ("over 400" when it's 412, not "nearly 500"). No number the venture made up, projected, or borrowed from an industry average and presented as its own.

## The defensible claim test

Run every material claim through this before it ships. If it fails any step, rewrite or cut it.

1. **Is it specific enough to be true or false?** "Better banking" can't be checked, which also means it persuades no one. "Transfers land within the hour" can be.
2. **What is the evidence, and could the venture show it tomorrow?** A log, a measurement, a signed contract, a permission email from the customer quoted. Not "we're confident" or "everyone knows."
3. **Is the evidence current and like-for-like?** A benchmark from six months ago before the pricing change doesn't support today's claim. Ten pilot users don't support a claim about "customers."
4. **Does the claim say more than the evidence does?** "Some users reported" is not "users save." "In our pilot" is not "proven." Correlation isn't causation; an anecdote isn't a rate.
5. **Would the founder repeat it, unhedged, to a customer who's about to pay, to a competitor, and to a regulator?** If any of those three makes him want to add a qualifier, the qualifier belongs in the copy.
6. **Is there a required disclosure, condition, or licence attached?** Price conditions, eligibility limits, "terms apply," regulatory status. These go next to the claim, not in a footer.

A claim that passes is usually shorter and plainer than the one that started. That's fine. Specific and true reads as confident; inflated reads as inflated.

## What must go to legal-team

Send these before publication, with the draft and the evidence behind each claim, and expect changes. Don't schedule the send until it comes back.

- Any health, medical, nutritional, or safety claim, however soft.
- Any financial claim: returns, savings, fees, guarantees, licensing, regulatory status, investment or credit products.
- Any comparative or superlative claim that names or clearly points at a competitor, or claims first, only, best, leading, or cheapest.
- Any claim about a certification, standard, licence, partnership, or regulator, and any use of a regulator's or partner's name or logo.
- The consent mechanism itself for a new channel or a new list: the opt-in wording, where it's stored, and the opt-out flow, so `legal-team` can check it against the NDPA, NCC rules, and any foreign jurisdiction the list reaches.
- Anything sent to recipients outside Nigeria, and anything targeting minors, patients, borrowers, or another vulnerable group.
- Contests, giveaways, raffles, and referral rewards, which have their own rules in most jurisdictions.
- Use of any real person's name, image, or words, including customers, employees, and public figures.
- Anything the venture is unsure about. The cost of asking is a day; the cost of not asking is the campaign, the number, or the licence.

For product-capability claims (does the feature actually do this, at this speed, at this scale), the check goes to `product-team` and `dev-team` first, and to `legal-team` only if it also falls in a category above.
