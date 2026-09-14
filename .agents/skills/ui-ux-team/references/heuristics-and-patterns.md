# Heuristics and Patterns

Grounding for design decisions that need more than "it feels right" — when to lean on an established heuristic, when a convention is worth keeping, and when the familiar-looking choice is actually just a copied default.

## Nielsen's usability heuristics

Still the standard starting checklist for any interface, digital or physical. Use them to evaluate an existing screen (heuristic evaluation) or as a checklist while designing:

1. **Visibility of system status** — the interface always shows what's happening (loading, saved, processing, an error occurred) within reasonable time, in language the user understands.
2. **Match between system and the real world** — speak the user's language and follow real-world conventions, not internal system logic or engineering vocabulary.
3. **User control and freedom** — every unwanted state has a clearly marked way out: undo, cancel, back. Don't force a path forward once someone's started it.
4. **Consistency and standards** — the same word, icon, or action always means the same thing across the product, and follows platform conventions rather than inventing new ones without reason.
5. **Error prevention** — better than a good error message is a design that stops the error before it happens (confirmation on destructive actions, constraints that rule out invalid input).
6. **Recognition over recall** — make objects, actions, and options visible so the user doesn't have to remember information from one screen to use it on the next.
7. **Flexibility and efficiency of use** — accelerators (shortcuts, saved defaults, bulk actions) that experienced users can find, without cluttering the interface for first-time users.
8. **Aesthetic and minimalist design** — every extra unit of information competes with the units that actually matter; cut anything that isn't pulling weight.
9. **Help users recognize, diagnose, and recover from errors** — plain language, no error codes as the only explanation, and a constructive next step.
10. **Help and documentation** — when it's needed at all, it should be easy to search, focused on the user's actual task, and short.

These are rules of thumb, not literal rules — they describe the shape of a usable interface across nearly any context, from a 2026 mobile app to a kiosk. When two heuristics pull in different directions (e.g. minimalism vs. recognition-over-recall), state the trade-off and pick based on the actual task, not by mechanically satisfying both.

## Jakob's Law — and where it stops applying

Jakob's Law: people spend most of their time on products other than yours, so they'll transfer expectations from those products to this one. This is the real justification for reusing interaction conventions — how a cart works, how a form validates, how a destructive action confirms, how navigation is laid out. Deviating from the convention users already carry with them is a real cost (they have to learn something new to do a task they already knew how to do), so it needs a real payoff.

What Jakob's Law does *not* justify: copying a product's *visual identity* — its palette, type pairing, layout rhythm, illustration style, copy voice — because it's common right now. That's not reducing anyone's cognitive load; a first-time visitor doesn't arrive with a memorized expectation for "should the accent color be a terracotta or a violet gradient." That's imitation, and in a market where dozens of products already look interchangeable, it actively works against being remembered or trusted.

The practical split:
- **Keep conventional:** navigation placement and behavior, form validation timing, confirmation patterns for destructive/financial actions, standard iconography (search, cart, settings, notifications), checkout/payment flow shape, common component behavior (dropdowns, modals, toasts).
- **Make deliberate, not default:** palette, type system, illustration/photography direction, motion language, the specific words used, the page's "signature" moment, information density, and how much personality shows through.

## Recognizing a bandwagon default vs. a genuine convention

Ask, for any visible choice: *if you removed this product's logo and content, could you tell which product it was from the screen alone?* If the honest answer is no, the choice was probably inherited from a template or a training-data average, not made for this product.

Concrete tells worth watching for (not because any one of them is wrong in isolation, but because their *combination without reason* is the signature of an unexamined default):

- A cream/off-white background paired with a high-contrast serif display face and a terracotta/warm-clay accent — or the inverse, a near-black background with a single bright acid-green or vermilion accent. Both are legitimate for the right brief; neither is a decision if it shows up regardless of what the product actually is.
- Purple-to-blue gradients as the default "tech" signifier, applied without any connection to the product's subject matter.
- Hero sections built from a big stat + small label + supporting numbers + gradient blob, used because it's the fastest thing to fill, not because the product's story is actually a number.
- Numbered markers (01 / 02 / 03) decorating content that isn't actually sequential.
- A hamburger-hidden navigation on a product with only three or four top-level destinations, where a visible nav would cost nothing.
- Carousels, tabs, or dashboards added by default rather than because the content genuinely has that shape.
- Motion added because "the design feels flat without it," rather than because it's confirming an action, guiding attention, or showing a relationship between elements.

## Inspiration research that doesn't become copying

`/inspire` exists because the best answer to "how should this screen work" is usually already live in a product this user has opened today. The discipline is in what gets recorded, not in how many products get looked at.

**Pick three to five real products** that solve the same *job*, not the same category: one or two direct competitors, one or two best-in-class apps from an adjacent domain that handle the same interaction (a ride-hailing app's live-status screen is relevant to a delivery tracker; a bank app's transfer confirmation is relevant to any money-moving flow), and one thing this product's users already rely on. Open them for real — with a browser or screenshot tool, or on a phone — rather than working from memory of what they looked like.

**For each, record three things and no more:** what it does well at this step, the specific user problem that choice solves (not "it looks clean" but "it shows the fee before the amount field so nobody is surprised at confirm"), and whether that problem actually exists here. The third column is what stops a borrowed idea becoming a borrowed feature nobody needed.

**Borrow mechanisms, reject looks by name.** A mechanism is a way of solving a problem: inline validation that fires on blur, a running total that updates as options are picked, a "last used" default, a confirmation that restates the consequence. A look is a palette, a type pairing, a card style, a hero layout. Mechanisms transfer because the problem transfers; looks don't, because the brand doesn't. Write the rejected looks down explicitly in the inspiration note so `dev-team` doesn't drift back to them under time pressure.

**What Nigerian users already know how to use** is the cheapest familiarity available, and it's often not a web app: USSD menus (numbered options, one action per step, confirmation before any money moves), WhatsApp (conversation as the interface, status ticks as system feedback, a thread as the record), POS agent transactions (a printed or SMS receipt as proof, a reference number people actually read out), and the major bank apps (transfer flows, OTP entry, beneficiary lists, transaction history as the home screen). A flow that borrows the *shape* of these — short steps, a visible reference number, confirmation that restates the amount and recipient — will feel trustworthy to someone who has never used this product before, without looking like any of them.

## Visual plan checklist

Before a visual plan goes to `dev-team`, read it as a stranger would and confirm each of these was a decision, not a default. This mirrors the template-tell list in SKILL.md so the check happens where the plan is written, not only where it's reviewed:

- Palette: not cream-and-terracotta, not near-black-with-one-acid-accent, not a purple-to-blue gradient as the "tech" signifier — unless the brief asked for it.
- Cards: not identical rounded cards sharing one grey shadow; if cards are used, each one is there because the content is a discrete unit.
- Labels: no tracked-out all-caps eyebrow labels above every heading; no numbered markers on content that isn't a sequence.
- Text: no arrows appended to link and button text; no single word in a headline colored or italicized for emphasis.
- Motion: no fade-and-slide-up on every section; non-user-triggered motion appears once at most, with a reason.
- Signature moment: one place boldness is spent, named; everything else kept quiet.
- Type: one or two faces with stated roles, a scale, and line lengths under about 80 characters.
- The removal test: with the logo gone, would this still read as this product?

Where the brief pins a look down, follow it. Where it leaves an axis free, the plan should say what was chosen and why it fits these users.

## Calm design and progressive disclosure

The interfaces most often held up as well-designed right now share a pattern: they show only what the current task needs by default, and push everything else — advanced settings, secondary actions, power-user features — behind a deliberate second step (a menu, a command palette, an expand action), rather than surfacing it all at once. This isn't minimalism as an aesthetic; it's minimalism as a task-completion strategy. When a screen feels cluttered, the fix is usually to ask which of the visible elements are needed for *this* task versus an occasional one, not to shrink everything uniformly.

This principle can conflict with "recognition over recall" (heuristic 6) when taken too far — hiding something so well that users can't find it when they do need it is its own failure. The resolution is usually a clear, consistent place to look (a settings page, a "more" affordance, a command palette) rather than scattering advanced options across the interface or removing them from view entirely.
