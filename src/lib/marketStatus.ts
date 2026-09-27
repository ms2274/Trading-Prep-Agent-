export type MarketStatus = "open" | "premarket" | "afterhours" | "closed";

const ET_PARTS = new Intl.DateTimeFormat("en-US", {
  timeZone: "America/New_York",
  weekday: "short",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

export function getMarketStatus(
  now: Date,
  todayEt: string,
  holidays: { date: string; status: string }[]
): MarketStatus {
  const parts = ET_PARTS.formatToParts(now);
  const weekday = parts.find((p) => p.type === "weekday")?.value;
  const hour = Number(parts.find((p) => p.type === "hour")?.value ?? 0) % 24;
  const minute = Number(parts.find((p) => p.type === "minute")?.value ?? 0);
  const mins = hour * 60 + minute;

  if (weekday === "Sat" || weekday === "Sun") return "closed";
  if (holidays.some((h) => h.date === todayEt && h.status === "closed")) return "closed";

  const closeMins = holidays.some((h) => h.date === todayEt && h.status === "early-close") ? 13 * 60 : 16 * 60;
  if (mins >= 9 * 60 + 30 && mins < closeMins) return "open";
  if (mins >= 4 * 60 && mins < 9 * 60 + 30) return "premarket";
  if (mins >= closeMins && mins < 20 * 60) return "afterhours";
  return "closed";
}
