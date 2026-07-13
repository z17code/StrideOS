/** Pure date-only helpers. Calendar values are `YYYY-MM-DD` in Asia/Shanghai. */

const TZ = "Asia/Shanghai";
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export type DateOnly = string;

export function todayInShanghai(now: Date = new Date()): DateOnly {
  return formatDateInShanghai(now);
}

export function formatDateInShanghai(date: Date): DateOnly {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export function nowInShanghaiLabel(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("zh-CN", {
    timeZone: TZ,
    dateStyle: "medium",
    timeStyle: "short",
  }).format(now);
}

export function isValidDateOnly(value: string): boolean {
  if (!DATE_RE.test(value)) return false;
  const [y, m, d] = value.split("-").map(Number);
  if (m < 1 || m > 12 || d < 1 || d > 31) return false;
  const dt = new Date(Date.UTC(y, m - 1, d));
  return (
    dt.getUTCFullYear() === y &&
    dt.getUTCMonth() === m - 1 &&
    dt.getUTCDate() === d
  );
}

/** Epoch day from a validated YYYY-MM-DD (timezone-independent). */
export function toEpochDay(date: DateOnly): number {
  if (!isValidDateOnly(date)) {
    throw new Error(`Invalid date: ${date}`);
  }
  const [y, m, d] = date.split("-").map(Number);
  return Math.floor(Date.UTC(y, m - 1, d) / 86_400_000);
}

export function fromEpochDay(day: number): DateOnly {
  const dt = new Date(day * 86_400_000);
  const y = dt.getUTCFullYear();
  const m = String(dt.getUTCMonth() + 1).padStart(2, "0");
  const d = String(dt.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function addDays(date: DateOnly, days: number): DateOnly {
  return fromEpochDay(toEpochDay(date) + days);
}

export function daysBetween(from: DateOnly, to: DateOnly): number {
  return toEpochDay(to) - toEpochDay(from);
}

/** JS/PG weekday: 0=Sunday … 6=Saturday */
export function dayOfWeek(date: DateOnly): number {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

/** Monday of the week containing `date` (ISO-style Monday-first week). */
export function startOfMondayWeek(date: DateOnly): DateOnly {
  const dow = dayOfWeek(date); // 0=Sun
  const offset = dow === 0 ? -6 : 1 - dow;
  return addDays(date, offset);
}

export function endOfMondayWeek(date: DateOnly): DateOnly {
  return addDays(startOfMondayWeek(date), 6);
}

export function enumerateDays(from: DateOnly, to: DateOnly): DateOnly[] {
  const start = toEpochDay(from);
  const end = toEpochDay(to);
  if (end < start) return [];
  const out: DateOnly[] = [];
  for (let d = start; d <= end; d++) out.push(fromEpochDay(d));
  return out;
}

const WEEKDAY_ZH = ["日", "一", "二", "三", "四", "五", "六"] as const;

export function weekdayLabelZh(date: DateOnly): string {
  return `周${WEEKDAY_ZH[dayOfWeek(date)]}`;
}

export function formatMonthDayZh(date: DateOnly): string {
  const [, m, d] = date.split("-").map(Number);
  return `${m}月${d}日`;
}

export function formatDurationSec(totalSec: number): string {
  const sec = Math.max(0, Math.round(totalSec));
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  if (h > 0) {
    return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }
  return `${m}:${String(s).padStart(2, "0")}`;
}

/** min/km as decimal minutes → `m:ss` */
export function formatPaceMinPerKm(minPerKm: number): string {
  if (!Number.isFinite(minPerKm) || minPerKm <= 0) return "—";
  const totalSec = Math.round(minPerKm * 60);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}
