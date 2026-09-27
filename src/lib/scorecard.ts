import type { OptionsPlay, PlayGrade, SupplyDemandZoneDetail, ZoneStrength } from "./claude";
import type { HistoryEntry } from "./history";
import { barPhase, easternDateString } from "./polygon";

// A 7-10 DTE option is judged on the next 5 regular sessions after the sheet.
export const HORIZON_SESSIONS = 5;

export type PlayOutcome = "waiting" | "not_triggered" | "live" | "target" | "stop" | "no_result";
export type ZoneOutcome = "untested" | "held" | "broken";

export interface Bar {
  t: number;
  o: number;
  h: number;
  l: number;
  c: number;
}

export interface PlayResult {
  symbol: string;
  date: string;
  play: OptionsPlay;
  outcome: PlayOutcome;
  r: number | null; // +riskRewardRatio at target, -1 at stop
}

export interface ZoneResult {
  symbol: string;
  date: string;
  kind: "supply" | "demand";
  zone: SupplyDemandZoneDetail;
  outcome: ZoneOutcome;
  final: boolean; // false while the 5-session window is still running
}

export interface GradeStats {
  grade: PlayGrade | "All";
  total: number;
  triggered: number;
  wins: number;
  losses: number;
  winRate: number | null;
  avgR: number | null;
}

// Regular-session bars after the sheet was generated, limited to the first
// HORIZON_SESSIONS sessions. `complete` = the whole window has happened.
export function barsInHorizon(bars: Bar[], generatedAtMs: number, nowMs: number): { bars: Bar[]; complete: boolean } {
  const after = bars.filter((b) => b.t > generatedAtMs);
  const inWindow: Bar[] = [];
  const sessionDates: string[] = [];
  for (const b of after) {
    const d = easternDateString(b.t);
    if (sessionDates[sessionDates.length - 1] !== d) {
      if (sessionDates.length === HORIZON_SESSIONS) break;
      sessionDates.push(d);
    }
    inWindow.push(b);
  }

  // Finished once the 5th session has closed: a later day has started, or
  // it's after the regular session on that same day.
  const lastDate = sessionDates[sessionDates.length - 1];
  const nowDate = easternDateString(nowMs);
  const lastSessionClosed = lastDate !== undefined && (nowDate > lastDate || barPhase({ t: nowMs }) === "afterhours");
  return { bars: inWindow, complete: sessionDates.length === HORIZON_SESSIONS && lastSessionClosed };
}

export function evaluatePlay(play: OptionsPlay, bars: Bar[], horizonComplete: boolean): { outcome: PlayOutcome; r: number | null } {
  const { entryTrigger: entry, stopPrice: stop, targetPrice: target } = play;
  const long = play.direction === "long";
  const stopHit = (b: Bar) => (long ? b.l <= stop : b.h >= stop);
  const targetHit = (b: Bar) => (long ? b.h >= target : b.l <= target);

  // Triggered when price reaches the entry from whichever side it started on
  // (so a gap through the level still counts).
  const ref = bars[0]?.o;
  let triggered = false;

  for (const bar of bars) {
    if (!triggered) {
      const reached = ref > entry ? bar.l <= entry : ref < entry ? bar.h >= entry : true;
      if (!reached) continue;
      triggered = true;
      // Order inside the trigger bar is unknown: count its stop, never its target.
      if (stopHit(bar)) return { outcome: "stop", r: -1 };
      continue;
    }
    // Both in one bar → assume the stop came first (conservative).
    if (stopHit(bar)) return { outcome: "stop", r: -1 };
    if (targetHit(bar)) return { outcome: "target", r: play.riskRewardRatio };
  }

  if (!triggered) return { outcome: horizonComplete ? "not_triggered" : "waiting", r: null };
  return { outcome: horizonComplete ? "no_result" : "live", r: null };
}

export function evaluateZone(
  zone: SupplyDemandZoneDetail,
  kind: "supply" | "demand",
  bars: Bar[]
): ZoneOutcome {
  const touched = bars.some((b) => b.l <= zone.high && b.h >= zone.low);
  if (!touched) return "untested";

  // Broken = a session CLOSED beyond the far side of the zone.
  const sessionCloses = new Map<string, number>();
  for (const b of bars) sessionCloses.set(easternDateString(b.t), b.c);
  const closes = Array.from(sessionCloses.values());
  const broken = kind === "supply" ? closes.some((c) => c > zone.high) : closes.some((c) => c < zone.low);
  return broken ? "broken" : "held";
}

export function evaluateEntry(entry: HistoryEntry, bars: Bar[], nowMs: number): { plays: PlayResult[]; zones: ZoneResult[] } {
  const { bars: window, complete } = barsInHorizon(bars, new Date(entry.generatedAt).getTime(), nowMs);

  const plays = entry.plays.map((play) => ({
    symbol: entry.symbol,
    date: entry.date,
    play,
    ...evaluatePlay(play, window, complete),
  }));

  const zones = [
    ...entry.supplyZones.map((zone) => ({ kind: "supply" as const, zone })),
    ...entry.demandZones.map((zone) => ({ kind: "demand" as const, zone })),
  ].map(({ kind, zone }) => ({
    symbol: entry.symbol,
    date: entry.date,
    kind,
    zone,
    outcome: evaluateZone(zone, kind, window),
    final: complete,
  }));

  return { plays, zones };
}

export function gradeStats(results: PlayResult[]): GradeStats[] {
  const groups: (PlayGrade | "All")[] = ["All", "A", "B", "C"];
  return groups.map((grade) => {
    const rs = grade === "All" ? results : results.filter((r) => r.play.grade === grade);
    const wins = rs.filter((r) => r.outcome === "target").length;
    const losses = rs.filter((r) => r.outcome === "stop").length;
    const triggered = rs.filter((r) => ["live", "target", "stop", "no_result"].includes(r.outcome)).length;
    const resolved = wins + losses;
    const sumR = rs.reduce((sum, r) => sum + (r.r ?? 0), 0);
    return {
      grade,
      total: rs.length,
      triggered,
      wins,
      losses,
      winRate: resolved > 0 ? wins / resolved : null,
      avgR: resolved > 0 ? sumR / resolved : null,
    };
  });
}

export function zoneStats(results: ZoneResult[]) {
  const strengths: ZoneStrength[] = ["strong", "moderate"];
  return strengths.map((strength) => {
    const rs = results.filter((r) => r.zone.strength === strength);
    return {
      strength,
      total: rs.length,
      held: rs.filter((r) => r.outcome === "held").length,
      broken: rs.filter((r) => r.outcome === "broken").length,
      untested: rs.filter((r) => r.outcome === "untested").length,
    };
  });
}
