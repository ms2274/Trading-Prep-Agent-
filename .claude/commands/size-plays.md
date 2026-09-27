---
description: Price today's options plays with real Robinhood contracts and size them to the $20-50 risk rule (read-only)
argument-hint: "[max risk in $, default 50]"
---

Price the options plays from the Trading Prep app's latest sheets using the
user's Robinhood connection, and size each one to their risk rule.

**This is read-only. Never call any tool that places, reviews, cancels or
exercises an order** (the project settings also block those). If the user
asks to place a trade from here, tell them to do it in Robinhood themselves.

Max risk per trade: $ARGUMENTS if given, otherwise $50. The user's range is
$20-50.

## Steps

1. Read `data/latest-sheets.json`. For each symbol in `sheets`, take
   `output.optionsPlays` (title, direction, entryTrigger, stopPrice,
   targetPrice, grade) and `output.date`. If the file is missing or the
   sheets aren't from today (compare `output.date` with today's date in
   New York), say so first — the user should click Refresh Prep in the app —
   then continue with what's there.

2. For each symbol, get the underlying price with the Robinhood equity quote
   tool. Use `quote.last_trade_price` (regular session) as S0, because
   option quotes only update during regular hours. Note its timestamp.

3. Get the option chain for the symbol. Pick the expiration: the earliest
   date 7-10 calendar days from today; if none falls in that range, the
   nearest one at least 7 days out (say which rule applied).

4. For each play, pick the contract **1 strike out-of-the-money from the
   play's entry price** (where the trader would buy it):
   - long → call, the first strike above entryTrigger
   - short → put, the first strike below entryTrigger
   SPY/QQQ strikes are $1 apart near the money; look it up with the option
   instruments tool (chain_id, expiration_dates, type, strike_price as
   e.g. "770.0000"). If that exact strike doesn't exist, use the nearest
   listed strike on the OTM side.

5. Get quotes for all chosen contracts in one option quotes call. Use
   `mark_price`, `bid_price`/`ask_price`, `delta`, `gamma`, `theta`,
   `updated_at`.

6. Estimate the option's price at the play's entry, stop and target with a
   delta-gamma approximation from S0 (compute this exactly — write and run a
   small script rather than doing the arithmetic in your head):

       P(S) = mark + delta*(S - S0) + 0.5*gamma*(S - S0)^2

   (delta is negative for puts, so this works for both directions.)
   - risk per contract   = (P(entry) - P(stop))   * 100
   - reward per contract = (P(target) - P(entry)) * 100
   - contracts = floor(max risk / risk per contract)
   - time decay per contract per day = |theta| * 100

7. Present one table per symbol:

   | Play | Grade | Contract | Mark (bid/ask) | Est. premium at entry → stop → target | Risk / contract | Contracts @ $max | Total risk | Reward : risk | Decay / day |

   Contract format: `SPY Oct 5 770C`. Then, under the table, one line per
   play that needs a flag:
   - 0 contracts → one contract risks more than the max; say by how much.
   - total risk under $20 → below their usual minimum.
   - time decay per day is larger than the risk per contract → holding
     overnight costs more than the stop; say so plainly.
   - wide bid/ask (spread over 5% of mark) → fills will be worse than the estimate.

8. End with a short caveat: these are estimates from the current delta and
   gamma. They ignore time decay before entry and changes in implied
   volatility. Quotes are as of the timestamps shown, so check live prices in
   Robinhood before trading.

Keep the whole answer to the tables plus the flags and caveat. No trade
recommendations beyond what the prep sheet already says.
