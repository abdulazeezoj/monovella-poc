# Output Templates

Formats for the venture marketing commands. Use the sections the task needs; these are the shape of a good output, not fields to fill in regardless of relevance. The method behind each is in `marketing-playbook.md`; the consent and claim checks are in `consent-and-claims.md`. Every template ends with a claims and consent block because the check is part of the deliverable, not an afterthought.

Web page, email, and article copy may use the structure its medium needs. Nothing uses em or en dashes. The short social versions inside a launch package follow the plaintext rules in `SKILL.md`.

## /landing

```
## Landing page: [product or page name]

**Reader:** [who this page is for, one line, from sales-team's ICP]
**Job of the page:** [the one action a visitor should take]
**Voice:** [brand kit reference, or the agreed brand-voice note]

### Hero
Headline: [names the outcome]
Subhead: [names who it's for]
CTA: [one verb, matches what happens next]
Trust line: [phone / WhatsApp / "pricing from N..." as applicable]

### Sections, in the visitor's order of objections
1. [Objection, in the visitor's words]
   [Copy that answers it. Heading, 1 to 3 short paragraphs or a short list.]
2. ...

### Proof
[Real names, numbers, quotes, screenshots that exist, each with its source. Or: "No proof yet; using [honest alternative]."]

### Pricing
[Naira figures, what's included, conditions, payment methods named]

### Contact and trust footer
[Phone, WhatsApp, address or city, registered name, licence or regulator statement if any]

### Closing CTA
[Same verb as the hero]

### Claims and consent check
- [Each material claim: source, or "needs product-team/dev-team confirmation", or "route to legal-team: reason"]
```

Hand structure and interface copy to `ui-ux-team` with this; they own the layout, this owns the persuasive copy inside it.

## /seo

Brief first; the article only when asked or when the brief is already agreed.

```
## SEO brief: [query]

**Query:** [exact words people type, with the variants found]
**Intent:** [informational / commercial / transactional / navigational, and why]
**Reader:** [who is searching this and what situation they're in]
**Top results cover:** [the table stakes, 3 to 6 points]
**Top results miss or get wrong:** [the gap, with the local or honest angle]
**Angle:** "This answers [query] for [who] by [what the others don't do]."
**Title:** [includes the query naturally, says what the reader gets]
**Meta description:** [one plain sentence a person would click on]
**Outline:**
  1. [Direct answer, first paragraph]
  2. [Heading: next question the reader has]
  3. ...
  n. [Caveats and limits]
  n+1. [Where the venture fits, once, if it fits]
**Internal links out:** [page: why the reader wants it next]
**Pages that should link in:** [existing pages and suggested anchor text]
**Claims needing research or verification:** [list, with what would settle each]
**Sources read:** [URLs, with date fetched]
```

Article format, when written: the title, the answer in the first paragraph, headings from the outline, short paragraphs, links with descriptive text, and a closing "Claims and sources" list for the editor that is removed before publishing.

## /email

One email:

```
## Email: [campaign / sequence name, message n of N]

**To:** [segment, and the consent basis: "opted in to marketing via [form] on [where]"]
**Job:** [the one thing this email does]
**Send timing:** [trigger or date and time, recipient's timezone]

Subject: [says what's inside]
Preview text: [one line that continues the subject, not repeats it]

[Body. First line carries the point. Short paragraphs. One next step.]

[Sign-off: real name, role, venture]

[Footer: why you're receiving this, unsubscribe, venture name and address]

### Claims and consent check
- Consent: [confirmed basis, or "needs legal-team"]
- Unsubscribe: [present and working: yes/no]
- Claims: [each one and its source]
```

A sequence: the table first, then each email in the format above.

```
## Sequence: [welcome / onboarding / launch / win-back]

| n | Send when | Job | Subject |
|---|-----------|-----|---------|
| 1 | ... | ... | ... |
```

SMS and WhatsApp broadcasts use the same header (To, consent basis, Job, Send timing) and then the message as it will appear, with the sender name in the text and the stop instruction. State the character count and, for SMS, the segment count and encoding assumed. Note whether it's transactional or promotional and why.

## /ad

```
## Ad set: [channel, placement, objective]

**Audience:** [ICP segment from sales-team, and the targeting summary]
**Landing page:** [URL or page name; the ad must say what the page says]
**Format and limits checked:** [placement spec, source, date checked]
**Voice:** [brand kit or brand-voice note]

### Variant A: [angle, e.g. outcome-led]
Headline: [within limit]
Primary text: [within limit; point in the first line]
Description (if the format has one): [...]
CTA: [platform button or text]
Visual direction: [what's shown, real product or believable scene, text on image if any]

### Variant B: [angle, e.g. problem-led]
...

### Variant C: [angle, e.g. proof-led]
...

### Claims and consent check
- [Each claim across variants: source, or route]
- Platform policy flags: [e.g. health, finance, personal attributes; what was checked]
- No fake urgency or scarcity: [confirmed]
```

## /launch

```
## Launch package: [what launched]

**The story, once:** [one short paragraph: what, for whom, what it does now, what to do]
**Available from:** [date it's actually usable]
**Confirmed by:** [product-team / dev-team on capability; legal-team on any regulated claim]

### 1. Announcement (venture voice)
[Title]
[Body: what, for whom, what it does, proof if any, price and availability, how to start, who to contact]

### 2. Founder's post (his voice, per voice.md)
[Platform]
[Plaintext. The moment or decision behind it, one real detail. Written separately, not adapted from the announcement.]

### 3. Customer email
[Use the /email format]

### 4. Short versions
X: [plaintext]
LinkedIn: [plaintext, blank lines between paragraphs]
WhatsApp: [plaintext, direct, easy to scan]
Instagram caption: [plaintext, complements the visual]

### 5. Support line (for ops-team)
[2 to 3 sentences to paste when customers ask what changed]
[The two questions most likely to come in, with answers]

### Claims and consent check
- [Each claim, source]
- Customer email consent basis: [...]
```

## Brand-voice note

```
## Brand voice: [venture]

Three adjectives: [a, b, c]
  a: [what it means in practice, one line]
  b: [...]
  c: [...]

Three things it never says:
  1. [...]
  2. [...]
  3. [...]

One example paragraph:
  [A short paragraph in the voice about something the venture actually does. Every future draft is held against this.]

Reader: [who it's talking to, one line]
Nigerian context: [where local detail belongs and where it doesn't]
Agreed by: [name, date]
```

Once agreed, quote the example paragraph back at the top of any later `/landing`, `/email`, `/ad`, or `/launch` output so the voice is visible next to the draft.
