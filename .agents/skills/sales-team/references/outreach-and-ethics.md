# Outreach Compliance and Sales Anti-Patterns

Two different things worth checking separately: whether outreach is *legal* in the recipient's jurisdiction, and whether a pitch or offer uses a *manipulative* pattern regulators have specifically named and fined companies for. Neither is optional, and being legal doesn't automatically mean a pattern is ethical to use.

## Cold outreach law by jurisdiction

Cold B2B email is legal in every major jurisdiction covered here — the rules govern *how*, not *whether*. The core requirement across all of them: real sender identity, an easy and honored opt-out, and content actually relevant to the recipient's professional role.

**United States — CAN-SPAM Act.** Does not require prior consent for B2B commercial email. Every email needs: accurate "From"/"To"/"Reply-To" headers, a non-deceptive subject line, clear identification as an ad (implicit is fine for normal B2B outreach, but nothing disguised as a personal note when it's a mass send), the sender's real physical address, and a working opt-out honored within a reasonable window. Penalties run per-email and get steep at scale — treat every field as non-negotiable, not a nice-to-have.

**EU/UK — GDPR (+ ePrivacy/PECR).** B2B cold email is generally permitted under "legitimate interest," which is a real legal basis, not a loophole — but it has to actually be legitimate: relevant to the recipient's professional function, transparent about who's contacting them and why, and it requires processing their data minimally (don't scrape and store more than needed to send the outreach). Opt-outs should be honored fast — treat it as 24-48 hours, not the longer window CAN-SPAM allows. UK PECR is similar and slightly more permissive for corporate (not sole-trader) contacts.

**Canada — CASL.** The strictest of these: requires implied or express consent before sending, not just an opt-out model. Implied consent can come from an existing business relationship (typically within the last two years) or from the recipient's contact info being "conspicuously published" in a context relevant to the outreach (e.g. listed publicly as the right contact for this kind of inquiry). When in doubt with a Canadian recipient, use a warmer channel (a referral, LinkedIn, a form they filled out) before cold email.

**Nigeria — NDPA, plus NCC rules for SMS and voice.** Two regimes apply, and they cover different things. The Nigeria Data Protection Act governs the personal data behind the outreach: collecting a contact, storing it, and using it for direct marketing needs a lawful basis, the data subject can object to direct marketing and that objection has to be honored, and the data should be no more than the outreach needs. Cold B2B contact to someone in their professional role is a defensible position when it's relevant and stoppable, much like the GDPR picture — but the compliance body and its guidance are still maturing, so don't assume the EU reading carries over point for point. The Nigerian Communications Commission separately regulates unsolicited messages over telecoms networks: a Do-Not-Disturb opt-out that subscribers can activate and that senders must respect, sender-ID registration for bulk SMS, and restrictions on timing and content of promotional messages. Bulk SMS through a gateway is squarely inside those rules; a WhatsApp message is on top of platform policy as well, which requires opt-in for business-initiated messaging and will restrict an account that gets reported. Practical reading: one-to-one, relevant, human outreach on WhatsApp to a business contact is normal practice here; blasting a scraped list over SMS or WhatsApp is the highest-risk thing this skill can be asked to do. Verify the current specifics (thresholds, registration steps, penalties) with `legal-team` before any campaign at volume — the rules and their enforcement change, and this file is a map, not the law.

**Practical baseline regardless of jurisdiction:**
- Document where each contact came from (company site, LinkedIn, a directory, a referral) — purchased or scraped lists without a legitimate basis are the highest-risk source everywhere.
- Every message needs a real way to stop hearing from you, and that request gets honored, not just acknowledged.
- Personalization should come from something actually true and relevant about the recipient or their company — not a mail-merge field dressed up to look personal.

## Sales vs. content: who owns which message

The compliance rules above bite hardest on one-to-many sends, which is also where the ownership line sits. The test is who the message is to and whether the recipient asked for it:

- **Sales (this skill):** a message to a specific person or account, with a reason that's true about *them* — cold email, LinkedIn or WhatsApp outreach, follow-ups, proposals, renewal and expansion conversations, referral asks, partner pitches. One recipient could be swapped out only by rewriting the message.
- **Content (`content-team`):** anything sent to a list or published to the public — newsletters, email/SMS/WhatsApp campaigns to opted-in subscribers, landing pages, ads, launch announcements, blog and social posts. The recipient opted in or found it; the message is the same for everyone who did.

Hand-offs go both ways: when outreach needs a page to send prospects to, ask `content-team` for the landing page rather than improvising one; when a campaign produces a reply from a real buyer, it becomes a sales conversation and comes here. Don't disguise a campaign as outreach to route around opt-in rules — a mass send with a mail-merged first name is content, and is judged by content's compliance bar.

## Sales-specific dark patterns to never use

These are the patterns the FTC and other regulators have specifically named in enforcement guidance and actions — not a matter of house style, but a real legal and trust exposure on top of being wrong to do.

- **Fake urgency** — countdown timers that reset or aren't real, "offer ends soon" with no actual deadline, "act now" pressure with nothing behind it.
- **Fake scarcity** — "only 2 left," "high demand right now," or activity claims ("14 people are viewing this") that aren't true.
- **Fake or misleading social proof** — invented testimonials, logos of companies that never actually bought, review quotes taken out of context, or endorsements that don't disclose a payment/relationship.
- **Forced continuity** — a trial that silently converts to paid without clear advance notice, or a subscription that's dramatically harder to cancel than it was to start (the "roach motel" pattern).
- **Confirmshaming** — wording a decline option to guilt the prospect ("No thanks, I don't want to grow my business").
- **Hidden costs** — fees, minimums, or terms that surface only after the prospect has already committed time or given a verbal yes.
- **Misdirection** — burying the real terms, the cancellation process, or a material limitation in fine print while the headline claim gets all the visual weight.

What to do instead, every time: state the real price, the real terms, the real timeline, and the real proof — and if that honest version isn't compelling enough to close, that's a signal to strengthen the actual offer or target a better-fit buyer, not to dress up the pitch. See the main `SKILL.md` "Why this discipline matters" section — this is the practical form of that principle.
