# Trading Prep Agent — notes for Claude

Local-only morning prep dashboard for SPY/QQQ options. See README.md for what
it does and how the user runs it. This file is the working knowledge for
changing it.

## Scope

- Discretionary prep aid. It produces zones, a game plan, and candidate
  options plays with entry/stop/target, but never places or automates trades.
  The user chose this deliberately (it originally was "no signals at all").
- Runs only on the user's Mac, bound to 127.0.0.1. No hosting, no deployment.
- Refresh is manual (button click). Ask before adding scheduled/automatic
  generation — it's been discussed but not approved.
- Robinhood: the user has the official Robinhood Agentic Trading MCP
  connected to their local Claude Code for manual, read-only exploration. Do
  not wire it into the app without the user confirming that first test was useful.

## Where things live

- `src/app/page.tsx` — app shell: sidebar tabs (Today / Analysis /
  Scorecard / Calculator), header with market status + Refresh, data loading
- `src/components/` — `TodayTab` (price cards with pre-market context, event
  risk, key takeaways/levels, game plan, options plays), `AnalysisTab`
  (per-symbol deep read), `ScorecardTab`, `CalculatorTab` (position sizing,
  no API calls), shared `ui.tsx`/`icons.tsx`
- `src/lib/sharedContext.ts` — fetches what's shared by all symbols once per
  refresh (VIX, holidays, economic + earnings calendars); each source fails
  independently and records why
- `src/lib/history.ts` + `src/lib/scorecard.ts` + `src/app/api/scorecard/` —
  every refresh appends that day's plays/zones to `data/history.json`; the
  Scorecard scores them on 5-min regular-hours bars over the next 5 sessions
- `.claude/commands/size-plays.md` — `/size-plays` for the local Claude:
  prices today's plays with real Robinhood contracts (read-only MCP calls)
  and sizes them to the $20-50 rule. `.claude/settings.json` denies the
  Robinhood order/cancel/exercise tools in this project.
- `src/app/api/refresh-prep/route.ts` — orchestrates a refresh for the
  symbols in `src/lib/symbols.ts`
- `src/app/api/latest-prep/route.ts` + `src/lib/latestSheets.ts` — the
  dashboard opens to the last generated sheets, saved in
  `data/latest-sheets.json` (gitignored, local disk)
- `src/lib/polygon.ts` — bars (1m/30m/4h/daily/weekly/monthly), holidays,
  regular-session helpers. Host `api.polygon.io` still works after the
  Massive rebrand — don't "fix" it.
- `src/lib/fmp.ts` — FMP `/stable/` endpoints: VIX quote, economic calendar,
  earnings calendar (`/api/v3/` is retired for new accounts: a 403 "Legacy
  Endpoint" means someone reverted this)
- `src/lib/buildPrepSheetInput.ts` — the one pipeline that turns raw bars into
  Claude's input; used by the route and `scripts/testClaude.ts`. Add new
  computed data here, not in callers.
- `src/lib/volumeProfile.ts`, `dowTheory.ts`, `srLadder.ts`, `vix.ts` — pure
  computation, no I/O
- `src/lib/claude.ts` + `src/prompts/prepSheet.ts` — Claude layer, model
  `claude-sonnet-5`
- `src/lib/supabase.ts` — history log of every sheet; `SCHEMA_SQL` has the
  table DDL. Optional: nothing in the app reads from it.
- `scripts/service/` — launchd background service (install / update /
  uninstall / the `run-server.sh` launchd executes)
- `scripts/app/` — builds `~/Applications/Trading Prep.app` (icon, launcher)

## Lessons — do not repeat these

1. **Never trust the model with arithmetic or exact comparisons.** Anything
   numeric (reward:risk, position relative to a level) is computed in code
   from the model's inputs. `computeRiskReward()` in `claude.ts` is the template.
2. **Keep tool-call schemas small.** One 7-field tool call intermittently
   returned a field as a malformed string with leaked tag text, even across
   retries. It's split into `generate_analysis` then `generate_plan`. Put
   substantial new output in a new call rather than growing these.
3. **Validate every field of Claude's tool output and retry.** A single
   malformed value (e.g. a price as a string) crashes the dashboard render.
   The validators in `claude.ts` check each zone and each play.
4. **Don't pass `temperature`** — this model rejects it with a 400 on every call.
   Test any API-parameter change with a real call before pushing.
5. **Filter to regular hours (9:30-16:00 ET) before picking "the latest
   day".** Doing it the other way round made the 1m profile all zeros
   whenever prep ran pre-market, and let pre-market/after-hours prints into
   prior-day open/high/low/close.
6. **One symbol's failure must not blank the dashboard.** The route uses
   `Promise.allSettled` and returns `{ sheets, errors }`; the Supabase write
   is wrapped separately so a storage failure never hides a good sheet.
7. **Bind to 127.0.0.1** (`-H 127.0.0.1`). Next.js defaults to every
   interface, which exposes the sheets and the paid refresh endpoint to
   anyone on the same Wi-Fi.
8. **launchd and Dock-launched apps get a bare PATH** without Homebrew/nvm.
   Scripts that call `npm` must set PATH themselves (see `run-server.sh`).
9. **Don't depend on Supabase for anything the dashboard needs.** The
   free-tier project pauses after ~a week of inactivity and writes then fail
   silently (by design). That's why the latest sheets live on local disk.
10. **Bump `STORE_VERSION` in `latestSheets.ts` whenever the
    PrepSheetInput/PrepSheetOutput shape changes**, so an old saved file is
    ignored rather than crashing the render.
11. **GET route handlers need `export const dynamic = "force-dynamic"`** in
    Next 14, or they're cached at build time and serve stale data forever.
12. **Refresh writes history BEFORE saving latest sheets.** The first
    history write seeds from the previous latest-sheets file; saving latest
    first overwrote it and silently lost that sheet.
13. **Unverified assumption:** FMP economic-calendar timestamps are treated
    as UTC. `npm run test:payload` prints the converted times — CPI/jobs
    report must show 08:30 ET, FOMC 14:00 ET. If not, fix `toEt` in `fmp.ts`.
14. **Never echo API keys back in chat.** A key copied out of an assistant
   message once arrived corrupted. Have the user paste keys straight from
   the provider's dashboard into `.env.local`.

## Where you're running changes what you can test

- **On the user's Mac (local Claude Code):** everything is reachable. Run
  `npm run test:payload` / `npm run test:claude` yourself, read
  `scripts/service/server.log`, and restart the server with
  `launchctl kickstart -k "gui/$(id -u)/com.tradingprep.server"` after
  changing `.env.local` (production mode doesn't reload env).
  After pulling code changes run `bash scripts/service/update-and-rebuild.sh`.
- **In a Claude Code cloud sandbox:** `api.polygon.io` and
  `financialmodelingprep.com` are blocked; `api.anthropic.com` is not. Test
  data-layer logic with synthetic bars (mock `fetch`), Claude-layer logic by
  stubbing `Anthropic.Messages.prototype.create` or with a real call, and UI
  with Playwright against a mocked `/api/refresh-prep`. macOS scripts can only
  be syntax-checked there. `lsof` doesn't see every listener in that sandbox —
  find stray servers with `pgrep -f "[n]ext-server"` (the brackets stop the
  pattern matching, and killing, your own shell).

## Working with this user

Prefers plain language and screenshots over terminal pasting, and has been
burned by "it's fixed" claims that weren't verified. Only say something is
fixed after running it; otherwise say exactly what still needs checking on the Mac.
