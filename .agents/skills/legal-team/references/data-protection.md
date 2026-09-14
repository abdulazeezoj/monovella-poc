# Data Protection Compliance

## Nigeria: the NDPA 2023, not the NDPR

Nigeria's data-protection framework changed materially in recent years and it's worth stating this plainly since older sources (and older training data) may still reference the superseded framework: the **Nigeria Data Protection Act, 2023 (NDPA)** — a full statute, not just a regulation — replaced the earlier **Nigeria Data Protection Regulation (NDPR) 2019**. The NDPA is enforced by a dedicated regulator, the **Nigeria Data Protection Commission (NDPC)**, which has since issued the **General Application and Implementation Directive (GAID) 2025** with more detailed compliance guidance. Treat the NDPR as historical context, not the current rule — verify against current NDPC guidance if anything here might have moved on further since.

**Who it applies to:** any entity processing personal data of people in Nigeria, or processing data in Nigeria — including foreign entities that process Nigerians' data from outside the country (extraterritorial reach, similar in spirit to GDPR). A Nigerian startup with Nigerian users is squarely covered; there's no small-company exemption for the core obligations, though enforcement intensity and specific registration duties do scale with organizational size/data volume.

**Core obligations:**
- **Lawful basis required for processing** (NDPA s.25-ish territory — verify the current section number before citing it in anything formal): consent, contract performance, legal obligation, protecting a data subject's vital interest, or legitimate interest, among others. "We need it to run the product" isn't sufficient on its own — the specific basis should be identifiable and documented.
- **Consent, where relied on, must be informed, specific, freely given, and unambiguous** — a pre-ticked box or a forced "accept everything or leave" pattern isn't valid consent under the Act's stated principles (lawfulness, fairness, transparency explicitly rule out dark patterns and forced consent).
- **Purpose limitation** — collect only what's needed for a specific, stated purpose; don't repurpose data collected for one reason to a materially different one without a fresh basis.
- **Sensitive personal data gets a higher bar.** The Act specifically names health status as sensitive personal data (alongside things like genetic/biometric data, religious belief, and ethnic origin). A women's health product's core data — cycle tracking, symptoms, any health-adjacent input — sits squarely in this category, not the general personal-data category, which raises both the required lawful basis and the practical stakes of getting it wrong.
- **Data Protection Impact Assessment (DPIA)** required for high-risk processing — the Act specifically calls out sensitive data like health information as a category warranting this. A DPIA isn't a formality; it's a documented assessment of what's collected, why, the risk, and what mitigates it, done before the processing starts, not retrofitted after a launch.
- **Data Processing Agreement** needed with any third-party processor (a cloud host, an analytics tool, an AI API provider) that touches personal data on the company's behalf.
- **Breach notification** obligations to the NDPC and, where risk to individuals is significant, to the affected individuals themselves — with a defined timeline, so an incident response plan needs to exist before an incident, not be improvised during one.
- **Cross-border transfer** of Nigerians' personal data abroad is permitted but conditioned — verify the current conditions (adequacy of the receiving jurisdiction's protection, appropriate safeguards) before assuming a foreign cloud provider or API is automatically fine.
- **Automated decision-making restrictions** — the Act restricts using automated/AI-only decisions that have legal or similarly significant effects on a person without consent, a legal basis, or contract necessity, and generally requires a route to human review/contestation. Relevant for anything in a product that makes an automated recommendation with real consequence (e.g., a health-adjacent AI companion suggesting an action) — worth an explicit look at how much the product lets a decision happen automated vs. surfaced for the user's own judgment.

**Practical minimum for a product handling health-adjacent data:** a real, specific privacy policy (not a generic template), an identified lawful basis per data category collected, a DPIA on file for the sensitive-data processing, data processing agreements with every third-party processor actually used, and a breach-response plan — before launch, not after growth makes retrofitting expensive.

## Consent and opt-out for email, SMS, and WhatsApp campaigns

`content-team` runs the campaigns and `sales-team` runs outreach; this skill owns whether the list they're sending to was lawfully built and whether people can actually leave it. Direct marketing sits under two regimes at once in Nigeria: the NDPA (the message is processing of personal data, so it needs a lawful basis and honors the data subject's right to object) and the NCC's rules on unsolicited messages to telephone subscribers (SMS and, in practice, WhatsApp-to-number campaigns, including the national do-not-disturb mechanism carriers operate). Treat the specifics of both — what counts as valid consent for marketing, whether a prior customer relationship is a usable basis, the do-not-disturb obligations, and any sending-hour or sender-ID rules — as things to verify against current NDPC and NCC guidance before a campaign goes out, not to recall from training data.

What to establish before the first send, and check again when a new channel is added:

- **Lawful basis per channel, named.** Consent is the safe default for marketing; if a legitimate-interest or existing-customer basis is being relied on instead, write down why it holds for this audience and this channel. "They signed up for the product" is not consent to WhatsApp marketing.
- **A record of the opt-in.** Who, when, through what form or flow, what exactly they agreed to, and which channels. A list imported from a spreadsheet, scraped, bought, or copied from a past venture has no such record and should be treated as unconsented until proven otherwise. Pre-ticked boxes and consent buried in terms of service don't count under the NDPA's own consent principles.
- **Unsubscribe that works on every channel.** A visible opt-out in every email, a reply keyword (e.g. STOP) for SMS and WhatsApp, and a suppression list that all sending tools actually honor, applied fast enough that a second message after someone opts out doesn't happen. Keep the opt-out record as carefully as the opt-in record.
- **Sender identity and honesty.** The company is identifiable as the sender, and the message doesn't claim results or testimonials that `content-team` hasn't verified — the FCCPC's consumer-protection interest in advertising claims applies here too.
- **Vendors in the chain.** The email, SMS, or WhatsApp platform is a processor touching personal data, so it needs a data processing agreement like any other; loop in `security-team` if it's a new integration.

Flag any campaign to an unconsented list, or with no working opt-out, at `/risk` Major or higher — regulator complaints on messaging are cheap for a recipient to file and are the most common way a small company first hears from a regulator.

## What a grant agreement typically contains that needs review

`finance-team` finds the grant and owns the numbers and the application; this skill reviews the agreement before it's signed. Grant money reads as free until the terms are read, and the terms that hurt are rarely in the payment schedule. Read the actual agreement clause by clause (the `/review` format applies) and look specifically for:

- **IP terms.** Who owns what's built with the money. Some funders take ownership, a license (including licenses to publish or share with other grantees), or open-source/open-data obligations. Check this against existing IP assignments and anything an investor has been told the company owns outright.
- **Clawback and repayment.** The conditions under which the funder can demand the money back — missed milestones, unspent funds, a change of control, use outside the approved budget — and the timeline. A clawback triggered by an acquisition or a pivot is an investor-relevant term, not a footnote.
- **Reporting and audit.** Frequency, format, what has to be tracked (often at a line-item level `finance-team` needs to set up before the first disbursement, not at the first report), the funder's right to audit, and how long records must be kept.
- **Publicity and disclosure.** Obligations to credit the funder, restrictions on announcing the grant without approval, and whether the funder may publish the company's data or results. Route the approved wording to `content-team` so a launch post doesn't breach it.
- **Exclusivity and restrictions.** Non-compete-style limits on taking related funding, restrictions on the sector or geography the funded work can serve, and any obligation to keep the project running for a stated period after the money ends.
- **Conflicts with investors and existing agreements.** Anti-dilution or consent rights an existing SAFE or shareholders' agreement gives an investor, a funder condition that the entity stay non-profit or Nigerian-owned, or a grant to one entity for work actually done in another. Check the cap table and prior agreements before signing, not during a later raise's due diligence.
- **Governing law and dispute resolution**, as with any cross-border contract — many funders are foreign, and the agreement's law is rarely Nigerian by default.

Label each finding as a hard condition (what the agreement actually binds the company to) versus a negotiable term, and note that a signed grant agreement with a foreign funder or a public-sector body is lawyer-review territory before signature, not after the first disbursement.

## When GDPR also applies

GDPR reaches beyond the EU when a product specifically targets or monitors EU-based individuals — offering the product to EU users, using EU-currency pricing, or marketing specifically toward an EU audience are the kinds of signals that trigger it, mere accessibility of a website from the EU generally is not enough on its own. If a product's user base includes EU-based diaspora Nigerians reached through targeted marketing (not just incidental access), that's worth a specific, deliberate check rather than an assumption either way.

## Other sector-specific flags worth checking, not assuming

- A product making health claims or functioning as a medical device (versus general wellness/tracking information) may trigger additional Nigerian health-sector regulation (e.g. NAFDAC) — worth an explicit check against what the product actually claims to do, since "tracking and informational" versus "diagnostic or treatment-directing" is the kind of line that changes which regime applies.
- Commodity trading/export (relevant for agri-commodity ventures) has its own regulatory layer (quality standards, export documentation, possibly NEPC registration) distinct from data protection — flag as a separate compliance area, not folded into data protection.

## When this needs a licensed lawyer, not just this skill

A DPIA for genuinely high-risk processing, any actual breach response, a cross-border transfer arrangement involving a real regulatory filing, and any NDPC inquiry or enforcement contact should go to a lawyer (ideally one with Nigerian data-protection experience specifically) rather than being handled from a draft alone.
