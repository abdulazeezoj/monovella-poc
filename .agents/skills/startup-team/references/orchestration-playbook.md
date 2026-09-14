# Orchestration Playbook

Sequencing across the nine functional teams by venture stage. Work isn't strictly linear — several of these run in parallel — but the ordering below avoids the most common waste: a team producing polished work that a later-discovered blocker invalidates.

## Stage 1 — Idea

**Lead:** this skill (`/opportunity`), handing to `product-team`'s `/idea` once the market-level call is "pursue now."

Do now regardless of how early this is: nothing needs a document yet, but if anyone besides the founder is contributing (even informally), start tracking it — the IP-assignment gap gets expensive precisely because it's easy to ignore at this stage.

Don't yet: a financial model, a compliance pass, a formal legal entity if one doesn't already exist for this specific venture (unless a concrete near-term need — a contract to sign, funds to receive — requires one now).

## Stage 2 — Validate and spec

**Lead:** `product-team` (`/idea`, `/validate`, `/spec`), with `ui-ux-team` starting flow/structure work in parallel once the problem and rough scope are real.

Bring in `legal-team` for a lightweight pass the moment real user data (especially anything sensitive) is planned to be collected, even in a prototype — a data-handling decision made casually here is expensive to unwind once real users are attached to it. Bring in `security-team` for a threat model once the system design is real enough to have actual trust boundaries, not before there's anything to model.

Judging whether this stage is actually done is where the evidence ladder in `references/opportunity-evaluation.md` earns its keep: a spec built on opinions and future-intent answers ("I'd definitely use that") isn't standing on the same ground as one built on observed or repeated behavior. If `product-team`'s validation work hasn't moved past the weaker rungs of that ladder, that's worth naming before green-lighting Stage 3's build effort — not to redo `product-team`'s work, just to flag that the evidence under the spec is thinner than it looks.

## Stage 3 — Build

**Lead:** `dev-team`, executing against `product-team`'s spec and `ui-ux-team`'s design, in the build-review loop both skills describe: `ui-ux-team`'s `/inspire` and visual plan first, then `dev-team` builds in slices, screenshots and tests each one, and sends it back to `ui-ux-team`'s `/review` before the next. Nothing reaches Stage 4 with a surprise still in it.

`security-team`'s threat-model findings become `dev-team`'s implementation requirements here, not a separate later pass. `legal-team` finalizes IP assignment for anyone who contributed code, design, or content during this stage — this is the last easy point to get it clean before the product is real and stakes are higher.

## Stage 4 — Launch

**Lead:** shifts to `content-team` and `sales-team` for go-to-market, with `dev-team` and `ui-ux-team` handling launch-readiness fixes.

`security-team` runs a pre-launch pass appropriate to what's now internet-facing and what data it handles (see `dev-team`'s security checklist for the per-change layer; `security-team`'s `/audit` for the systemic layer — access control, vendor exposure, cloud hardening). `legal-team` should have a real terms of service and privacy policy in place before real users arrive, not after. `dev-team`'s `/operate` pass (monitoring, alerts, tested backups, runbook, budget alerts) and `ops-team`'s support layer (self-serve help, automated first line, human escalation with a response-time promise) are launch requirements, not post-launch cleanup — a launch that still needs the founder watching a dashboard and answering every message isn't done. Use `/readiness` to pull a genuine go/no-go across all of this rather than launching on the strength of whichever team finished first.

When judging whether `sales-team`/`content-team`'s go-to-market plan is actually coherent (this skill's job here is a spot-check before calling the venture launch-ready, not building the plan itself), a useful mental model: GTM is a product of ICP, channel, positioning, and motion, not a sum — weak on any one of those breaks the whole plan regardless of how strong the others are. A launch plan that names a channel but no specific ICP, or a positioning line with no channel behind it, isn't actually ready. A coherent plan follows a sequence rather than a single campaign: one narrow beachhead segment, a message in that segment's own problem language, one primary channel, a low-friction first offer, and a way to capture what's learned from each conversion. Flag a plan trying to launch across several segments or channels at once before any single one has proven repeatable in one place.

## Stage 5 — Grow

**Lead:** `sales-team` (pipeline, revenue) and `content-team` (ongoing content) as the primary drivers, with `product-team` iterating based on real usage signal.

`finance-team` starts real unit-economics tracking here (CAC, margin, runway) — this is where those numbers stop being projections and start being measurable — and screens the grant track (`/grant`) if the venture's impact mechanism is real. `legal-team`'s ongoing governance obligations (annual returns, resolutions) become a recurring, not one-time, item from here on. `ops-team` runs what keeps the venture alive week to week: retention work on real churn signals, SOPs for anything that has gone wrong twice, supplier relationships for physical operations, and the actual hiring process once a role is real (`legal-team` for the contract, `security-team` for access). `dev-team`'s `/operate` health report is the recurring check that the system still runs itself. The test of this stage is how little of the founder's week the venture needs; what still needs the founder is the next thing to automate or delegate.

## Stage 6 — Raise

**Lead:** `finance-team` (the model, the dilution math) and `legal-team` (the actual instrument and cap table documentation) working together, with this skill's `/readiness` pulling the cross-functional signal an investor's own diligence will look for. See `references/investment-readiness.md` for the full framework — the six questions investors actually check, how the evidence bar scales with stage, and pitch/investor-communication mechanics.

This is where the "stage-gated" legal/finance work from earlier stages actually gets tested — a cap table that was kept clean from Stage 1 onward makes this fast; one reconstructed from memory during diligence is a common, avoidable source of delay. Check Nigeria Startup Act eligibility (`finance-team`'s `references/nigeria-tax.md`) before a raise, not after — the investor-side incentives are worth mentioning to prospective investors directly.

## What's stage-gated vs. cheap-to-do-anytime, across stages

**Cheap now, expensive later — do regardless of stage:** IP assignment for any contributor; keeping secrets out of source control and access lists current; basic entity registration once there's a real reason to contract or receive funds; not verbally promising equity without a real written agreement; screenshots and tests on every UI slice; a tested backup the day there is data worth keeping.

**Genuinely stage-gated — don't do early, don't skip when the stage arrives:** a full financial model (useless without real assumptions to model); a formal compliance audit (SOC 2/ISO 27001) before there's a customer or investor actually requiring it; priced-round legal documentation before there's a real term sheet; a full security audit/pentest before there's a real production system with real users to protect.
