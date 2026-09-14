# Metrics and Modeling

## Burn and runway

**Gross burn** — total monthly operating expenses (payroll, rent, tools, marketing, everything), regardless of revenue.

**Net burn** — gross burn minus monthly revenue. This is the number that actually determines runway, since it reflects real cash outflow.

**Runway** — cash on hand ÷ net burn (monthly). If net burn is negative (i.e. the business is cash-flow positive), runway is effectively infinite from burn alone — worth stating explicitly rather than dividing by a negative number.

A high burn rate isn't automatically a problem — if it's funding growth that's demonstrably working (revenue and margin improving alongside it), investors and the business itself can be fine with it. A high burn rate funding a model that *isn't* working (flat revenue, no improving unit economics) is the actual warning sign. Don't flag burn level alone as a finding — flag burn relative to what it's producing.

**Practical monitoring:** recalculate runway monthly at minimum, and treat anything under 6 months as requiring an active plan (raise, cut spend, or grow revenue) rather than a wait-and-see approach — the time needed to raise or meaningfully cut costs is usually measured in months, so a 6-month runway is often really a "decide now" runway, not a "still fine" one.

## Unit economics

**CAC (Customer Acquisition Cost)** — total sales and marketing spend over a period, divided by new customers acquired in that period. Include all real costs (ad spend, sales salaries and commissions, relevant tool costs) — a CAC that only counts ad spend understates the real cost and produces a misleadingly good LTV:CAC ratio.

**LTV (Lifetime Value)** — expected gross profit (not revenue — profit after cost of serving the customer) from a customer over the full relationship, accounting for retention/churn. A common approximation: (average revenue per customer per period × gross margin %) ÷ churn rate per period.

**LTV:CAC ratio** — the standard efficiency heuristic. Roughly: below 1:1 means the business loses money on every customer; 1-3:1 is marginal; 3:1+ is the commonly cited healthy benchmark for venture-track SaaS; well above 5:1 can actually indicate *under*-investment in growth, not just efficiency. These benchmarks are SaaS-calibrated — a services business, a physical-goods business, or an early-stage product with thin churn data needs real judgment, not a mechanical benchmark match.

**CAC payback period** — months of gross profit from a customer needed to recover their acquisition cost. Shorter payback means less cash needed to fund growth; it's often a more actionable number day-to-day than the LTV:CAC ratio, especially for a cash-constrained (bootstrapped) business.

**Gross margin** — revenue minus direct cost of delivering the product/service, as a percentage of revenue. For software this is typically high (70-85%+ is a common healthy range); for anything with real per-unit delivery cost (physical goods, heavy support/services), it will be meaningfully lower and that's not inherently a problem — compare against the actual business model, not a SaaS benchmark reflexively.

**Churn** — the rate at which customers/revenue leave over a period. Needs a real, stated time window (monthly vs. annual churn are very different numbers) and enough data (roughly 6+ months) to be meaningful — a churn number from a handful of early customers is noise, not signal, and shouldn't drive a major decision yet.

**Break-even revenue** — total fixed costs ÷ gross margin %. The revenue level at which the business covers its costs with no profit or loss — a useful target number distinct from runway (which is about survival time) and unit economics (which is about whether growth is efficient).

## Building a model that's actually useful

Start from the smallest set of real inputs that drives the decision at hand — a runway question needs cash, burn, and maybe a scenario lever (a planned hire, a planned spend cut); it doesn't need a full 3-year build. Expand to a fuller model (monthly projections, cohort-level unit economics, scenario/sensitivity analysis) when the decision actually calls for it — a fundraise, a board update, an annual plan.

Always separate: **known** (actual historical numbers), **assumed** (a stated, labeled projection input, e.g. "assumes 10% MoM growth"), and **derived** (calculated from the other two, e.g. runway from cash and burn). A model that blends these without labeling invites false confidence in numbers that are actually guesses.

For a bootstrapped or resource-constrained business specifically, prioritize liquidity metrics (runway, cash conversion) alongside profitability metrics — a model that shows good unit economics but doesn't show the business can survive long enough for those economics to compound is incomplete.
