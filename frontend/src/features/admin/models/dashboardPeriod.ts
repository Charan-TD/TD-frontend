export type PeriodId = "today" | "yesterday" | "7d" | "30d" | "month" | "custom";

export type Period = { id: PeriodId; from: Date; to: Date };

export const PERIOD_OPTIONS: { id: Exclude<PeriodId, "custom">; label: string }[] = [
  { id: "today", label: "Today" },
  { id: "yesterday", label: "Yesterday" },
  { id: "7d", label: "Last 7 days" },
  { id: "30d", label: "Last 30 days" },
  { id: "month", label: "This month" },
];

export const startOfDay = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());
export const addDays = (date: Date, days: number) => new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
export const sameDay = (a: Date, b: Date) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

export function resolvePeriod(id: Exclude<PeriodId, "custom">, now = new Date()): Period {
  const today = startOfDay(now);
  switch (id) {
    case "today": return { id, from: today, to: today };
    case "yesterday": return { id, from: addDays(today, -1), to: addDays(today, -1) };
    case "7d": return { id, from: addDays(today, -6), to: today };
    case "30d": return { id, from: addDays(today, -29), to: today };
    case "month": return { id, from: new Date(today.getFullYear(), today.getMonth(), 1), to: today };
  }
}

const dm = (d: Date) => d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
const dmy = (d: Date) => d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

/** "28 Oct 2026 – 3 Nov 2026", or a single date for a one-day period. */
export const periodRangeLabel = (period: Period) =>
  sameDay(period.from, period.to) ? dmy(period.from) : `${dmy(period.from)} – ${dmy(period.to)}`;

/** Short hint shown beside a menu option. */
export function periodHint(period: Period) {
  if (sameDay(period.from, period.to)) return dm(period.from);
  if (period.id === "month") return period.from.toLocaleDateString("en-IN", { month: "short", year: "numeric" });
  return `${dm(period.from)} – ${dm(period.to)}`;
}

export const periodShortRange = (period: Period) =>
  sameDay(period.from, period.to) ? dm(period.from) : `${dm(period.from)} – ${dm(period.to)}`;

export const inPeriod = (date: Date, period: Period) => {
  const day = startOfDay(date).getTime();
  return day >= period.from.getTime() && day <= period.to.getTime();
};

const ordinal = (n: number) => {
  const v = n % 100;
  if (v >= 11 && v <= 13) return `${n}th`;
  return `${n}${["th", "st", "nd", "rd"][n % 10 > 3 ? 0 : n % 10] ?? "th"}`;
};

/** "Oct 30th, 2026" */
export const ordinalDate = (date: Date) =>
  `${date.toLocaleDateString("en-IN", { month: "short" })} ${ordinal(date.getDate())}, ${date.getFullYear()}`;
