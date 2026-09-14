# Output Templates

Use the sections relevant to the task — these are checklists, not mandates to pad every output with every field.

## /flow

```
## Flow: [name]

**Goal:** what the user is trying to accomplish
**Entry points:** how someone arrives here (which screens/triggers lead in)
**Preconditions:** what must be true before this flow can start (auth, permissions, data)

### Steps
1. [Screen/state] → user action → system response → next state
   - Decision/branch points called out explicitly
   - Validation and error handling at this step
2. ...

### Edge cases and recovery
- Empty/first-time state
- Error state(s) and how the user recovers
- Offline / slow network behavior
- Permission-denied state
- Cancellation / exit paths mid-flow

### Completion
- What "done" looks like
- Any follow-up (confirmation email, notification, redirect)
```

## /component

```
## Component: [name]

**Purpose:** what this component is for, in one sentence
**Base:** existing library component it extends (e.g. shadcn/ui `Dialog`), or "new" if nothing fits

### Anatomy
- List the parts (trigger, container, header, body, actions, etc.)

### Variants
- [variant name]: when to use it, what changes

### States
- Default, hover, focus, active, disabled, loading, error, empty (whichever apply)

### Behavior
- Interaction rules: what triggers what, keyboard behavior, focus management

### Content
- Copy rules: label length, tone, what's dynamic vs. fixed

### Accessibility
- Role/ARIA pattern to follow
- Keyboard interaction map
- Focus handling on open/close/error
```

## /handoff

```
## Handoff: [screen or feature]

**Design reference:** [link/description of the approved design]

### Layout
- Breakpoints and how the layout changes at each
- Spacing/grid system used (tokens, not raw values)

### Components
- Which existing components are reused, which need building, which need extending
- Props/variants needed per component

### Content
- Final copy for every string (labels, errors, empty states, confirmations) — not placeholder text

### States to implement
- Loading, empty, error, success, disabled, offline, permission-denied — whichever apply, each with its exact content and behavior

### Interactions
- What triggers what; any animation/transition with duration and easing if specified

### Accessibility requirements
- Specific WCAG criteria this screen must meet (pull from references/accessibility.md)
- Focus order and keyboard map

### Open questions / dependencies
- Anything blocked on a product or engineering decision
```

## /review and /audit findings

```
## Finding: [short title]

**Severity:** Critical / Major / Moderate / Minor
**Location:** [screen/component/file]
**Category:** Usability / Accessibility / Content / Visual / Consistency / Feasibility

**Problem:** what's actually wrong, described concretely (not "this could be better")
**User impact:** who this affects and how — blocks a task, causes an error, slows completion, erodes trust
**Evidence:** the specific thing observed (heuristic violated, WCAG criterion failed, user feedback quoted)
**Recommendation:** the concrete fix — code-realistic, not aspirational
```

Severity guide (matches `dev-team`'s scale, so findings read consistently across disciplines):
- **Critical** — blocks task completion, a hard accessibility failure, or a dark pattern. Fix before ship.
- **Major** — significantly hurts usability, clarity, or trust for a common path. Fix soon.
- **Moderate** — a real but narrower issue — an edge case, a secondary flow, a minor accessibility gap.
- **Minor** — polish: spacing, wording, consistency nits that don't block or confuse.

Order findings by severity, not by where they appear on the screen.

## /inspire

```markdown
# Inspiration: [screen or job]

## Products studied
| Product | What it does well here | The problem that choice solves | Exists here? |
(3–5 rows: competitors, best-in-class adjacent apps, what this product's users already use)

## Mechanisms to borrow
- [mechanism] — [why it fits this product's users and constraints]

## Looks explicitly rejected
- [look] — [why it's a template default here, not a choice]

## Open questions for the visual plan
```

## Visual plan (inside /design and /handoff)

```markdown
## Visual plan
- Palette: [4–6 named hex values with roles: background, surface, text, primary action, one accent, one status]
- Type: [one or two typefaces, their roles, the scale (sizes/weights), max line length]
- Spacing: [the scale and the base unit]
- Layout: [one-sentence concept; alignment; optional ASCII wireframe]
- Signature moment: [the one place boldness is spent]
- Motion: [what moves, when, and what stays still]
- Template-tell check: [what was changed after reading the plan as a stranger]
```

## Build review (screenshots from dev-team)

Use the same finding format and severity scale as /review and /audit, and add:

```markdown
# Build review: [screen], slice [n]

Screenshots reviewed: [phone / tablet / desktop; states: loading / empty / error / success]

## Matches the plan
[What's right; keep it explicit so it doesn't get "fixed" later.]

## Findings
[Finding blocks, critical first. Each names the screenshot and state it was seen in.]

## Plan changes
[Anything the build showed was wrong in the plan itself, and the revised direction.]

## Verdict
[Next slice / fix critical+major first / ready for handoff]
```
