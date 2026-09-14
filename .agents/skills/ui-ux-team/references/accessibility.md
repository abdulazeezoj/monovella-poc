# Accessibility Checklist (WCAG 2.2, Level AA)

Target Level AA for web and mobile-web work by default — it's the level most legal standards (Section 508, EN 301 549, and most national requirements) actually require, and it's achievable without the heavier constraints of AAA. State plainly what was checked by inspection versus what still needs real assistive-technology testing; visual review alone never proves compliance.

WCAG organizes everything under four principles — Perceivable, Operable, Understandable, Robust (POUR). Use these as the audit structure.

## Perceivable

- Text alternatives for non-text content (images, icons used as controls, charts).
- Captions/transcripts for any audio or video content.
- Content is not conveyed by color alone — pair status colors with an icon, label, or pattern.
- Text contrast meets 4.5:1 for normal text, 3:1 for large text; non-text UI elements (icon buttons, input borders, focus indicators) meet 3:1 against their background.
- Text can be resized to 200% and reflow without loss of content or function; layouts hold up at high zoom.

## Operable

- Everything reachable and operable by keyboard alone, in a logical order, with no keyboard trap.
- **Focus Not Obscured (new in 2.2, AA)** — a focused element must not be entirely hidden behind sticky headers, cookie banners, or other overlaid content.
- **Focus Appearance (2.2)** — the focus indicator must be clearly visible: sufficient size and contrast against both states it's transitioning between, not just a subtle color shift.
- **Target Size Minimum (2.2, AA)** — interactive targets at least 24×24 CSS pixels, or enough spacing around a smaller target to reach the equivalent — this is the single highest-impact new criterion for touch/mobile.
- **Dragging Movements (2.2, AA)** — any interaction that requires a drag (reordering, sliders) needs a single-pointer alternative (e.g. tap to select a position, or up/down buttons).
- No content flashes more than three times per second.
- Users can pause, stop, or hide any auto-updating or auto-advancing content (carousels, auto-refreshing feeds).
- Skip-navigation link or equivalent for repeated blocks (header/nav) on every page.

## Understandable

- Form fields have real, visible, programmatically-associated labels — a placeholder is never the only label.
- Errors are identified in text (not color alone), describe what's wrong, and suggest how to fix it.
- **Redundant Entry (2.2, A)** — don't make someone re-enter information they already provided earlier in the same process, unless there's a real reason (e.g. re-entering a password for security).
- **Accessible Authentication Minimum (2.2, AA)** — login/authentication can't rely solely on a cognitive test (remembering a password with no paste/manager support, solving a puzzle) without an accessible alternative (password managers, biometrics, one-time codes that can be copy-pasted).
- **Consistent Help (2.2, A)** — if help/support (chat, contact, FAQ link) appears on multiple pages, it stays in the same relative place and order each time.
- Navigation, component naming, and interaction patterns stay consistent across the product.
- Language of the page (and any part in a different language) is programmatically set.

## Robust

- Semantic HTML and correct ARIA roles/states — ARIA supplements semantics, it doesn't replace a native element that already does the job (a styled `<div>` is not a button).
- Custom components (built with shadcn/ui, Radix, or from scratch) expose name, role, and state to assistive tech, and follow the WAI-ARIA Authoring Practices pattern for that widget type when one exists.
- Works with current screen readers and browsers without relying on markup structure alone.

## Build review pass — what screenshots can and can't prove

When `dev-team` sends screenshots of a slice, a good share of this checklist can be checked from the images alone; the rest needs a keyboard, a screen reader, or an automated pass against the running page. Say which is which in the review, so "looked fine in the screenshots" never gets read as "accessible."

**Checkable from screenshots** (at phone, tablet, and desktop widths, in every state sent):
- Text and non-text contrast, measured from the actual rendered colors, not the plan's hex values.
- Status not conveyed by color alone — the icon, label, or pattern is visible in the error/success state screenshots.
- Visible labels on every form field, not placeholder-only; error text present, in words, next to the field.
- Target size — a 24×24 CSS pixel minimum can be estimated at a known viewport width, and obviously cramped tap targets show immediately.
- Reflow at 200% zoom or a narrow width: nothing clipped, no horizontal scroll, no overlapping text with long names or large naira amounts.
- Focus not obscured, *if* a screenshot with focus on an element near a sticky header or banner was taken — ask for one.
- Consistent placement of help/support across pages.
- Reduced motion: a before/after pair with `prefers-reduced-motion` set shows whether the animation actually stopped.

**Needs keyboard, assistive-tech, or automated testing** (ask `dev-team` for the result, or run it):
- Keyboard reachability and order, no keyboard trap, and focus appearance while tabbing — a static screenshot can't show a focus ring that never appears.
- Focus management on route change and on modal open/close.
- Name, role, and state exposed to a screen reader for every custom component; correct reading order.
- Dragging alternatives actually working with a single pointer or keyboard.
- Accessible authentication: paste and password-manager support in the login fields.
- Language of page set; semantic HTML and ARIA correctness — an automated pass (axe or equivalent) catches most of this, a screen reader catches the rest.
- Auto-updating content can be paused; nothing flashes above the threshold.

The review verdict should list the second group as "not yet verified" until there's evidence, not fold it into a pass.

## Practical notes for this stack

- shadcn/ui components are built on Radix primitives, which handle most keyboard/focus/ARIA behavior correctly out of the box — the usual accessibility risk is in *custom* compositions on top of them (a custom dropdown, a hand-rolled modal) where that behavior has to be reimplemented deliberately.
- For React/Next.js apps, verify focus management on route changes and modal open/close explicitly — these are the most common places automated behavior silently breaks.
- Accessibility overlays/widgets that claim to "fix" a site without code changes don't address most of WCAG 2.2, especially the 2.2-specific criteria above, which require actual markup/interaction changes. Don't recommend them as a substitute for the real fix.
