# Fundraising Math

The numeric companion to `legal-team`'s `references/formation-and-equity.md`, which covers the same instruments from a legal-documentation angle. This file covers what they actually do to ownership, in numbers, before anything is signed.

## Pre-money vs. post-money valuation

**Pre-money valuation** — what the company is deemed worth immediately before new investment goes in. **Post-money valuation** — pre-money plus the new investment amount. The investor's ownership percentage is the investment amount divided by the *post*-money valuation, not the pre-money valuation — a common, costly error. A $1 million investment at a $4 million pre-money valuation gives the investor 20% ($1M / $5M post-money), not 25% ($1M / $4M) — always divide by post-money.

## Fully diluted ownership is the number that matters

Fully diluted ownership counts every share that *could* exist: issued shares, all outstanding options (granted and reserved-but-ungranted in the pool), and anything that will convert into shares (unconverted SAFEs, convertible notes, warrants). Investors always calculate and negotiate on a fully diluted basis. Quoting or calculating ownership from outstanding shares alone gives a misleadingly high number and is a common source of confusion (or worse, distrust during diligence) when the real fully diluted number surfaces later. Always model on a fully diluted basis.

## The option pool shuffle

One of the least understood mechanics in a term sheet, and one of the most consequential for founder ownership. When an investor requires a option pool of a certain size on a *post-money* fully diluted basis (commonly 10-20%), and the current pool is smaller than that, the shares needed to expand it are typically created *before* the investment closes — meaning existing shareholders (the founders) absorb that dilution alone, not shared with the incoming investor.

**Concrete shape of the problem:** a company with a 5% existing option pool, raising at a term sheet requiring a 15% post-money pool, has to create an additional 10 percentage points of pool from the pre-money cap table — diluting existing holders by that amount before the new investor's money is even accounted for. This is sometimes negotiated (moving some or all of the pool expansion to *post*-money, so the new investor shares in that dilution too) — knowing this mechanic exists is what makes it negotiable; not knowing it exists is how it gets missed.

**Practical step before signing any term sheet:** model the fully diluted cap table *after* the round, including the option pool at its required post-money size and any SAFE/note conversions, not just the headline new-investor percentage quoted in the term sheet. The number that matters is what the founders actually hold afterward, fully diluted.

## SAFE and convertible note conversion

Neither a SAFE nor a convertible note sets a price at the time it's signed — both convert into equity at a later priced round, based on a **valuation cap** (a ceiling on the valuation used for conversion, protecting the early investor from being diluted at the same price as a much-later, higher-valuation round) and/or a **discount rate** (a percentage off the priced round's valuation). The investor converts at whichever mechanism gives them more shares — so a SAFE with a $5M cap converting at a round priced well above $5M effectively gives that early investor a much lower share price than the new round's investors, for the same dollar amount invested.

**Why multiple SAFEs can surprise founders at the next round:** several SAFEs stacked from different early raises, each with its own cap, all convert simultaneously at the priced round — and low caps compound. It's realistic for stacked early SAFEs to produce a combined dilution meaningfully larger than founders expect if each was evaluated individually rather than modeled together. Always model all outstanding SAFEs/notes converting together against a realistic future round valuation before treating "just a small SAFE" as low-impact.

## Rough per-round dilution benchmarks (for calibration, not as a target)

Typical founder dilution per round tends to run roughly: seed 15-25%, Series A 17-25%, Series B 15-18%, later rounds progressively smaller percentages of a larger pie. These are broad medians from venture-market data and vary widely by amount raised, valuation, and pool size — useful for sanity-checking whether a specific term is in a normal range, not as a number to target mechanically. Cumulative dilution across several rounds compounds faster than founders intuitively expect — modeling two or three rounds forward, not just the current one, gives a much more honest picture of eventual ownership.

## What to actually do with this before signing anything

1. Get (or build) the current fully diluted cap table — actual numbers, not approximations.
2. Model the proposed round: new investor shares, option pool expansion at its required size and timing (pre- or post-money), and all SAFE/note conversions, together.
3. Look at the resulting fully diluted founder ownership — not the headline investor percentage in the term sheet.
4. Bring the modeled numbers and any specific questions (pool timing, cap levels) to `legal-team` for the document review, and to an actual lawyer once real investor counsel is involved — this skill's job stops at "here's what the numbers do," not drafting or negotiating the instrument itself.
