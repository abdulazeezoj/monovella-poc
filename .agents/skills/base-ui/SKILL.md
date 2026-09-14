---
name: base-ui
description: Build or revise accessible React interactions with @base-ui/react. Use when selecting, composing, styling, or debugging Base UI primitives; not for unrelated visual design.
---

# Base UI

Build on Base UI's accessible, unstyled primitives while preserving the host
application's design system and component conventions.

## Start with the installed version

- Inspect `package.json` and existing Base UI usage before choosing an API or
  adding a dependency. Keep the project's installed `@base-ui/react` version
  unless the request includes an upgrade.
- For exact component APIs, read the locally captured upstream index at
  [references/base-ui-llms.txt](references/base-ui-llms.txt). It links to the
  relevant official quick-start, accessibility, handbook, and component docs.
  Refresh it from <https://base-ui.com/llms.txt> when the installed package is
  newer than the captured guidance.
- When styling with Tailwind, check its major version. Base UI examples target
  Tailwind v4; translate unsupported syntax for a v3 project.

## Implementation choices

- Prefer the smallest semantic primitive that owns the interaction: for
  example, `Dialog` for a modal task, `AlertDialog` for a consequential
  confirmation, `Popover` for anchored supplementary content, and `Tooltip`
  only for non-essential hints.
- Use Base UI's compound parts rather than recreating keyboard, focus, or ARIA
  behavior with hand-rolled state. Keep native controls and labels where they
  express the form semantics.
- Treat each primitive as behavior, not a visual component. Supply project
  styles through its supported `className`, render, slot, and state/data-
  attribute APIs; do not add a generic Base UI theme unless requested.
- Preserve controlled/uncontrolled ownership. When the surrounding feature
  owns state, pass the relevant value/open state and change handler together;
  otherwise let the primitive manage its state.
- Compose trigger and child props with Base UI helpers or supported render
  APIs when needed. Do not overwrite the primitive's handlers, refs, or
  accessibility props.

## Accessibility and verification

- Keep a visible label for every input, use descriptions and error text that
  are programmatically associated with the control, and preserve native form
  submission/validation semantics where practical.
- Verify the interaction with keyboard-only use: opening trigger, focus order,
  Escape/dismissal where appropriate, selection/activation, and focus return.
- For overlay components, verify that background interaction and focus behavior
  match the primitive's intended modal or non-modal mode. Do not add custom
  focus traps.
- Test the requested behavior at the application level after implementation;
  do not rely on screenshots alone for interactions.
