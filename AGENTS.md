Behavioral guidelines to reduce common LLM coding mistakes. These bias toward
caution over speed — for trivial tasks, use judgment.

## 1. Think Before Coding

**Don't assume. Don't hide confusion. Surface tradeoffs.**

Before implementing:
- State your assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them - don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

## 2. Simplicity First

**Minimum code that solves the problem. Nothing speculative.**

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.

Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

## 3. Surgical Changes

**Touch only what you must. Clean up only your own mess.**

When editing existing code:
- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it - don't delete it.

When your changes create orphans:
- Remove imports/variables/functions that YOUR changes made unused.
- Don't remove pre-existing dead code unless asked.

The test: Every changed line should trace directly to the user's request.

## 4. Goal-Driven Execution

**Define success criteria. Loop until verified.**

Transform tasks into verifiable goals:
- "Add validation" → "Write tests for invalid inputs, then make them pass"
- "Fix the bug" → "Write a test that reproduces it, then make it pass"
- "Refactor X" → "Ensure tests pass before and after"

For multi-step tasks, state a brief plan:
```
1. [Step] → verify: [check]
2. [Step] → verify: [check]
3. [Step] → verify: [check]
```

Strong success criteria let you loop independently. Weak criteria ("make it work") require constant clarification.

These guidelines are working if: fewer unnecessary changes in diffs, fewer
rewrites due to overcomplication, and clarifying questions come before
implementation rather than after mistakes.

## Skill routing

When the user's request matches an available skill, invoke it via the Skill tool. When in doubt, invoke the skill.

gstack skills run in sprint order — **Think → Plan → Build → Review → Test →
Ship → Reflect** — each feeding the next. "Build" has no dedicated skill: it's
the plain implementation step once a plan is approved.

Key routing rules, grouped by phase:
- **Think** — Product ideas/brainstorming → invoke /office-hours
- **Plan**
  - Strategy/scope → invoke /plan-ceo-review
  - Architecture → invoke /plan-eng-review
  - Design system/plan review → invoke /design-consultation or /plan-design-review
  - Developer-experience plan review → invoke /plan-devex-review
  - Full review pipeline (CEO → design → DX → eng) → invoke /autoplan
  - Author a backlog-ready spec/issue → invoke /spec
- **Build**
  - No dedicated skill — plain implementation once a plan is approved
  - Explore mockup variants, then turn the winner into production HTML → invoke /design-shotgun, then /design-html
  - Generate a diagram (mermaid + excalidraw + SVG/PNG) → invoke /diagram
  - Turn markdown into a publication-quality PDF/doc → invoke /make-pdf
- **Review**
  - Code review/diff check → invoke /review
  - Bugs/errors → invoke /investigate
  - Visual polish (fix what's found) → invoke /design-review
  - Live developer-experience audit → invoke /devex-review
  - Security threat model (OWASP/STRIDE) → invoke /cso
- **Test**
  - QA/testing site behavior → invoke /qa or /qa-only
  - Give the agent a browser to drive/inspect the site → invoke /browse
  - Pull structured data off a page → invoke /scrape
  - Import real browser cookies for authenticated testing → invoke /setup-browser-cookies
  - Share the browser with another AI agent → invoke /pair-agent
  - Baseline/compare page load and Core Web Vitals → invoke /benchmark
- **Ship**
  - Ship/deploy/PR → invoke /ship or /land-and-deploy
  - Post-deploy monitoring for regressions → invoke /canary
- **Reflect**
  - Save progress → invoke /context-save; resume context → invoke /context-restore
  - Weekly/per-person engineering retro → invoke /retro
  - Update docs to match what shipped → invoke /document-release
  - Generate missing docs from scratch → invoke /document-generate
  - Review/prune cross-session learnings → invoke /learn

## Python type annotations

Python code (currently `api/`) uses strict type annotations, enforced by
Ruff's `ANN` rules and `ty` — both configured once in the root
`pyproject.toml` and inherited by every Python subproject, which keeps no
competing `[tool.ruff]`/`[tool.ty]` section of its own.

- Every function and method — including tests and fixtures — has a
  complete signature: every parameter and the return type annotated.
- Prefer built-in generics and PEP 604 unions (`list[str]`, `dict[str,
  int]`, `X | None`) over `typing.List`/`Optional`.
- Don't silence a missing or wrong annotation with `# type: ignore`/`# ty:
  ignore`; fix the annotation instead. Only suppress a specific,
  understood false positive, with the rule code and a comment explaining
  why.
- Run the subproject's lint/typecheck tasks (e.g. `mise run api-lint` and
  `mise run api-typecheck`) before considering Python work done.

## Environment files

`.env.example` is the template every other `.env.<environment>` file in the
repository root is a copy of: same sections, same comments, same variables on
the same lines. A variable that does not apply to an environment stays on its
own line, commented out, rather than being deleted, so a `diff` between any two
files shows only values and which lines are set.

When adding or removing a setting:

- Add it to **all five** files (`example`, `local`, `test`, `staging`,
  `production`) in the same position with the same comment, commented out
  wherever it does not apply. Never add it to one file only.
- Add it to `docker-compose.staging.yml` and `docker-compose.production.yml`'s
  `x-api-environment` too, or the app containers never receive it. Use
  `${VAR:-}` only for a setting whose code path is guarded against an empty
  value; anything interpolated directly into a URL or command needs a real
  default.
- Keep `.env.example` and `.env.test` free of real credentials — they are the
  only two that are checked in.

## Commits and releases

Use Conventional Commits for every commit:

```text
<type>(<optional scope>): <short imperative summary>
```

Use an appropriate type such as `feat`, `fix`, `refactor`, `docs`, `test`,
`build`, `ci`, `chore`, or `perf`. Keep each commit focused and use two commit
classes only:

When a commit needs more context than its short subject can carry, add a blank
line followed by a bullet-list body. State the concrete changes, behaviour, or
important migration notes. For example:

```text
feat(labs): link uploaded results to care journeys

- Notify the patient and requesting specialist when a result is uploaded.
- Retain the result against its originating lab request and consultation.
```

1. **Change commits** contain product, application, configuration, test, or
   documentation changes. They must use the Conventional Commit format.
2. **Release commits** record a repository release. Until `v1.0.0`, a release
   commit contains the root `VERSION` and `CHANGELOG`, plus the version
   manifest for every subproject affected by the release. It must not include
   implementation changes. Use `chore(release): v0.x.y` as its commit message.

### Root release policy

- The root `VERSION` (`v{x}.{y}.{z}`) is the single, cumulative release
  version for the whole repository — every change commit counts toward
  it, whether it lands in the root project or a subproject (`prototype/`,
  `web/`, `api/`, `mobile/`).
- `x` is the release stage: `0` until the project reaches `v1.0.0`.
- `y` bumps when the release includes at least one feature-level change
  commit (`feat`) since the prior release; reset `z` to `0`.
- `z` bumps otherwise — a release with only fix/patch-level change
  commits (`fix`, `docs`, `chore`, `refactor`, `test`, `build`, `ci`,
  `perf`) since the prior release.
- `CHANGELOG` is rewritten for each release, never appended to: the file
  always shows only the latest release's aggregated changes, not a
  cumulative history (that lives in git tags/log). Its content must
  aggregate the changes released from the root project and every
  subproject since the prior release.
- Do not combine implementation changes with a release commit.

### Subproject versions

- `prototype/` keeps its own version in the manifest used by that prototype
  (for example, `package.json` or `pyproject.toml`).
- `web/` (React Router) and `mobile/` (Expo React Native) keep their own
  version in `package.json`.
- `api/` (FastAPI) keeps its own version in `pyproject.toml`.
- When a subproject has changes in a release, update its manifest version in
  that release commit alongside the root `VERSION` and `CHANGELOG`. Leave
  unchanged subproject manifests out of the commit.

## Design System

Always read `DESIGN.md` before making any visual or UI decisions. All font
choices, colors, spacing, motion, and aesthetic direction are defined there.
Do not deviate without explicit user approval. In QA mode, flag any code that
doesn't match `DESIGN.md`.

## Frontend design and UI primitives

For every frontend design, redesign, or visual refinement task, use the
`impeccable` skill. Run its context command once per session and follow the
playbook that matches the request; read its craft-floor guidance immediately
before making a UI edit. `docs/product/PRODUCT_SPEC.md` is the durable
product truth and `DESIGN.md` is the durable visual truth. The root
`PRODUCT.md` is a thin compliance shim the `impeccable` skill requires to
exist; it is not a source of truth and must never duplicate
`PRODUCT_SPEC.md`'s content. The design system, not a component library
preset, sets Monovella's typography, spacing, color, states, motion, and
responsive behavior.

Use shadcn/ui with its Base UI primitives whenever an installed component
matches the interaction need. Check existing components first and add missing
ones with the project's package runner. shadcn provides accessible semantics,
focus management, and keyboard behavior; it does not define Monovella's visual
identity.

Use the `shadcn` skill when adding, adapting, or using a shadcn component. Use
the `base-ui` skill whenever the work selects, composes, styles, or debugs the
underlying `@base-ui/react` primitives. Check the installed package version and
the skill's local upstream reference index before relying on an exact API.
Preserve compound-part semantics, controlled/uncontrolled state ownership,
composed handlers and refs, focus behavior, and keyboard interactions.

- Do not ship default shadcn styling, generic SaaS dashboard shells, component
  galleries, or interchangeable card grids as the product design.
- Adapt shadcn component source and variants intentionally to the tokens and
  visual rules in `DESIGN.md`; preserving Base UI semantics, ARIA behavior,
  focus handling, and keyboard interactions is mandatory.
- Design each surface for its actual mode and job. Establish clear hierarchy,
  useful empty/loading/error states, and responsive behavior from the start;
  do not treat these as a late styling pass.
- Prefer semantic design tokens and component variants over one-off raw colors,
  ad-hoc typography, or per-screen visual overrides.
