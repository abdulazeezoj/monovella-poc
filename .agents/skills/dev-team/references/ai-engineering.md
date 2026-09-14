# AI systems engineering

Model output is untrusted input, and a prompt is an attack surface — treat both with the same discipline as any other boundary the system crosses.

## Prompt injection: defense in depth

No single defense closes the gap, so layer several — each one raises the cost of a successful attack rather than promising to stop it outright:

1. **Input screening** — detect obvious override/jailbreak/role-manipulation attempts in user-submitted text before it reaches the model (a dedicated classifier, a moderation endpoint, or a lightweight pattern check as a first pass).
2. **Structural separation of system and untrusted content** — keep instructions and untrusted data (retrieved documents, tool outputs, user-pasted content) clearly and structurally separated in the prompt, not concatenated into one undifferentiated block. This is the single highest-leverage defense against indirect injection (malicious instructions arriving via a document, email, or web page the model reads).
3. **Least privilege on tools** — a model call that only needs to *read* should not hold a token that can *write*. Scope tool/API credentials to the narrowest permission the task needs, per call if the framework supports it.
4. **Output validation** — check tool-call arguments and generated content against expected shape/schema before executing or displaying them. A tool call with unexpected parameters is a signal, not something to execute optimistically.
5. **Access control before retrieval, not after** — in RAG, filter to documents the requesting user is actually authorized to see *before* retrieval and generation, not by trying to redact the output afterward. Retrieval-time filtering is the only version that reliably works — output-side redaction gets bypassed by prompt injection that convinces the model to include forbidden content anyway.

For anything agentic (the model can call tools, not just generate text), the tool-use boundary matters more than the prompt-level defenses — an agent with a scoped, typed tool interface is safer than one with a general-purpose "run this command" tool, regardless of how good the prompt-injection filtering is upstream.

## Cost-effective model selection

- **Use the cheapest model that reliably meets the requirement**, verified against an eval set — not the newest or largest model as a default. A smaller model that passes the eval at a fraction of the cost is the right choice; "the bigger model felt safer" isn't a substitute for measuring it.
- **Route by task, not globally** — classification, extraction, and simple formatting tasks rarely need the same model as open-ended reasoning or long-context synthesis. An LLM gateway makes per-task routing cheap to implement and change later.
- **Cache aggressively where inputs repeat** — identical or near-identical prompts (common in RAG over a stable corpus, or repeated classification of similar inputs) don't need a fresh model call every time.
- **Cap runaway cost paths explicitly** — agentic loops need a hard iteration/cost ceiling, not just a soft expectation that they'll converge; retries need backoff and a max, not unbounded retry-on-failure.
- **Track cost per call/request as a first-class metric**, not something reconstructed after a surprising bill — attribute cost to the feature/endpoint that generated it.

## Evaluation before shipping a change

Treat a prompt change, a model swap, or a retrieval-config change the same as a code change: it needs to pass a check before it ships, not just look right on a couple of manual tries.

- Maintain an eval set (even a small one, 20-50 representative cases, beats none) covering the task's actual distribution, including known-hard cases and adversarial inputs.
- Use it as a gate: a prompt/model change should be run against the eval set and compared to the current baseline before deploying, not after a user reports regression.
- For subjective quality (tone, helpfulness, groundedness), an LLM-judge with a clear rubric against a small human-labeled sample is a reasonable middle ground between full manual review and no evaluation at all — but calibrate the judge against human judgment first, don't trust it blindly.
- Don't claim a prompt/model change is an improvement without a reproducible comparison — "it felt better in my testing" isn't evidence.

## Observability

- **Trace every model call**: prompt version, model, latency, token counts, cost, and (where feasible) a quality signal — not just that a call happened, but what it cost and how it did.
- **Version prompts explicitly** the same way code is versioned, so a regression can be traced to the specific change that caused it and rolled back precisely.
- **Log enough to debug a bad output after the fact** (input, retrieved context, model, prompt version) without logging sensitive user content indefinitely — apply the same retention/redaction discipline as any other sensitive log data.

## Trained models: where that guidance lives

This file covers calling a model (LLM and agentic systems). Training one — classical ML on tabular data, or deep learning for vision and language — is covered in SKILL.md under "Machine learning and deep learning models": data as the actual product (source, labeling, leakage between splits, class balance, dataset versioning), choosing the metric the task needs rather than the easiest to report, experiment tracking so a result can be reproduced, subgroup evaluation for anything that affects a decision about a person, and drift/rollback/retraining once served. Read that section before planning any model work; `stack-defaults.md`'s AI/ML entry says which library to start with.

A compact checklist for a model-training PR, so a review of one reads like a review of any other change:

- **Baseline named and beaten** — the thing this replaces (a heuristic, a simpler model, nothing) and its number on the same test set.
- **Splits are clean** — train/validation/test separated before any preprocessing, with a leakage check for duplicates or near-duplicates across splits and for features that wouldn't exist at prediction time.
- **Metric and acceptance bar stated up front** — the task-appropriate metric (precision/recall/F1 or PR-AUC on imbalanced classes, mAP/IoU for detection/segmentation, task-specific measures for NLP), with the bar written before results were seen.
- **Subgroup results reported** for anything that influences a decision about a person, not just the aggregate.
- **Run is reproducible** — config, data version, seed, metric, and artifact recorded; someone else can rerun it and get the same number.
- **Dataset and model are versioned together**, and the PR says which version of each it produces.
- **Eval script runs in CI** and prints the metric against the current baseline (see `stack-defaults.md`, Testing).
- **Serving plan** — how it's served, the rollback to the previous version, the drift signal that will be monitored, and the retraining trigger (see `security-checklist.md`'s runtime layer for the production side).
- **Cost and latency measured**, not estimated, at the expected request volume.
- **No personal data in logs, notebooks, or committed artifacts** — check the diff for sample rows, images, or exports that shouldn't be in git.

## Human review for high-impact decisions

Any AI-generated output that materially affects a person (a medical/financial/legal suggestion, an account action, content shown to other users) needs a human-reviewable path before or immediately after it takes effect — the AI system proposes, a human or a hard-coded rule confirms, for anything where the cost of a bad output is high and hard to reverse.
