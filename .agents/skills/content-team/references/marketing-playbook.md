# Marketing Playbook

How to do the venture marketing commands (`/landing`, `/seo`, `/email`, `/ad`, `/launch`) well. The main `SKILL.md` says what each command produces and what the truth bar is; this file says how to build the thing so it works for a real buyer, most often a Nigerian one on a phone with patchy data. Output formats are in `templates.md`. Consent, opt-out, and claim risk are in `consent-and-claims.md`, and nothing here overrides that file.

The venture's voice comes from its brand kit. If there isn't one yet, write the brand-voice note (last section) and get it agreed before writing anything at volume. Writing five emails in a voice that then changes is the most common way this work gets thrown away.

## Landing page anatomy

A landing page has one job: get one kind of visitor to take one action. Everything on it either moves that visitor toward the action or answers the thing that's stopping them. Anything else is decoration and gets cut.

Work in this order, because each piece depends on the one before it.

1. **Headline names the outcome.** Not the product category, not a clever line: the change in the buyer's situation. "Get paid the same day your invoice is approved" says more than "Smart invoicing for African SMEs." If the outcome can't be stated honestly because the product doesn't reliably deliver it yet, the positioning isn't ready and `sales-team` and `product-team` need to settle it first.
2. **Subhead names who it's for.** One sentence that lets the right visitor think "that's me" and the wrong one leave. Narrow is fine. A page that tries to speak to everyone converts no one, and a Lagos pharmacy owner and a fintech CTO do not want the same sentence.
3. **Proof that exists.** Real customer names with permission, a real number the founder can defend, a screenshot of the actual product, a quote from a real person who agreed to be quoted. If none of that exists yet, say what does exist: "built by the team behind X," "used by our first 12 pilot pharmacies" (only if true and countable), or nothing. An empty proof slot is better than a fake one, and a reviewer can tell the difference faster than you'd think.
4. **One call to action.** One verb, repeated, that matches what actually happens next. "Start free" when there's a free tier; "Book a demo" when a human has to call; "Chat on WhatsApp" when that's genuinely how first contact works. Do not put "Sign up" and "Learn more" and "Contact us" in the same fold and let the visitor choose.
5. **Objections, answered in order.** List the questions a first-time visitor has in the order they'll think of them, then answer each one where it arises, not in an FAQ at the bottom. For most Nigerian buyers the order is roughly: does this do what I need, what does it cost, how do I pay, is this a real company, what happens if it breaks. Sections follow that order.
6. **Trust cues for a Nigerian buyer.** These are not optional extras; they're the difference between a visitor and a customer.
   - A visible phone number and a WhatsApp link, above the fold or in a sticky footer. A page with only a contact form reads as either foreign or not serious.
   - Pricing in naira, with the actual figure, not "contact us for pricing" unless it's genuinely enterprise-only. If there's a dollar price for foreign customers, show both and be clear which applies.
   - Payment methods, named: bank transfer, card, USSD, the specific gateways in use. "We accept all major payment methods" answers nothing.
   - A physical address or at least a city, a registered business name (with the CAC number if the venture has one), and real faces of the team if they're willing.
   - Any regulator or licence that applies, stated plainly (CBN licence for a fintech, NAFDAC number for a product that needs one), and nothing implied that isn't held. `legal-team` confirms what can be claimed.
   - Load weight. The page has to work on a mid-range Android phone on a mobile connection. Say so to `ui-ux-team` and `dev-team` if the design is heading toward hero videos and large images.

Copy rules that hold across the page: one idea per screen height, short sentences, the buyer's words for the problem (from `sales-team`'s ICP work, or from real support messages) rather than the team's internal vocabulary, and no claim the founder couldn't repeat to a customer's face.

## SEO brief method

An SEO article that works is an honest answer to a question real people type, written better than what's currently ranking. Everything else (density, word counts, "SEO-friendly" phrasing) is noise, and search engines have gotten steadily better at ignoring it.

1. **Start with a real query.** Not a topic, a query: the actual words someone types. Use web search to confirm people search it that way, and check autocomplete and "people also ask" style suggestions for how they phrase it. For Nigerian audiences, check the local phrasing ("how to open a domiciliary account" beats "foreign currency account setup").
2. **Name the intent.** Informational (they want to understand), commercial (they're comparing options), transactional (they want to buy or do it now), or navigational (they want a specific site). The intent decides the format. A comparison query wants a comparison, not a 2,000-word explainer with the comparison buried in the middle.
3. **Read the top results.** Actually fetch and read the top handful. Note what they all cover (the table stakes you have to cover too), where they're wrong or out of date (Nigerian regulatory content goes stale fast), and what they miss: the local angle, the real cost, the step that trips people up, the honest caveat. The gap is the brief.
4. **Decide the angle.** One sentence: "This answers [query] for [who] by [what the top results don't do]." If the angle is "the same as the top result but from us," don't write it. Nobody needs a ninth article that says the same thing.
5. **Title and meta.** The title says what the reader gets and includes the query's words naturally. The meta description is a plain sentence about what's inside that a person would click on; it isn't a ranking factor worth gaming, it's the ad for the article. Keep both short enough that they aren't cut off in results (check current display limits, they shift).
6. **Structure.** Answer the question in the first paragraph. Then headings that follow the reader's next questions, in order. Then the caveats and the honest limits. Then, if it fits, what the venture does about it, once, without turning the article into a pitch.
7. **Internal links.** Link to the venture's related pages where the reader would genuinely want to go next, with descriptive link text. Two or three good links beat ten. Suggest which existing pages should link to this one.
8. **What to refuse.** Keyword stuffing, padding to hit a word count, writing about topics the venture has no standing on just because they have volume, and any claim the research doesn't support. The `/factcheck` bar applies to every sentence.

## Email, newsletters, and short sequences

Every email has one job and one next step. If a draft has two asks, it's two emails.

**The subject line says what's inside.** No clickbait, no "quick question," no fake reply prefixes. Subjects that match the body get opened again next time; subjects that overpromise get the sender marked as spam, which hurts every future send.

**The first line does the work.** Assume the reader sees the subject and the first sentence and nothing else. Put the point there.

**One next step, stated as a link or a plain instruction.** "Reply to this email with your business name" is a fine call to action. So is one button. Three buttons is a menu, not an email.

**Short sequences, and the job of each message:**

- *Welcome* (after sign-up, 1 to 3 emails): confirm what they signed up for, tell them the one thing to do first, and say who to contact when stuck (a real name and a WhatsApp number if that's how the venture works). Don't dump every feature.
- *Onboarding* (first week or two): one email per step that matters, sent when it matters, each unblocking the next action. If the product can trigger these off real behaviour (signed up but never did X), that beats a fixed schedule; ask `dev-team` what's possible.
- *Launch* (a new product, feature, or price): what's new, why it matters to this reader, what to do about it, in that order. One email, maybe one reminder. Not a countdown series.
- *Win-back* (dormant users): acknowledge they've been away without guilt, say what's changed since, offer one easy way back. If nothing has changed, send nothing; a win-back email with no reason is just noise.
- *Newsletter*: only if there's something worth saying at that cadence. A monthly note with one real update beats a weekly one that pads. Every issue: one main item, a couple of short ones, a clear sender.

Plain-text or near-plain emails usually outperform heavily designed ones for small ventures, and they render properly in every Nigerian email client and on every phone. Design when there's a reason.

Consent rules are in `consent-and-claims.md` and are not negotiable. Every marketing email goes only to people who opted in and carries a working unsubscribe.

## SMS and WhatsApp broadcasts

These arrive in the same place as messages from family, so the bar for interrupting someone is higher, and the cost of getting it wrong is a block or a spam report that can take the sender's number down with it.

- **Brevity.** SMS: one message, ideally within a single segment; check the current per-segment character count for the encoding in use, because Unicode characters (including some emoji and accented letters) shrink it. WhatsApp allows more, but treat two or three short lines as the ceiling for a broadcast. Say the thing, give one link or one reply instruction, sign it.
- **Identify the sender in the message.** People don't save business numbers. "Kobo Pharmacy: your order is ready" beats a bare "your order is ready."
- **Timing.** Business hours in the recipient's timezone, and for Nigeria that means not before mid-morning, not after early evening, not on Sunday morning, and not during a public holiday unless the message is about the holiday. A promotional SMS at 6am is how a customer becomes a former customer.
- **Frequency.** Rare. A transactional message (order status, OTP, appointment reminder) can go whenever it's triggered; a promotional one should be occasional enough that it's news when it arrives.
- **Opt-in and opt-out.** Only to numbers that opted in to marketing (not just numbers that transacted once), and every promotional message says how to stop. See `consent-and-claims.md` for the specifics, including Nigeria's Do Not Disturb rules for SMS.
- **WhatsApp specifically.** Use the official business messaging channel where the venture has it; broadcasts from a personal number to people who haven't saved it mostly don't arrive. Templated messages on the business platform have approval and category rules; check the current ones before writing to them. Link previews and images add weight; a plain text with a short link is usually the right call.
- **Language.** Nigerian English, Pidgin, or a local language when that's genuinely how the venture talks to these customers, and never as flavour.

## Ad creative per channel

Ad platforms change formats and limits often. The numbers here are the general shape; verify the current specification for the exact placement with web search before finalising, and say in the output which limits were checked and when.

Every variant follows the same rule: a headline that names the outcome or the offer, primary text that names who it's for and gives the one reason to believe, a visual direction that shows the real product or a believable Nigerian scene (not stock imagery of a generic office), and a call to action that matches the landing page it goes to. Two or three variants that differ in angle (outcome-led, problem-led, proof-led), not three rewordings of the same line.

- **Meta (Facebook and Instagram).** Primary text gets truncated after a few lines on mobile, so the point goes first. Headlines are short, roughly a sentence fragment. Vertical video and square image formats dominate; text baked into the image should be minimal and readable on a phone. There are content policies around personal attributes, health, and finance that reject ads outright; `consent-and-claims.md` covers the claim side.
- **Google Search.** Responsive search ads take several short headlines (each around a few dozen characters) and a couple of short descriptions, mixed by the platform, so every headline has to make sense on its own and next to any other. Match the query's words. Landing page relevance affects cost, so the ad and the page must say the same thing.
- **X.** Short post-length text, with an image or video card. Works for conversation and reach among a tech and business audience in Nigeria; weaker for direct response to a general consumer. Keep it in the venture's voice, not the founder's, unless it's deliberately a promoted founder post.
- **Elsewhere (TikTok, YouTube, LinkedIn, radio, OOH).** Same method: fetch the current spec, write to it, keep the claim defensible. Don't guess a format from memory.

What never goes in an ad: fake urgency or scarcity, "limited slots" that aren't limited, a price without the conditions that apply to it, a claim the founder couldn't repeat to a regulator, or a testimonial that wasn't given for this purpose. See the `sales-team` reference on dark patterns for the full list; the same rules apply here.

## Launch package structure

A launch is one true story told in several lengths and two voices. Write the story once, in a short paragraph that names what launched, who it's for, what it does now (not what it will do), and what the reader should do about it. Every piece below is that paragraph, reshaped.

1. **The announcement**, in the venture's voice: for the website, blog, or press. What, for whom, what it does, proof if any, pricing and availability, how to start, who to contact.
2. **The founder's post**, in his voice per `voice.md`: the decision or moment behind it, not the press release. Short, specific, one real detail. Written separately, never adapted from the announcement.
3. **The customer email**: to existing users or the waitlist, one job (tell them and give the next step), subject says what's inside.
4. **Short versions per channel**: X, LinkedIn, WhatsApp status or broadcast, Instagram caption. Different wording each time, same facts. Plaintext rules apply.
5. **The support line**: two or three sentences `ops-team` can paste when customers ask what changed, and the two questions most likely to come in.

Before any of it ships: `product-team` and `dev-team` confirm the feature does what the copy says, `legal-team` clears any regulated claim, and the date on the announcement is the day it's actually available.

## Brand-voice note template

Use this when the venture has no brand kit. Keep it to a page; it's a working agreement, not a brand book. Get it agreed before writing at volume.

```
## Brand voice: [venture]

Three adjectives: [e.g. plain, warm, exact]
  For each, one line on what it means in practice.

Three things it never says:
  1. [e.g. "revolutionary," or any claim about being first]
  2. [e.g. corporate-announcement openers]
  3. [e.g. jargon the customer wouldn't use, like "leverage"]

One example paragraph:
  [A short paragraph, in the voice, about something the venture actually does.
  This is the reference sample every future draft gets held against.]

Reader: [who it's talking to, in one line]
Nigerian context: [where local detail belongs, e.g. naira pricing, WhatsApp support, and where it doesn't]
```
