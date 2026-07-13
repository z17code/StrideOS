import { and, eq, gte, lte } from "drizzle-orm";
import { db } from "@/db";
import { activities, dailyCheckins } from "@/db/schema";
import {
  addDays,
  endOfMondayWeek,
  startOfMondayWeek,
  todayInShanghai,
} from "@/lib/datetime";
import { getActivePlan } from "@/lib/plans/service";
import type {
  MonthlyReport,
  TrendReport,
  WeeklyReport,
} from "@/lib/validators/report";
import { generateAiSummary } from "./ai";

export function templateWeeklySummary(r: Omit<WeeklyReport, "summary">): string {
  const parts = [
    `本周完成 ${r.runCount} 次跑步，累计 ${r.totalDistanceKm.toFixed(1)} km`,
  ];
  if (r.totalDurationMin > 0) parts.push(`总时长 ${r.totalDurationMin} 分钟`);
  if (r.completionRate != null)
    parts.push(`完成率 ${Math.round(r.completionRate * 100)}%`);
  if (r.avgRpe != null) parts.push(`平均 RPE ${r.avgRpe.toFixed(1)}`);
  if (r.avgFatigue != null) parts.push(`平均疲劳 ${r.avgFatigue.toFixed(1)}`);
  if (r.avgPain != null && r.avgPain >= 3)
    parts.push(`疼痛偏高（均 ${r.avgPain.toFixed(1)}），注意恢复`);
  if (r.streaks.currentRunStreak > 0)
    parts.push(`当前连续跑步 ${r.streaks.currentRunStreak} 天`);
  return parts.join("；") + "。";
}

export function templateMonthlySummary(
  r: Omit<MonthlyReport, "summary">,
): string {
  return (
    `${r.month} 共跑步 ${r.runCount} 次，累计 ${r.totalDistanceKm.toFixed(1)} km` +
    (r.avgRpe != null ? `，平均 RPE ${r.avgRpe.toFixed(1)}` : "") +
    `，覆盖 ${r.weekCount} 周。`
  );
}

export function templateTrendSummary(r: Omit<TrendReport, "summary">): string {
  const weeks = r.weeklyDistances.length;
  const total = r.weeklyDistances.reduce((s, w) => s + w.distanceKm, 0);
  return (
    `近 ${weeks} 周累计 ${total.toFixed(1)} km` +
    (weeks > 0 ? `，周均 ${(total / weeks).toFixed(1)} km。` : "。")
  );
}

function avg(nums: number[]): number | null {
  if (nums.length === 0) return null;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}
function round1(n: number) {
  return Math.round(n * 10) / 10;
}

async function loadActivities(userId: string, from: string, to: string) {
  return db
    .select()
    .from(activities)
    .where(
      and(
        eq(activities.userId, userId),
        gte(activities.date, from),
        lte(activities.date, to),
      ),
    );
}

async function loadCheckins(userId: string, from: string, to: string) {
  return db
    .select()
    .from(dailyCheckins)
    .where(
      and(
        eq(dailyCheckins.userId, userId),
        gte(dailyCheckins.date, from),
        lte(dailyCheckins.date, to),
      ),
    );
}

export function computeStreaks(activityDates: string[], today: string) {
  const set = new Set(activityDates);
  let longest = 0;
  let streak = 0;
  for (let i = 0; i < 90; i++) {
    const d = addDays(today, -i);
    if (set.has(d)) {
      streak++;
      longest = Math.max(longest, streak);
    } else streak = 0;
  }
  let current = 0;
  let cursor = set.has(today) ? today : addDays(today, -1);
  while (set.has(cursor)) {
    current++;
    cursor = addDays(cursor, -1);
  }
  return { currentRunStreak: current, longestRunStreak: longest };
}

export async function buildWeeklyReport(
  userId: string,
  weekStart?: string,
): Promise<WeeklyReport> {
  const today = todayInShanghai();
  const start = weekStart
    ? startOfMondayWeek(weekStart)
    : startOfMondayWeek(today);
  const end = endOfMondayWeek(start);
  const [acts, checks, plan] = await Promise.all([
    loadActivities(userId, start, end),
    loadCheckins(userId, start, end),
    getActivePlan(userId),
  ]);
  const runningActs = acts.filter(
    (a) => a.workoutType !== "strength" && a.workoutType !== "rest",
  );
  const totalDistanceKm = round1(
    runningActs.reduce((s, a) => s + (a.distanceKm ?? 0), 0),
  );
  const totalDurationMin = runningActs.reduce(
    (s, a) => s + (a.durationMin ?? 0),
    0,
  );
  const runCount = runningActs.length;
  const qualityCount = runningActs.filter((a) =>
    ["threshold", "intervals", "specific", "long"].includes(a.workoutType),
  ).length;
  const rpes = runningActs
    .map((a) => a.actualRpe)
    .filter((v): v is number => v != null);
  const pains = [
    ...runningActs.map((a) => a.painLevel).filter((v): v is number => v != null),
    ...checks.map((c) => c.painLevel),
  ];
  const fatigues = checks.map((c) => c.fatigueLevel);

  let plannedDistanceKm: number | null = null;
  let completionRate: number | null = null;
  if (plan) {
    const planned = plan.workouts.filter(
      (w) =>
        w.scheduledDate >= start &&
        w.scheduledDate <= end &&
        w.workoutType !== "rest" &&
        w.workoutType !== "strength",
    );
    plannedDistanceKm = round1(
      planned.reduce((s, w) => s + (w.distanceKm ?? 0), 0),
    );
    if (planned.length > 0) {
      const completedDates = new Set(runningActs.map((a) => a.date));
      const hit = planned.filter((w) => completedDates.has(w.scheduledDate)).length;
      completionRate = Math.round((hit / planned.length) * 100) / 100;
    }
  }

  const lookbackActs = await loadActivities(userId, addDays(today, -90), today);
  const streaks = computeStreaks(
    lookbackActs.map((a) => a.date),
    today,
  );
  const base: Omit<WeeklyReport, "summary"> = {
    weekStart: start,
    weekEnd: end,
    totalDistanceKm,
    totalDurationMin,
    runCount,
    qualityCount,
    avgRpe: avg(rpes) != null ? round1(avg(rpes)!) : null,
    avgPain: avg(pains) != null ? round1(avg(pains)!) : null,
    avgFatigue: avg(fatigues) != null ? round1(avg(fatigues)!) : null,
    plannedDistanceKm,
    completionRate,
    streaks,
  };
  const ai = await generateAiSummary({
    kind: "weekly",
    period: `${start}~${end}`,
    totalDistanceKm,
    totalDurationMin,
    runCount,
    avgRpe: base.avgRpe,
    avgPain: base.avgPain,
    avgFatigue: base.avgFatigue,
    completionRate,
    plannedDistanceKm: plannedDistanceKm ?? undefined,
  });
  return { ...base, summary: ai ?? templateWeeklySummary(base) };
}

export async function buildMonthlyReport(
  userId: string,
  month?: string,
): Promise<MonthlyReport> {
  const today = todayInShanghai();
  const ym = month ?? today.slice(0, 7);
  const [y, m] = ym.split("-").map(Number);
  const monthStart = `${ym}-01`;
  const nextMonth =
    m === 12 ? `${y + 1}-01-01` : `${y}-${String(m + 1).padStart(2, "0")}-01`;
  const monthEnd = addDays(nextMonth, -1);
  const weekStarts: string[] = [];
  let cursor = startOfMondayWeek(monthStart);
  const lastWeek = startOfMondayWeek(monthEnd);
  while (cursor <= lastWeek) {
    weekStarts.push(cursor);
    cursor = addDays(cursor, 7);
  }
  const weeklyReports: WeeklyReport[] = [];
  for (const ws of weekStarts) weeklyReports.push(await buildWeeklyReport(userId, ws));

  const totalDistanceKm = round1(
    weeklyReports.reduce((s, w) => s + w.totalDistanceKm, 0),
  );
  const totalDurationMin = weeklyReports.reduce((s, w) => s + w.totalDurationMin, 0);
  const runCount = weeklyReports.reduce((s, w) => s + w.runCount, 0);
  const rpes = weeklyReports.map((w) => w.avgRpe).filter((v): v is number => v != null);
  const pains = weeklyReports.map((w) => w.avgPain).filter((v): v is number => v != null);
  const base: Omit<MonthlyReport, "summary"> = {
    month: ym,
    totalDistanceKm,
    totalDurationMin,
    runCount,
    avgRpe: avg(rpes) != null ? round1(avg(rpes)!) : null,
    avgPain: avg(pains) != null ? round1(avg(pains)!) : null,
    weekCount: weeklyReports.length,
    weeklyReports,
  };
  const ai = await generateAiSummary({
    kind: "monthly",
    period: ym,
    totalDistanceKm,
    totalDurationMin,
    runCount,
    avgRpe: base.avgRpe,
    avgPain: base.avgPain,
  });
  return { ...base, summary: ai ?? templateMonthlySummary(base) };
}

export async function buildTrendReport(
  userId: string,
  weeks = 8,
): Promise<TrendReport> {
  const today = todayInShanghai();
  const thisWeek = startOfMondayWeek(today);
  const weekStarts: string[] = [];
  for (let i = weeks - 1; i >= 0; i--) weekStarts.push(addDays(thisWeek, -7 * i));
  const from = weekStarts[0]!;
  const to = endOfMondayWeek(weekStarts[weekStarts.length - 1]!);
  const [acts, checks] = await Promise.all([
    loadActivities(userId, from, to),
    loadCheckins(userId, from, to),
  ]);
  const weeklyDistances = weekStarts.map((ws) => {
    const we = endOfMondayWeek(ws);
    const km = acts
      .filter(
        (a) =>
          a.date >= ws &&
          a.date <= we &&
          a.workoutType !== "strength" &&
          a.workoutType !== "rest",
      )
      .reduce((s, a) => s + (a.distanceKm ?? 0), 0);
    return { weekStart: ws, distanceKm: round1(km) };
  });
  const weeklyDurations = weekStarts.map((ws) => {
    const we = endOfMondayWeek(ws);
    const min = acts
      .filter((a) => a.date >= ws && a.date <= we)
      .reduce((s, a) => s + (a.durationMin ?? 0), 0);
    return { weekStart: ws, durationMin: min };
  });
  const weeklyRpe = weekStarts.map((ws) => {
    const we = endOfMondayWeek(ws);
    const rpes = acts
      .filter((a) => a.date >= ws && a.date <= we && a.actualRpe != null)
      .map((a) => a.actualRpe!);
    const a = avg(rpes);
    return { weekStart: ws, avgRpe: a != null ? round1(a) : null };
  });
  const fatigueTrend = checks
    .slice()
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((c) => ({ date: c.date, fatigueLevel: c.fatigueLevel }));
  const painTrend = checks
    .slice()
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((c) => ({ date: c.date, painLevel: c.painLevel }));
  const base: Omit<TrendReport, "summary"> = {
    weeklyDistances,
    weeklyDurations,
    weeklyRpe,
    fatigueTrend,
    painTrend,
  };
  const totalDistanceKm = weeklyDistances.reduce((s, w) => s + w.distanceKm, 0);
  const totalDurationMin = weeklyDurations.reduce((s, w) => s + w.durationMin, 0);
  const runCount = acts.filter(
    (a) => a.workoutType !== "strength" && a.workoutType !== "rest",
  ).length;
  const rpes = acts.map((a) => a.actualRpe).filter((v): v is number => v != null);
  const ai = await generateAiSummary({
    kind: "trends",
    period: `${from}~${to}`,
    totalDistanceKm: round1(totalDistanceKm),
    totalDurationMin,
    runCount,
    avgRpe: avg(rpes) != null ? round1(avg(rpes)!) : null,
    avgPain: null,
  });
  return { ...base, summary: ai ?? templateTrendSummary(base) };
}
