# Stack defaults

These are the defaults for *new* decisions in a project that doesn't already have an established convention — not a recommendation to migrate an existing, working choice. Always explain a deviation; never explain a repo just following its own existing pattern.

**Lock-in prevention is a standing constraint, not just a cost preference.** Default to self-hosted, open-source, and portable options across the stack. Reach for a managed/proprietary service only when there's a genuine necessity — not because it's more convenient by default. Necessity means one of: a real capability gap self-hosting can't close (e.g. no viable open-weight model matches a frontier LLM's reasoning quality for the task), the team's operational capacity genuinely can't sustain running it reliably at the required uptime, a compliance/certification requirement only a vendor can provide, or a demonstrated cost/time crunch where self-hosting isn't feasible right now. "It would be a bit less setup" is not, on its own, a necessity — that's the convenience trade lock-in prevention has already decided against by default. When a managed service is used, prefer the version that's easiest to exit later (standard APIs, exportable data, no proprietary extensions) over one that's cheapest or fastest to adopt today.

Several categories below have more than one real option in active use across projects. Where that's true, the goal isn't picking one winner forever — it's applying a consistent decision rule so the same kind of choice doesn't get re-litigated from scratch every time, and so two options for the same job don't quietly end up coexisting in the same project without a reason.

## Frontend and app shapes

- **Web:** Next.js (App Router). Server components by default means less client JS shipped and no duplicate client/server fetching.
- **Mobile:** Expo (React Native). Shares patterns and often code with the Next.js web app, and ships to both app stores from one codebase.
- **Desktop:** Electron, when a real desktop app is the requirement. It's the heaviest option on this list (bundles a full Chromium + Node runtime, hundreds of MB, real memory overhead) — reach for it only when the task genuinely needs desktop-native capability (filesystem access, OS integration, offline-first), not as a default wrapper for something a responsive web app or PWA could serve just as well.

- **CLI:** Python with Typer (Click underneath) for tools that live in the Python ecosystem, Node with Commander or oclif for tools that live in the JS ecosystem. Package for the actual audience: pip/pipx for developers, npm global install for JS teams, Homebrew or a single binary (PyInstaller, pkg) for people who won't install a runtime. A CLI gets the same structure, tests, docs, versioning, and release process as an app — `--help` that actually helps, exit codes that scripts can rely on, and no interactive prompt when stdin isn't a terminal.

UI layer (Tailwind CSS, shadcn/ui, daisyUI) is shared across web/mobile/desktop where the framework supports it — see UI below.

## Backend

- **FastAPI** — default when the service is primarily an API/ML/AI interface: model inference, data pipelines, anything leaning on the Python ecosystem (sklearn/PyTorch/pandas). DI keeps DB sessions/auth/settings testable, Pydantic gives validation for free, async support avoids blocking under concurrent load.
- **Next.js (API routes, TS)** — default when the backend is mostly a BFF: coordinating the web frontend, webhooks, and external integrations, with little or no inference work. End-to-end type sharing with the Next.js frontend is the win here.

Decision rule: route by what the service actually does, not by habit. It's normal and not over-engineering for one product to run both — a Python service for inference and a Next.js API layer for user-facing orchestration — as long as each is doing the kind of work that justifies its language. It becomes needless complexity when both are just doing CRUD against the same data; in that case, pick one and stop splitting.

Don't impose a heavy domain-driven folder structure on a small service with a handful of endpoints — let the codebase's actual size, not its imagined future size, justify that structure.

## Language

- **Python** — ML/data work, FastAPI services, anything using sklearn/PyTorch/TensorFlow.
- **TypeScript** — web, mobile (Expo), desktop (Electron), and any Next.js-based backend. One language across the whole JS-adjacent surface keeps type-sharing possible end to end.

Never duplicate business rules across a Python service and a TypeScript one — pick which side owns a given rule and have the other side call it, not reimplement it.

## Database

- **Postgres** — default relational store, self-hosted via Docker/Compose alongside the rest of the stack; reach for it first for anything with real relationships, transactions, or the need for strong consistency.
- **MongoDB** — only when the data is genuinely document-shaped (deeply nested, schema-flexible, no meaningful relations to enforce) or an existing service has already standardized on it. Running Postgres and MongoDB side by side for data that could live in either is two databases to operate, secure, and back up instead of one — that cost needs a real reason, not just "documents felt easier."
- **Managed database** — only once self-hosted Postgres/Mongo genuinely can't meet the reliability, backup, or scaling need with the team's current operational capacity. Default to self-hosting on your own Docker infrastructure first, since standard Postgres/Mongo are themselves portable — the lock-in risk here is usually not the database engine but a vendor's proprietary managed-database extensions, so if a managed option is used, avoid provider-specific features that would make migrating back to self-hosted painful later.

## Object storage (S3-compatible)

- **Self-hosted (RustFS, or MinIO-style)** — default. Runs alongside the rest of the stack in Docker, speaks the standard S3 API, and keeps data and cost fully under your own control.
- **Managed (cloud provider S3, or a managed S3-compatible service)** — only when a specific necessity applies: durability/geo-replication guarantees self-hosting can't practically match yet, a compliance requirement, or the team's operational capacity can't sustain it reliably. Since the S3 API itself is a de facto standard, a managed provider is a comparatively low-lock-in choice if one is needed — but still avoid provider-specific features (e.g. proprietary lifecycle/replication tooling) that would make switching providers later harder than it needs to be.

## Workers / background jobs

- **Taskiq** — default for a Python/FastAPI service: async-native, lighter-weight, fits an async-first codebase without Celery's broader (and heavier) feature surface.
- **Celery** — when the project needs Celery Beat's mature scheduling, an already-existing Celery deployment, or ecosystem features Taskiq doesn't cover yet.
- **BullMQ** — default when the producer/consumer is Node/TypeScript; it's Redis-backed and fits naturally alongside a Next.js backend already using Redis for caching.

All three are self-hosted by default (they run against your own Redis/broker) — there's no managed-vs-self-hosted decision to make here, which keeps this category naturally lock-in-free.

Decision rule: one queue mechanism per language/service — don't run both Celery and Taskiq in the same Python service. If both a Python and a Node service need background work, it's fine for each to use its own native option (Taskiq/Celery on the Python side, BullMQ on the Node side) rather than forcing one queue technology across a polyglot system.

## Cache

- **Redis**, self-hosted via Docker — default and effectively the only real choice here; no decision to make unless there's an unusual constraint. A managed Redis is only worth it if the team's operational capacity genuinely can't sustain running it — cache infrastructure is usually one of the cheapest and lowest-risk things to self-host.

## Messaging

- **Redis (pub/sub or streams)** — default for lightweight messaging when Redis is already in the stack as a cache — reuse it before adding a second messaging system.
- **RabbitMQ** — once the need is genuinely more than Redis comfortably handles: robust routing, dead-lettering, delivery guarantees, multiple distinct consumer patterns. Self-hosted via Docker by default, same as everything else in this stack.
- **Managed messaging (SQS, cloud pub/sub)** — only when the team's operational capacity can't sustain a self-hosted RabbitMQ/Redis reliably, not as a default convenience. This is one of the higher lock-in categories (queue semantics and APIs are provider-specific) — treat it as a real trade-off, not a free upgrade.

## Vector DB

- **pgvector on the existing self-hosted Postgres instance** — default; reach for this first. No new service to run, patch, or pay for, and it inherits Postgres's portability.
- **Qdrant**, self-hosted — once retrieval volume/QPS or vector-specific features (advanced filtering, hybrid search at scale) genuinely exceed what pgvector handles comfortably. Still self-hosted by default, still portable.
- **Managed vector service** — only once self-hosting Qdrant genuinely exceeds the team's operational capacity at the required scale, not as a default starting point.

## AI/ML

- **sklearn** — default for classical ML on tabular data: fast to train, cheap to serve, easiest to debug, runs entirely on your own infra. Start here unless the problem genuinely needs deep learning.
- **PyTorch** — default for custom deep learning, fine-tuning, or research-adjacent model work; self-hosted training/serving on your own compute.
- **TensorFlow** — only where there's existing investment (an existing TF model, an existing TF-Serving pipeline) — PyTorch is the more common default for new deep learning work otherwise.
- **Open-weight models, self-hosted or via a portable inference layer** (e.g. Llama/Mistral/Qwen-class models on your own GPU infra or a swappable inference provider) — the lock-in-conscious default for LLM-shaped tasks that don't strictly need frontier-model capability: classification, extraction, summarization, drafting, most "AI feature" work that doesn't hinge on top-tier reasoning.
- **Managed frontier LLM APIs** (OpenAI, Anthropic, etc.) — reach for these when there's a genuine capability gap: the task needs reasoning, coding, or judgment quality that current open-weight models don't yet reliably match. That's a real, common necessity for a lot of product-grade AI work — this category isn't one to avoid on principle, just one to enter deliberately rather than by default.

However the model is served, put an LLM gateway (LiteLLM, or a self-hosted routing layer) in front of it — this is one of the most direct ways to apply the lock-in-prevention principle to AI specifically: a gateway keeps the application code provider-agnostic, so swapping a managed frontier model for a self-hosted open-weight one later (or between vendors) is a config change, not a rewrite. See `ai-engineering.md` for cost-effective model selection.

## UI

- **Tailwind CSS** — base utility layer, everywhere, no real alternative needed.
- **shadcn/ui** — default component layer: code is copied into the repo, not installed as a locked dependency, so it's cheap to customize, easy to audit, and about as lock-in-free as a component library gets.
- **daisyUI** — a class-based component layer on top of Tailwind; reasonable for fast prototyping or a project that wants pre-styled components via class names rather than owning component code.

Decision rule: pick one component strategy per app — shadcn/ui or daisyUI, not both. Mixing them means two different visual systems and two different customization models living in the same codebase, which drifts out of sync over time. Default to shadcn/ui for anything meant to last and get customized; daisyUI is fine for a quick prototype that isn't expected to become the long-term UI.

## Containers

- **Docker** — base default, always, for reproducible builds.
- **Docker Compose** — default for local development and small, single-host deployments.
- **Docker Swarm** — the default for multi-node orchestration on your own infrastructure once a single host isn't enough, precisely because it keeps deployment self-hosted and avoids handing orchestration to a managed platform. Reach past it to a managed container platform only when Swarm's operational load genuinely exceeds what the team can sustain, or when a specific capability (e.g. a managed Kubernetes ecosystem tool) is actually needed — not as a default upgrade.

## CI/CD and container registry

- **GitHub Actions or GitLab CI** — match whichever platform the code already lives on; don't run CI on a different platform from where the repo is hosted, that's an integration to maintain for no benefit.
- **Container registry** — default to whichever is bundled with the CI/CD platform already in use (GitHub Container Registry with GitHub, GitLab Registry with GitLab) to keep credentials and integrations to a minimum and avoid an extra cloud-provider dependency. Use a cloud provider's registry only when the deploy target specifically requires it.

## Infra

Default to self-hosted deployment (Docker Compose or Swarm on owned or rented compute — a VPS, bare cloud VM) over a PaaS. This is the category where lock-in prevention has the most day-to-day bite: a PaaS's deploy pipeline, environment config, and scaling behavior are usually the hardest things to port back out once a product depends on them. Reach for a managed PaaS only when self-hosting genuinely exceeds the team's current operational capacity — e.g. no one available to own on-call/patching for a launch-critical service — and treat that as a deliberate, temporary trade-off to revisit, not a permanent default.

## Testing and visual verification

- **Unit/component:** Vitest (or Jest where a repo already uses it) on the TypeScript side, pytest on the Python side. React Testing Library for components.
- **End-to-end and screenshots:** Playwright — one tool for the critical-flow tests *and* for the phone/tablet/desktop screenshots the frontend process in SKILL.md asks for at every slice. Keep a small script (or a Playwright test tagged `@visual`) that boots the dev server, visits the routes that changed, captures the three widths plus loading/empty/error states, and writes them somewhere the reviewer can open. If the coding agent has a browser tool, that works for ad-hoc looks; Playwright is what makes it repeatable.
- **Accessibility:** axe (`@axe-core/playwright` or `jest-axe`) in the same run, plus a keyboard-only pass and `prefers-reduced-motion` check on anything animated.
- **Model evaluation:** a versioned eval set and a script that prints the task metric against the current baseline (see SKILL.md's ML section); it runs in CI like any other test.

Decision rule: one test runner per language, and the screenshot/e2e tool is Playwright unless the repo already standardized on something else.

## Production operations (for `/operate`)

- **Logs/metrics/traces:** OpenTelemetry instrumentation with a self-hosted backend (Grafana stack: Loki for logs, Prometheus/Mimir for metrics, Tempo for traces) by default; a managed observability vendor only when the team can't run the stack. Structured JSON logs everywhere.
- **Uptime and alerting:** a self-hosted checker (Uptime Kuma or similar) hitting real user-facing routes, alerts to one channel the founder actually reads (WhatsApp, Telegram, or email), and only for actionable symptoms.
- **Backups:** scheduled dumps of Postgres/Mongo and object storage to a second location, with a restore test on a calendar. A backup nobody has restored is unverified.
- **Updates:** Dependabot or Renovate, gated by CI, auto-merging patch-level updates once the test suite is trusted.
- **Cost:** a budget alert on every paid account (cloud, LLM APIs, SMS/email providers), and an LLM gateway that reports cost per feature.
