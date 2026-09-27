import {
  get1mBars,
  get30mBars,
  get4hBars,
  getWeeklyBars,
  getDailyBars,
  getMonthlyBars,
  computeSessionLevels,
  getRecentSessionDates,
  mostRecentSessionBars,
  filterRegularSession,
  easternDateString,
  barPhase,
  MarketHoliday,
  PolygonBar,
} from "./polygon";
import { buildVolumeProfile, LVN_BIN_SIZE, VolumeProfileResult } from "./volumeProfile";
import { classifyMonthlyTrend, classifyWeeklyTrend, classifyDailyTrend, DowTheoryResult } from "./dowTheory";
import { buildSrLadder } from "./srLadder";
import { classifyVix } from "./vix";
import type { SharedContext } from "./sharedContext";
import { PrepSheetInput, PrepSheetTimeframeLevels, PriceContextInput, TrendTierInput } from "./claude";

function toLevels(vp: VolumeProfileResult) {
  return {
    poc: vp.poc,
    vah: vp.vah,
    val: vp.val,
    lvnZones: vp.lvns.map((z) => ({ low: z.low, high: z.high })),
  };
}

function toTrendTier(trend: DowTheoryResult): TrendTierInput {
  return {
    classification: trend.trend,
    rationale: trend.rationale,
    recentSwingHighs: trend.swingHighs.slice(-5).map((h) => h.price),
    recentSwingLows: trend.swingLows.slice(-5).map((l) => l.price),
  };
}

// Matches the 7-10 DTE holding window.
const RELEVANT_HOLIDAY_WINDOW_MS = 10 * 86_400_000;

function filterRelevantHolidays(holidays: MarketHoliday[]): MarketHoliday[] {
  const now = Date.now();
  return holidays.filter((h) => {
    const t = new Date(h.date).getTime();
    return t >= now - 86_400_000 && t <= now + RELEVANT_HOLIDAY_WINDOW_MS;
  });
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function buildPriceContext(
  oneMin: PolygonBar[],
  todayEt: string,
  prevClose: number | null,
  fallbackPrice: number
): PriceContextInput {
  const lastBar = oneMin[oneMin.length - 1];
  const lastPrice = lastBar ? lastBar.c : fallbackPrice;

  const premarketBars = oneMin.filter((b) => easternDateString(b.t) === todayEt && barPhase(b) === "premarket");
  const premarket =
    premarketBars.length > 0
      ? {
          high: Math.max(...premarketBars.map((b) => b.h)),
          low: Math.min(...premarketBars.map((b) => b.l)),
          volume: premarketBars.reduce((sum, b) => sum + b.v, 0),
        }
      : null;

  const change = prevClose !== null ? lastPrice - prevClose : null;

  return {
    lastPrice,
    lastPriceTime: new Date(lastBar ? lastBar.t : Date.now()).toISOString(),
    lastPricePhase: lastBar ? barPhase(lastBar) : "regular",
    prevClose,
    changeFromPrevClose: change !== null ? round2(change) : null,
    changeFromPrevClosePct: change !== null && prevClose ? round2((change / prevClose) * 100) : null,
    premarket,
  };
}

export async function buildPrepSheetInput(symbol: string, shared: SharedContext): Promise<PrepSheetInput> {
  const [oneMin, thirtyMin, fourHour, weekly, daily, monthly] = await Promise.all([
    get1mBars(symbol),
    get30mBars(symbol),
    get4hBars(symbol),
    getWeeklyBars(symbol),
    getDailyBars(symbol),
    getMonthlyBars(symbol),
  ]);

  // Filter to regular hours BEFORE picking the latest day: pre-market, the
  // latest day has only pre-market bars, which would leave nothing behind.
  const regular1m = filterRegularSession(oneMin);
  const lastSession1m = mostRecentSessionBars(regular1m);
  const regular30m = filterRegularSession(thirtyMin);

  const timeframes: PrepSheetTimeframeLevels[] = [
    { label: "1m", ...toLevels(buildVolumeProfile(lastSession1m, LVN_BIN_SIZE["1m"])) },
    { label: "30m", ...toLevels(buildVolumeProfile(regular30m, LVN_BIN_SIZE["30m"])) },
    { label: "4h", ...toLevels(buildVolumeProfile(fourHour, LVN_BIN_SIZE["4h"])) },
  ];

  const primaryTrend = classifyMonthlyTrend(monthly);
  const secondaryTrend = classifyWeeklyTrend(weekly);
  const minorTrend = classifyDailyTrend(daily);

  // Regular-hours sessions only. "today" exists only once today's 9:30 open
  // has printed; before that (or on a weekend) the latest session is the
  // prior trading day.
  const todayEt = easternDateString(Date.now());
  const sessionDates = getRecentSessionDates(regular1m, 2);
  const latestDate = sessionDates[sessionDates.length - 1];
  const hasTodaySession = latestDate === todayEt;
  const todayDate = hasTodaySession ? latestDate : undefined;
  const prevDayDate = hasTodaySession ? sessionDates[sessionDates.length - 2] : latestDate;

  const sessionLevels: PrepSheetInput["sessionLevels"] = {};
  if (todayDate) {
    const levels = computeSessionLevels(regular1m, todayDate);
    if (levels) sessionLevels.today = levels;
  }
  if (prevDayDate) {
    const levels = computeSessionLevels(regular1m, prevDayDate);
    if (levels) sessionLevels.prevDay = levels;
  }

  // Latest print including extended hours, so a pre-market gap moves the
  // S/R split and game plan instead of anchoring on yesterday's close.
  const dailyClose = daily.length > 0 ? daily[daily.length - 1].c : 0;
  const priceContext = buildPriceContext(oneMin, todayEt, sessionLevels.prevDay?.close ?? null, dailyClose);
  const currentPrice = priceContext.lastPrice;
  const ladder = buildSrLadder(currentPrice, minorTrend.swingHighs, minorTrend.swingLows);

  const recentDailyBars = daily.slice(-40).map((bar) => ({
    date: easternDateString(bar.t),
    o: bar.o,
    h: bar.h,
    l: bar.l,
    c: bar.c,
    v: bar.v,
  }));

  const { vix } = shared;

  return {
    symbol,
    date: todayEt,
    currentPrice,
    priceContext,
    events: shared.events,
    vix: vix ? { price: vix.price, changePercent: vix.changePercent, regime: classifyVix(vix.price) } : null,
    trend: {
      primary: toTrendTier(primaryTrend),
      secondary: toTrendTier(secondaryTrend),
      minor: toTrendTier(minorTrend),
    },
    timeframes,
    srLadder: ladder,
    sessionLevels,
    recentDailyBars,
    upcomingHolidays: filterRelevantHolidays(shared.holidays),
  };
}
