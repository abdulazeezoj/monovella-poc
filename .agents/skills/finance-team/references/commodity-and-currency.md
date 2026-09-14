# Commodity and Currency Finance

For ventures with physical-goods economics (commodity sourcing, processing, or export) or meaningful foreign-currency exposure — relevant alongside standard SaaS/services financial modeling, not a replacement for it.

## Landed cost

The real cost of a commodity isn't the purchase price alone — it's everything required to get it to the point of sale or use:

- Purchase price (farm-gate or supplier price)
- Freight and logistics (transport from source to storage/processing/port)
- Duties, levies, and export/import documentation costs
- Storage and handling (including any spoilage/loss allowance for perishables or moisture-sensitive goods)
- Financing cost (interest on any capital borrowed to fund the purchase before sale)
- Quality/inspection and certification costs where applicable (phytosanitary certificates, quality grading)

**Margin should always be calculated against landed cost, not purchase price.** A trade that looks attractive on a simple price-spread basis (buy at X, sell at Y) can be marginal or loss-making once real logistics, financing, and loss allowances are included — this is one of the most common ways commodity-trade margin estimates turn out optimistic.

## FX exposure

Any deal with costs and revenue in different currencies (e.g. a naira-denominated cost base against a dollar-priced export, or vice versa) carries currency risk *separate from* the underlying commodity margin — the trade can be profitable on the commodity itself and still lose money (or make more than expected) purely from exchange-rate movement between the purchase and sale/settlement dates.

Practical questions to make explicit in any cross-currency deal: which currency is the cost base actually in, which currency is the revenue actually settled in, how much time elapses between locking in cost and receiving revenue (the exposure window), and whether that gap is hedged (a forward contract, a natural hedge from matching currency flows) or left open. An open, unhedged position over a long exposure window on a volatile currency pair (naira volatility specifically) is a real, quantifiable risk that should be sized and stated, not left implicit in a margin estimate that assumes today's exchange rate holds.

## Working capital cycle

Commodity trading often ties up cash for a real stretch of time between paying for goods and receiving payment for the sale (purchase → transport → storage → sale → collection). Model this cycle length explicitly — it determines how much capital is actually needed to run a given volume of trade, and how many cycles per year are realistically achievable, which matters more to total annual return than the margin per cycle alone.

## What this means for pricing an investor ask

When presenting a commodity deal's return to an investor (e.g. an aggregation/trading cycle ask), show: landed cost per unit, expected sale price per unit and its basis (a specific market reference, not just "current price"), margin after all landed costs, the working capital cycle length, number of cycles the capital could realistically support in the period, FX exposure and how it's handled, and a downside case (a price or FX move against the position) alongside the base case — not just the base-case return figure alone.
