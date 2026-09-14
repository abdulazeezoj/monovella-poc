# Anti-Patterns: Dark Patterns and Generic Design

Two different failure modes that both erode trust: designs that manipulate the user on purpose (dark patterns), and designs that don't manipulate anyone but also don't say anything about the product they're for (generic/templated design). Check for both in `/audit` and `/review`.

## Dark patterns — never use these

Dark patterns are interface decisions that push someone toward a choice that serves the business at the user's expense, using the same psychological levers that ethical persuasive design uses, aimed the wrong way. They're increasingly a legal exposure too (FTC enforcement in the US, the EU's Digital Services Act names several explicitly), but the reason to avoid them here is simpler: they work once and cost trust permanently.

Grouped by how they operate:

**Nagging** — repeated, low-value interruptions for something the product wants (rate this app, enable notifications, connect your contacts), shown again and again with no permanent way to dismiss. *Instead:* ask once, respect "not now," and don't re-ask on every session.

**Obstruction** — making an easy thing artificially hard, most commonly:
- *Roach motel* — trivially easy to sign up or subscribe, deliberately hard to cancel or leave.
- *Price comparison prevention* — obscuring unit price or making it hard to compare options.
*Instead:* cancellation should be at least as easy as signup; comparisons should be straightforward.

**Sneaking** — hiding information the user would object to if they saw it clearly:
- *Sneak into basket* — adding an item, add-on, or donation without explicit action.
- *Hidden costs* — fees that appear only at the final step of checkout.
- *Forced continuity* — a free trial silently converting to a paid subscription without a clear, advance warning.
- *Bait and switch* — the outcome of an action isn't what the interface implied it would be.
*Instead:* show the real total, the real terms, and the real outcome before the user commits, not after.

**Interface interference** — visual design that manipulates rather than informs:
- *Confirmshaming* — wording a decline option to shame the user ("No thanks, I don't want to save money").
- *Preselection* — the more expensive or more invasive option is chosen by default.
- *Misdirection* — visually emphasizing one choice (Accept) while burying the other (Reject) in low-contrast text or an extra click.
- *Disguised ads* — content styled to look like organic UI or content, not clearly marked as an ad.
- *Trick questions* — double negatives or confusing phrasing designed to produce the "wrong" answer.
*Instead:* give both options equal visual weight, use plain unambiguous wording, and label ads as ads.

**Forced action** — requiring something unrelated to the task in order to proceed:
- *Privacy zuckering* — tricking someone into sharing more personal data than they intended.
- *Friend spam* — using access the user granted (contacts, social accounts) to message others on their behalf without clear, separate consent.
*Instead:* ask for exactly what the task needs, and get explicit, separate consent for anything else.

This applies with extra weight to health, financial, and consent-related flows — Monovella/CycleCare-type products included — where the cost of a manipulated choice is higher than a typical e-commerce upsell.

## Generic / templated design — the visible tells

Not manipulative, but still a failure: a design that could be any product's design. Watch for the combination of these showing up without a reason tied to the actual brief (see `references/heuristics-and-patterns.md` for the fuller reasoning):

- Palette and type pairing lifted wholesale from whatever's trending (see the specific 2025–2026 "AI-generated" clusters listed in `references/heuristics-and-patterns.md` and in the visual plan checklist there).
- Copy that could be pasted onto a competitor's site with a find-and-replace on the product name — vague value language ("game-changer," "unlock the power of," "seamless") instead of anything specific to this product.
- Layout structure that's identical to the last five SaaS landing pages seen: hero → logo bar → three-column features → testimonial carousel → pricing → footer CTA, used because it's the fast path, not because it's the right shape for this content.
- Stock illustration or generic 3D shapes with no visual connection to what the product actually does.
- A component library (shadcn/ui, Tailwind UI, etc.) used entirely at its defaults — same border radius, same shadow scale, same spacing — with zero tokens adjusted for this brand.

None of these are wrong to use as a *starting point*. They become a problem when they're also the *ending point* — when nothing was deliberately changed to fit this product's users, subject matter, or brand. The fix is almost never "start over"; it's identifying the one or two places (palette, a signature layout moment, the actual words) worth spending real craft on: spend the boldness budget in one place and keep the rest quiet.
