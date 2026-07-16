/**
 * Weekly training load overview (pure aggregation, client-safe).
 * Feed planned workouts + activities; no DB writes.
 */

import { addDays, startOfMondayWeek, type DateOnly } from "@/lib/datetime";

export interface LoadWorkoutLike {
  scheduledDate: string;
  distanceKm: number | null;
  isQuality?: boolean | null;
  workoutType?: string | null;
}

export interface LoadActivityLike {
  date: string;
  distanceKm: number | null;
  durationMin?: number | null;
  actualRpe?: number | null;
}

export interface WeekBucket {
  weekStart: DateOnly;
  weekEnd: DateOnly;
  plannedKm: number;
  actualKm: number;
  plannedSessions: number;
  actualSessions: number;
  qualityPlanned: number;
  /** actual / planned, null if no plan */
  completionRatio: number | null;
}

export interface LoadOverview {
  weeks: WeekBucket[];
  thisWeek: WeekBucket | null;
  totalActualKm: number;
  totalPlannedKm: number;
}

function round1(n: number) {
  return Math.round(n * 10) / 10;
}

export function buildLoadOverview(opts: {
  today: DateOnly;
  /** How many weeks back including current (default 4) */
  weekCount?: number;
  planned: LoadWorkoutLike[];
  activities: LoadActivityLike[];
}): LoadOverview {
  const weekCount = opts.weekCount ?? 4;
  const thisMonday = startOfMondayWeek(opts.today);
  const weeks: WeekBucket[] = [];

  for (let i = weekCount - 1; i >= 0; i--) {
    const weekStart = addDays(thisMonday, -7 * i);
    const weekEnd = addDays(weekStart, 6);
    weeks.push({
      weekStart,
      weekEnd,
      plannedKm: 0,
      actualKm: 0,
      plannedSessions: 0,
      actualSessions: 0,
      qualityPlanned: 0,
      completionRatio: null,
    });
  }

  const indexByStart = new Map(weeks.map((w) => [w.weekStart, w]));

  for (const w of opts.planned) {
    if (!w.scheduledDate) continue;
    const ws = startOfMondayWeek(w.scheduledDate);
    const bucket = indexByStart.get(ws);
    if (!bucket) continue;
    bucket.plannedSessions += 1;
    bucket.plannedKm += w.distanceKm ?? 0;
    if (w.isQuality) bucket.qualityPlanned += 1;
  }

  for (const a of opts.activities) {
    if (!a.date) continue;
    const ws = startOfMondayWeek(a.date);
    const bucket = indexByStart.get(ws);
    if (!bucket) continue;
    bucket.actualSessions += 1;
    bucket.actualKm += a.distanceKm ?? 0;
  }

  for (const b of weeks) {
    b.plannedKm = round1(b.plannedKm);
    b.actualKm = round1(b.actualKm);
    b.completionRatio =
      b.plannedKm > 0 ? Math.round((b.actualKm / b.plannedKm) * 100) / 100 : null;
  }

  return {
    weeks,
    thisWeek: weeks[weeks.length - 1] ?? null,
    totalActualKm: round1(weeks.reduce((s, w) => s + w.actualKm, 0)),
    totalPlannedKm: round1(weeks.reduce((s, w) => s + w.plannedKm, 0)),
  };
}
