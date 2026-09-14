# Security checklist (DevSecOps)

Security is cheapest the earlier it's caught — a flaw caught pre-commit costs a keystroke; the same flaw caught in production costs an incident. The point of a layered checklist isn't to run every tool on every change; it's to know which layer a given change should pass through, and not skip it because it's inconvenient.

## Layer 1 — Local / pre-commit

Runs on the developer's machine before code is even pushed:

- **Secrets scanning** (gitleaks, detect-secrets) — catch API keys, tokens, and credentials before they ever enter git history. Rotating a leaked secret after a `git push` is far more expensive than never committing it.
- **Basic linting and formatting** — catch obvious anti-patterns before review time is spent on them.
- Set up via a pre-commit hook (the `pre-commit` framework or similar) so it's automatic, not a step someone has to remember.

## Layer 2 — CI / pull request

Runs on every PR, before merge:

- **SAST** (Semgrep, CodeQL, SonarQube) — static analysis for known vulnerability patterns (injection, unsafe deserialization, hardcoded credentials that slipped past layer 1).
- **SCA / dependency scanning** (Dependabot, Snyk, `pip-audit`, `npm audit`) — flag known-vulnerable dependencies before they merge, not after a CVE alert months later.
- **Type checks and tests** — not strictly "security," but a broken type contract or missing test coverage on an auth path is a security gap in practice.
- **Cross-tenant / permission tests** for anything touching multi-tenant data — an explicit test asserting "user A cannot read user B's data," not an assumption that the query filter is correct.

## Layer 3 — Pre-deploy / CD

Runs on build/deploy, before code reaches production:

- **Container scanning** (Trivy, Snyk) and **SBOM generation** — know what's actually in the image being shipped, for both vulnerabilities and license compliance.
- **IaC scanning** (Checkov, tfsec/Trivy) — catch misconfigurations (public buckets, open security groups, missing encryption) in Terraform/CloudFormation/Kubernetes manifests before they're applied, not after.
- **Migration review** — inspect any schema migration for backward compatibility, locking behavior on large tables, and whether it's actually reversible.
- **Secrets management check** — confirm secrets come from a secrets manager / environment injection, not baked into the image or config file.

## Layer 4 — Runtime / production

Ongoing, after deployment:

- **DAST** in staging (OWASP ZAP or similar) for internet-facing surfaces, before they're internet-facing in prod.
- **Runtime monitoring** (Falco or platform-native equivalents) for anomalous behavior.
- **Audit logging** for sensitive actions (auth changes, data exports, permission changes) — kept out of general application logs, retained per compliance requirement.
- **Alerting on auth/authz failures at unusual volume** — a spike in 401/403s is often the first visible sign of an attack in progress.

**Alignment with `/operate`.** This layer and SKILL.md's "Running it in production" section are the same layer seen from two sides: the items above are what security needs at runtime, and `/operate` adds what keeps the system healthy at all — actionable alerts (down, error spike, backup failed, spend over budget), scheduled and restore-tested backups, a budget alert on every paid account, and automated dependency/security updates gated by CI. Treat them as one runtime checklist, not two: an unpatched dependency is a security gap *and* an operations gap, an untested backup is a ransomware exposure *and* a data-loss exposure. If a system passes `/operate` but not this section, or the reverse, the runtime layer isn't done. The `/operate` runbook in `templates.md` is where the "what to do when it fires" side of every alert here should be written down.

**A model in production** adds to the runtime layer rather than replacing any of it:

- **Input and prediction drift monitoring** — track the distribution of what the model actually receives and what it outputs against the training/validation baseline, and alert when it moves past a stated threshold; accuracy decays silently, so the trigger has to be a measurable signal, not a complaint.
- **Model version rollback** — every served model has a version, the previous version stays deployable, and rolling back is one documented step in the runbook, tested the same way a code rollback is.
- **A retraining trigger** written down (a drift threshold, a metric floor on fresh labeled data, or a calendar) rather than "when it feels stale".
- **Model inputs are untrusted** — validate shape and range before inference, and never log raw inputs that contain personal data (a photo, a document, a message) beyond what debugging needs and retention allows.
- **Serving endpoint** gets the same auth, rate limiting, and cost cap as any other endpoint; an open inference endpoint is both a data-exfiltration surface and an unbounded compute bill.

## Standing rules, regardless of layer

- **Least privilege, deny by default** — a new service account or IAM role starts with nothing and gets exactly what it needs, not broad access trimmed down later (which rarely actually happens).
- **Never log sensitive data** — PII, secrets, tokens, and full request/response bodies for sensitive endpoints don't belong in application logs, even at debug level.
- **Server-side enforcement of auth/ownership/tenant boundaries, always** — a client-side check is a UX nicety, never a security control.
- **Input validation at every boundary it crosses**, not just the outermost API layer — a value that's validated on the way into a queue still needs validating on the way out, since the producer and consumer can drift out of sync over time.
- **Encryption in transit always; at rest for anything sensitive** (PII, health data, financial data, credentials).

## Sizing the checklist to the change

A one-line copy fix doesn't need a full pass through all four layers — pre-commit and CI are enough. A change touching auth, payments, tenant boundaries, secrets, or infrastructure-as-code should genuinely go through the layer it affects, even under time pressure — this is exactly the kind of change where skipping the layer is how incidents happen. When time-constrained, name explicitly which layer was skipped and why, rather than silently skipping it.
