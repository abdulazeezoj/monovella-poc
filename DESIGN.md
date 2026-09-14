---
name: Monovella
description: A composed care navigator for one connected health story.
colors:
  background: "#FBF9F5"
  foreground: "#211D18"
  card: "#FFFFFF"
  primary: "#155953"
  primary-foreground: "#FFFFFF"
  secondary: "#F3EEE4"
  muted: "#F3EEE4"
  muted-foreground: "#6B6259"
  accent: "#F3EEE4"
  destructive: "#A8461F"
  border: "#E8E1D6"
  input: "#D8CDBC"
  ring: "#155953"
  success: "#3D6B4F"
  warning: "#B8863B"
  critical-staff: "#9B2226"
  action-primary-hover: "#0F433E"
  chart-1: "#155953"
  chart-2: "#3D6B4F"
  chart-3: "#B8863B"
  chart-4: "#A8461F"
  chart-5: "#6B6259"
typography:
  display:
    fontFamily: "EB Garamond, Palatino Linotype, Book Antiqua, Georgia, serif"
    fontSize: "clamp(2.25rem, 4vw + 1rem, 4.5rem)"
    fontWeight: 500
    lineHeight: 1.0
    letterSpacing: "-0.03em"
  body:
    fontFamily: "EB Garamond, Palatino Linotype, Book Antiqua, Georgia, serif"
    fontSize: "1.125rem"
    fontWeight: 400
    lineHeight: 1.7
  label:
    fontFamily: "Fira Mono, ui-monospace, SFMono-Regular, Menlo, monospace"
    fontSize: "0.8125rem"
    fontWeight: 500
    letterSpacing: "0.02em"
rounded:
  sm: "6px"
  md: "10px"
  lg: "16px"
  full: "999px"
spacing:
  page-gutter: "20px / 32px / 40px"
  content-gap: "40px / 80px"
  section: "80px / 112px"
  wide-section: "128px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.primary-foreground}"
    rounded: "{rounded.md}"
    height: "40px"
    padding: "0 16px"
  button-primary-hover:
    backgroundColor: "{colors.action-primary-hover}"
  care-timeline-node:
    backgroundColor: "{colors.primary}"
    rounded: "{rounded.full}"
    size: "20px"
---

# Design System: Monovella

## Overview

**Creative North Star: "The Care Journal Navigator"**

Monovella pairs the calm of a well-kept journal with the certainty of a care
guide. Warm paper surfaces, one restrained editorial serif, and deliberate
status marks help a patient understand one connected care story without the
experience turning into a hospital dashboard. shadcn/ui supplies the
accessible interaction foundation (focus handling, keyboard behavior,
compound-component semantics) but none of its default visual treatment;
every token below is Monovella's own.

**Key Characteristics:**

- Warm paper-and-ink reading surfaces with deep teal reserved for direction.
- One typeface family (EB Garamond) carrying both display and body text, so
  hierarchy comes from size and weight, not competing type styles; Fira Mono
  appears only where data, not prose, is on screen.
- Flat by default: tonal paper changes and hairline borders build structure
  before any shadow does.
- Status that never depends on color alone: shape and iconography carry the
  same meaning a colorblind or grayscale reading would miss.

## Colors

The palette is materially quiet: warm paper holds long-form reading, ink
carries meaning, and deep teal appears only when the page asks someone to
move forward. Every entry below is a shadcn CSS-variable token defined in
`web/src/app.css`'s `:root` (light) and `.dark` blocks, each following
shadcn's `name` / `name-foreground` convention.

### Primary

- **Deep Teal:** `--primary` (`#155953` light / `#7BC2B9` dark). Primary
  actions, focus orientation, journey markers, links, and `--ring`. Text on
  it uses `--primary-foreground` (`#FFFFFF` light / `#102F2C` dark).
- **Deep Teal Hover:** `--action-primary-hover` (`#0F433E` light / `#9BDAD1`
  dark). The hover state for primary actions only.

### Secondary

- **Care Clay:** `--destructive` (`#A8461F` light / `#E59472` dark).
  Meaningful attention, recovery, and destructive states only. Do not use it
  as ambient decoration or a second brand accent.

### Neutral

- **Warm Paper:** `--background` (`#FBF9F5` light / `#171512` dark).
  Default page surface.
- **Ink:** `--foreground` (`#211D18` light / `#F5F0E8` dark). Primary text
  and display type.
- **Card:** `--card` (`#FFFFFF` light / `#211E19` dark). Raised reading
  surfaces, using `--card-foreground` for text.
- **Soft Paper:** `--secondary` / `--accent` (`#F3EEE4` light / `#12110F`
  dark). Low-emphasis sections, secondary buttons, and hover/accent states.
- **Quiet Ink:** `--muted-foreground` (`#6B6259` light / `#C9C0B5` dark).
  Supporting copy, on `--muted` (same value as `--secondary`).
- **Paper Border:** `--border` (`#E8E1D6` light / `#39342D` dark). Dividers
  and quiet containment. `--input` (`#D8CDBC` light / `#554E45` dark) is
  reserved for form-control borders.

### Status (non-shadcn extensions, same variable convention)

- **Success:** `--success` (`#3D6B4F` light / `#93BEA1` dark).
- **Warning:** `--warning` (`#B8863B` light / `#E5C277` dark).
- **Critical (staff-facing):** `--critical-staff` (`#9B2226` light /
  `#F0A0A0` dark). Reserved for staff-facing critical-result and Alert
  states; patients never see this token.
- **Chart 1-5:** `--chart-1` through `--chart-5`. The same five hues above,
  in this order, for any data visualization.

### Named Rules

**The Direction, Not Decoration Rule.** Deep teal directs attention to the
next safe action. Clay signals that attention or recovery is needed. Neither
is a background flourish or the only expression of status.

**The Shape Before Color Rule.** A status must be legible from shape and
iconography alone; see `CareTimeline`'s three node shapes in Components.
Color reinforces meaning; it never carries it alone.

## Typography

**Display font:** EB Garamond, with Palatino Linotype / Book Antiqua /
Georgia fallback.

**Body font:** EB Garamond, the same family as Display, not a second one.

**Label/Mono font:** Fira Mono, with the system monospace stack as fallback.
Reserved for technical and tabular data, never for headlines, body copy, or
brand expression.

**Character:** One serif family carries the whole reading experience:
headlines, paragraphs, and interface copy, so hierarchy comes from size and
weight rather than a competing typeface, which keeps the system quieter than
a display/body pairing and matches the brand's editorial, journal-like voice.
Fira Mono's even, geometric letterforms step in exactly where Garamond's
fine strokes and small x-height would lose legibility: IDs, timestamps,
verification codes, and dense tabular figures.

### Why one serif for both roles, not a serif/sans split

This is a deliberate two-font system, not an unexamined default. EB Garamond
is a genuine long-form reading face: it is *not* comfortable at typical UI
caption sizes (11-13px); its fine hairlines and small x-height lose
definition on screen below roughly 16-18px. The common mitigation is to
pair a display serif with a small, neutral sans for dense UI text, but that
would reintroduce a third typeface, which the brand has deliberately ruled
out. Instead:

- **Reading-length text** (headlines, paragraphs, Care Plan narrative,
  marketing copy) sets in EB Garamond at sizes where it reads best: display
  type at its natural large sizes, and body copy at 18px+ rather than the
  16px a sans could get away with.
- **Short interface text that must still read at small sizes** (buttons,
  nav labels, form labels) stays in EB Garamond but never below semibold
  weight and never below 14px, which keeps stroke contrast high enough to
  stay legible; short phrases tolerate this better than paragraphs do.
- **Anything genuinely dense or tabular** (IDs, timestamps, verification
  codes, prices in a table, booking references) moves to Fira Mono, whose
  even counters and generous x-height were built for exactly this size
  range. This absorbs the job a small UI sans would otherwise do, without
  spending a third typeface on it, extending, not inventing, the prior
  system's rule that its monospace font served data, never brand voice.

Every shadcn primitive still renders through this pairing: card titles and
dialog headings resolve to the display role, body and control text to the
body role, and any monospace-flagged data cell to the label/mono role. No
component keeps a third, unmapped font.

### Hierarchy

- **Display** (weight 500, `clamp(2.25rem, 4vw + 1rem, 4.5rem)`, line-height
  1.0, tracking −0.03em): the single dominant page idea, hero headlines,
  major section openers.
- **Headline** (weight 500, 2.25rem → 3rem, line-height 1.25, tracking
  −0.025em): story chapters and section titles, including `CardTitle`.
- **Title** (weight 500, 1.5rem → 1.875rem): care moments and supporting
  narrative blocks.
- **Body** (weight 400, 1.125rem, line-height 1.7): default reading copy.
  Keep patient-facing body text at 18px or larger; never below 16px anywhere.
- **UI/Control** (weight 600, 0.875rem-1rem): button labels, nav items, form
  labels; EB Garamond at semibold or heavier, never below 14px.
- **Label/Mono** (weight 500, 0.8125rem, tracking 0.02em, Fira Mono): IDs,
  timestamps, codes, table figures, badges carrying data rather than prose.

### Named Rules

**The Read-Then-Act Rule.** Let people understand what is happening before
asking them to act. Headings orient, body copy explains, and primary actions
follow.

**The One Serif Rule.** If a piece of text is prose or a short instruction, it
is EB Garamond, whatever its size or weight. If it is data someone scans
rather than reads (an ID, a timestamp, a price in a table), it is Fira Mono.
Nothing on a Monovella screen resolves to a third font.

## Layout

The public site uses a centered `max-w-7xl` reading frame with gutters that
progress from 20px on mobile to 32px on small screens and 40px on large
screens (`px-5 sm:px-8 lg:px-10`). Primary sections use 80px mobile spacing
and 112px large-screen spacing (`py-20 sm:py-28`), with wider hero separation
at 128px on extra-large screens.

On large screens, the hero pairs a text column with a photographic care-story
preview; editorial care moments alternate image and copy columns so the
journey reads as a sequence, not a card grid. On smaller screens everything
stacks in story order.

### Application Workspaces

Authenticated patient and provider surfaces share the same restrained frame
so moving between care roles still feels like one product:

- **Desktop:** a full-width header over a bordered reading frame. Patient
  journeys use a story rail beside the active work area; provider queues use
  a compact list that can lead into a two-pane list-and-detail workspace.
- **Tablet:** keep list and detail together only while both stay comfortably
  readable; otherwise move detail beneath the selected item.
- **Mobile:** show one consequential job at a time. Journeys use a compact
  scrollable step rail; primary actions stay reachable without horizontal
  overflow.
- **Density:** hairline warm borders and tonal paper changes group data.
  Routine records are rows, not floating cards. Status chips stay secondary
  to the record name and next action.
- **Hierarchy:** every workspace opens with role/context, one page title in
  Display or Headline weight, and a plain-language instruction. Operational
  queues may run denser than patient pages, but body text never drops below
  14px.

**The Same Story, Any Screen Rule.** Responsive changes may alter the number
of visible panes, but never the record hierarchy, current status, or next
action. Desktop supports comparison; mobile supports a single confident
decision.

**The Queue Is Work, Not Analytics Rule.** Specialist, laboratory, and
pharmacy home screens prioritize named records, due state, and the next
operational action. They do not become metric dashboards or generic card
grids.

## Elevation & Depth

The system is flat by default. Tonal surface changes (`--muted`/`--accent`
against `--background`), quiet 1px borders, and generous spacing establish
hierarchy; `Card` itself uses a `ring-1 ring-foreground/10` rather than a
shadow. Diffuse, offset shadows appear only where a surface is deliberately
layered over the page: the hero image and its overlapping preview, and a
raised action the page wants read as elevated above routine content.

### Shadow Vocabulary

- **Hero lift** (`0 28px 70px -50px color-mix(in oklch, var(--foreground), transparent 30%)`):
  the photographic hero and any overlapping preview card.
- **Primary action lift** (`0 12px 24px -16px color-mix(in oklch, var(--primary), transparent 20%)`):
  a single prominent call-to-action, used sparingly.

### Named Rules

**The Story-Layer Rule.** Use elevation only when content is deliberately
layered over the reader's current context. Do not add shadows to routine
containers, cards, or list rows; a ring or a border does that job.

## Shapes

Forms are softly exact, not bubbly: `--radius: 0.625rem` (10px) is the base,
with `--radius-sm` (6px) for compact controls, `--radius-lg` (16px) for
large surfaces, and `--radius-xl` through `--radius-4xl` scaling up from there for
generous containers. Cards round to `rounded-xl`; buttons and inputs to
`rounded-md`; pills and status badges to a full `rounded-4xl`/9999px capsule.
Borders are thin (1px), warm-neutral, and structural rather than decorative.

## Components

Every component below is a shadcn/Base UI primitive with Monovella's tokens
applied through its existing variant system: extend `cva` variants and CSS
variables rather than hand-styling a one-off.

### Buttons

- **Shape:** `rounded-md` body, `size-8` icon buttons; heights step from
  24px (`xs`) to 48px (`lg`).
- **Primary:** `bg-primary`/`text-primary-foreground`, hovering to
  `--action-primary-hover`. Labels are semibold EB Garamond, Title Case.
- **Secondary / Outline / Ghost:** tonal `--secondary`/`--muted` surfaces;
  never a second brand hue.
- **Destructive:** a tinted `--destructive/10` fill, not a solid clay block;
  clay stays reserved for genuine attention, matching the Direction, Not
  Decoration rule.
- **Focus:** a visible `--ring`-derived ring with generous offset, always
  present, never suppressed for visual polish.

### Cards

- **Corner style:** `rounded-xl`, `ring-1 ring-foreground/10` in place of a
  shadow.
- **Header/Title:** `CardTitle` renders in the display/heading role.
- **Footer:** a tonal `bg-muted/50` band with a top border, when present.

### Badges

- **Style:** `rounded-4xl` (full pill), `text-xs font-medium`. Status color
  pairs with text and, where the status is safety-relevant, an icon; never
  color alone.

### Care Timeline (signature component)

- **Character:** the one element present on every Monovella surface; it
  carries the identity more than any single page does.
- **States, by shape, not color alone:** done is a filled disc with a
  checkmark; the current step is a ring around a filled center; what's ahead
  is an open circle. All three remain distinguishable in grayscale.
- **Line:** a thin vertical rule down the margin, in the spirit of a ruled
  journal page.

### Inputs / Fields

- **Style:** `--input`-colored 1px stroke, `rounded-md`, `--background` fill.
- **Focus:** border shifts toward `--ring`, plus the shared visible-focus
  ring.
- **Invalid:** `aria-invalid` drives a `--destructive`-tinted border and
  ring, per shadcn's `data-invalid`/`aria-invalid` convention.

### Navigation

Restrained 14px semibold EB Garamond, underlined on hover with visible
focus; icons are inline Lucide marks, never the sole label for a link.

## Do's and Don'ts

### Do:

- **Do** set EB Garamond body copy at 18px or larger; never below 16px
  anywhere, and never below 14px for short UI/control text.
- **Do** move any ID, timestamp, verification code, or tabular figure to
  Fira Mono instead of setting Garamond smaller to fit.
- **Do** give every status two independent signals (shape/icon plus color),
  per the Care Timeline pattern.
- **Do** style every new surface for both `:root` and `.dark`; dark mode is
  a first-class scheme, not an afterthought.
- **Do** extend shadcn's existing CSS variables and `cva` variants when a
  new visual need appears, rather than hardcoding a new value in a component.
- **Do** preserve focus rings, `prefers-reduced-motion` behavior, and
  minimum touch-target sizes from the global stylesheet.

### Don't:

- **Don't** introduce a third typeface for any reason, including "just this
  one caption": resolve it to EB Garamond or Fira Mono.
- **Don't** reintroduce Fraunces, Source Sans 3, or JetBrains Mono; they
  predate the two-typeface system and are fully retired.
- **Don't** use deep teal or clay as ambient decoration, or as the only cue
  for a status, urgency, or safety-critical state.
- **Don't** ship shadcn's default styling, a generic SaaS dashboard shell, a
  component gallery, or an interchangeable card grid as the product design.
- **Don't** redraw, crop, recolor, or recreate the supplied Monovella marks
  (see `docs/brand-assets/README.md`).
- **Don't** add a shadow to a routine container; flat, tonal, and
  bordered is the resting state.

## Decisions Log

- **Two typefaces, not three.** EB Garamond replaces both Fraunces
  (display) and Source Sans 3 (body); Fira Mono replaces JetBrains Mono in
  the same narrow, data-only role. Rationale above under Typography.
- **Dark mode is first-class.** Every token has a confirmed `.dark` pairing
  in `web/src/app.css`; it follows `prefers-color-scheme` unless a `.light`
  or `.dark` class is explicitly applied to the document root.
- **Color tokens are shadcn CSS variables, not a standalone palette.** Every
  named color in this document is a real `--variable` in `web/src/app.css`;
  there is no parallel hex palette to keep in sync.
