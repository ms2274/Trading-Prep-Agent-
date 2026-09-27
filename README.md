# Trading Prep Agent

A local morning prep dashboard for SPY/QQQ options trading, running on your
own Mac. Click the **Trading Prep** app in the Dock, click **Refresh Prep**,
and it fetches recent price data, computes objective levels (volume profile
POC/VAH/VAL and low-volume zones, 3-tier Dow Theory trend, S/R ladder,
regular-session levels, VIX regime), and has Claude write a prep sheet: red
flags, a game plan, graded supply/demand zones, and candidate options plays
with reward:risk checked in code.

It's a discretionary aid, not an auto-trader: nothing executes, and every play
is meant to be confirmed against live order flow in Bookmap.

## Stack

- Next.js 14 (App Router, TypeScript, Tailwind)
- [Polygon.io / Massive](https://polygon.io) — OHLCV bars and market holidays (Stocks Starter plan)
- [Financial Modeling Prep](https://site.financialmodelingprep.com/developer/docs) — VIX quote (free tier)
- [Supabase](https://supabase.com) — stores each generated prep sheet
- Anthropic Claude — writes the prep sheet from the computed levels

## First-time setup (on your Mac)

1. Clone the repo, then `npm install`.
2. Copy `.env.example` to `.env.local` and fill in the five keys.
3. Run the SQL in `src/lib/supabase.ts` (`SCHEMA_SQL`) in the Supabase SQL
   editor to create the `prep_sheets` table.
4. `bash scripts/service/install-service.sh` — builds the app, installs a
   background service that starts the server at every login (localhost only),
   and creates **Trading Prep.app** in `~/Applications`. Drag it to the Dock.

## Day to day

- Click **Trading Prep** in the Dock.
- To update to the latest code: `bash scripts/service/update-and-rebuild.sh`
  (pulls, rebuilds, restarts the server, rebuilds the app).
- To remove the background service: `bash scripts/service/uninstall-service.sh`.
- Server log: `scripts/service/server.log`.

## Scripts

- `npm run test:payload` — fetch bars and print computed levels (no Claude call, no Supabase write)
- `npm run test:claude` — run one full prep-sheet generation and print the result
- `npm run dev` — dev server at http://localhost:3000 (stop the background service first, both use port 3000)

## Strategy context

- Instruments: SPY/QQQ options, 1 strike OTM, 7-10 DTE
- Framework: Carmine Rosato supply/demand zones + LVNs + 3-tier Dow Theory
  (monthly/weekly/daily) + VIX regime filter
- Risk: $20-50/trade, target 2-5x; plays under 3:1 reward:risk are dropped
- Execution: discretionary, Bookmap for live order flow
