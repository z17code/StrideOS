"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface WeeklyReport {
  weekStart: string;
  weekEnd: string;
  totalDistanceKm: number;
  totalDurationMin: number;
  runCount: number;
  qualityCount: number;
  avgRpe: number | null;
  avgPain: number | null;
  avgFatigue: number | null;
  plannedDistanceKm: number | null;
  completionRate: number | null;
  streaks: { currentRunStreak: number; longestRunStreak: number };
  summary: string;
}

interface MonthlyReport {
  month: string;
  totalDistanceKm: number;
  totalDurationMin: number;
  runCount: number;
  avgRpe: number | null;
  avgPain: number | null;
  weekCount: number;
  weeklyReports: WeeklyReport[];
  summary: string;
}

interface TrendReport {
  weeklyDistances: { weekStart: string; distanceKm: number }[];
  weeklyDurations: { weekStart: string; durationMin: number }[];
  weeklyRpe: { weekStart: string; avgRpe: number | null }[];
  fatigueTrend: { date: string; fatigueLevel: number }[];
  painTrend: { date: string; painLevel: number }[];
  summary: string;
}

type Tab = "weekly" | "monthly" | "trends";

const TABS: { key: Tab; label: string }[] = [
  { key: "weekly", label: "周报" },
  { key: "monthly", label: "月报" },
  { key: "trends", label: "趋势" },
];

function cn(...classes: (string | false | null | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}

function StatRow({
  label,
  value,
  unit,
}: {
  label: string;
  value: string | number | null;
  unit?: string;
}) {
  return (
    <div className="flex items-center justify-between py-1">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-medium tabular-nums">
        {value != null ? `${value}${unit ?? ""}` : "—"}
      </span>
    </div>
  );
}

function CompletionBar({ rate }: { rate: number | null }) {
  if (rate == null) return null;
  const pct = Math.round(rate * 100);
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-muted-foreground">完成率</span>
        <span className="tabular-nums">{pct}%</span>
      </div>
      <div className="h-2 rounded-full bg-muted overflow-hidden">
        <div
          className="h-full rounded-full bg-primary transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function MiniBarChart({
  data,
  labelFn,
}: {
  data: { label: string; value: number }[];
  labelFn: (s: string) => string;
}) {
  const max = Math.max(...data.map((d) => d.value), 0.1);
  return (
    <div className="flex h-24 items-end gap-1.5 lg:h-32">
      {data.map((d, i) => {
        const h = max > 0 ? (d.value / max) * 100 : 0;
        return (
          <div
            key={i}
            className="flex-1 flex flex-col items-center gap-1"
          >
            <div
              className="w-full rounded-t bg-primary/80 relative"
              style={{ height: `${Math.max(h, 2)}%` }}
            >
              <span className="absolute -top-4 left-1/2 -translate-x-1/2 text-[10px] tabular-nums text-muted-foreground whitespace-nowrap">
                {d.value > 0 ? d.value.toFixed(1) : ""}
              </span>
            </div>
            <span className="text-[10px] text-muted-foreground truncate w-full text-center">
              {labelFn(d.label)}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function TrendDotChart({
  data,
  color,
}: {
  data: { label: string; value: number | null }[];
  color: string;
}) {
  const valid = data.filter((d) => d.value != null);
  if (valid.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">暂无数据</p>
    );
  }
  const values = valid.map((d) => d.value!);
  const maxVal = Math.max(...values);
  const minVal = Math.min(...values);
  const range = maxVal - minVal || 1;

  const points = valid
    .map((d, i) => {
      const x = (i / Math.max(valid.length - 1, 1)) * 100;
      const y = 100 - ((d.value! - minVal) / range) * 100;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <div className="relative h-24 lg:h-32">
      <div className="absolute inset-0 flex flex-col justify-between text-[10px] text-muted-foreground pointer-events-none">
        <span>{maxVal}</span>
        <span>{Math.round((maxVal + minVal) / 2)}</span>
        <span>{minVal}</span>
      </div>
      <svg className="absolute inset-0 w-full h-full ml-8" viewBox="0 0 100 100" preserveAspectRatio="none">
        <polyline
          fill="none"
          stroke={color}
          strokeWidth="2"
          vectorEffect="non-scaling-stroke"
          points={points}
        />
      </svg>
    </div>
  );
}

function WeeklyView({ data }: { data: WeeklyReport }) {
  return (
    <div className="desk-cockpit">
      <div className="desk-main space-y-4">
        <Card className="overflow-hidden">
          <CardHeader className="border-b border-border/60 bg-muted/20 pb-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <CardTitle className="text-sm">
                {data.weekStart} ~ {data.weekEnd}
              </CardTitle>
              <span className="metric-chip-strong">本周概览</span>
            </div>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-2xl border border-border/70 bg-muted/20 px-3.5 py-3">
                <p className="text-[11px] text-muted-foreground">距离</p>
                <p className="mt-1 text-lg font-semibold tabular-nums tracking-tight">
                  {data.totalDistanceKm}
                  <span className="ml-1 text-xs font-medium text-muted-foreground">km</span>
                </p>
              </div>
              <div className="rounded-2xl border border-border/70 bg-muted/20 px-3.5 py-3">
                <p className="text-[11px] text-muted-foreground">时长</p>
                <p className="mt-1 text-lg font-semibold tabular-nums tracking-tight">
                  {data.totalDurationMin}
                  <span className="ml-1 text-xs font-medium text-muted-foreground">min</span>
                </p>
              </div>
              <div className="rounded-2xl border border-border/70 bg-muted/20 px-3.5 py-3">
                <p className="text-[11px] text-muted-foreground">跑步</p>
                <p className="mt-1 text-lg font-semibold tabular-nums tracking-tight">
                  {data.runCount}
                  <span className="ml-1 text-xs font-medium text-muted-foreground">次</span>
                </p>
              </div>
              <div className="rounded-2xl border border-border/70 bg-muted/20 px-3.5 py-3">
                <p className="text-[11px] text-muted-foreground">素质课</p>
                <p className="mt-1 text-lg font-semibold tabular-nums tracking-tight">
                  {data.qualityCount}
                  <span className="ml-1 text-xs font-medium text-muted-foreground">次</span>
                </p>
              </div>
            </div>
            <div className="mt-4 space-y-0 border-t border-border/60 pt-3">
              <StatRow label="平均 RPE" value={data.avgRpe} />
              <StatRow label="平均疲劳" value={data.avgFatigue} />
              <StatRow label="平均疼痛" value={data.avgPain} />
              <StatRow label="计划距离" value={data.plannedDistanceKm} unit=" km" />
              <div className="py-2">
                <CompletionBar rate={data.completionRate} />
              </div>
              <div className="flex items-center justify-between py-1">
                <span className="text-sm text-muted-foreground">连续跑步</span>
                <span className="text-sm font-medium tabular-nums">
                  {data.streaks.currentRunStreak} 天 / 最长{" "}
                  {data.streaks.longestRunStreak} 天
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      <div className="desk-rail desk-rail-sticky">
        <Card className="overflow-hidden">
          <CardHeader className="border-b border-border/60 bg-muted/20 pb-4">
            <div className="flex items-center justify-between gap-2">
              <CardTitle className="text-sm">周评</CardTitle>
              <span className="metric-chip">智能摘要</span>
            </div>
          </CardHeader>
          <CardContent className="pt-4">
            <p className="text-sm leading-relaxed text-foreground/90">{data.summary}</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function MonthlyView({ data }: { data: MonthlyReport }) {
  const weekDistances = data.weeklyReports.map((w) => ({
    label: w.weekStart.slice(5),
    value: w.totalDistanceKm,
  }));

  return (
    <div className="desk-cockpit">
      <div className="desk-main space-y-4">
        <Card className="overflow-hidden">
          <CardHeader className="border-b border-border/60 bg-muted/20 pb-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <CardTitle className="text-sm">{data.month}</CardTitle>
              <span className="metric-chip-strong">本月概览</span>
            </div>
          </CardHeader>
          <CardContent className="space-y-0 pt-4">
            <StatRow label="距离" value={data.totalDistanceKm} unit=" km" />
            <StatRow label="时长" value={data.totalDurationMin} unit=" min" />
            <StatRow label="跑步次数" value={data.runCount} />
            <StatRow label="平均 RPE" value={data.avgRpe} />
            <StatRow label="平均疼痛" value={data.avgPain} />
            <StatRow label="覆盖周数" value={data.weekCount} />
          </CardContent>
        </Card>
        {weekDistances.length > 0 && (
          <Card className="overflow-hidden">
            <CardHeader className="border-b border-border/60 bg-muted/20 pb-3">
              <CardTitle className="text-sm">各周距离</CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <MiniBarChart data={weekDistances} labelFn={(s) => s} />
            </CardContent>
          </Card>
        )}
      </div>
      <div className="desk-rail desk-rail-sticky">
        <Card className="overflow-hidden">
          <CardHeader className="border-b border-border/60 bg-muted/20 pb-4">
            <div className="flex items-center justify-between gap-2">
              <CardTitle className="text-sm">月评</CardTitle>
              <span className="metric-chip">智能摘要</span>
            </div>
          </CardHeader>
          <CardContent className="pt-4">
            <p className="text-sm leading-relaxed text-foreground/90">{data.summary}</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function TrendsView({ data }: { data: TrendReport }) {
  const barData = data.weeklyDistances.map((d) => ({
    label: d.weekStart.slice(5),
    value: d.distanceKm,
  }));

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">每周距离</CardTitle>
        </CardHeader>
        <CardContent>
          <MiniBarChart data={barData} labelFn={(s) => s} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">疲劳趋势</CardTitle>
        </CardHeader>
        <CardContent>
          <TrendDotChart
            data={data.fatigueTrend.map((t) => ({ label: t.date, value: t.fatigueLevel }))}
            color="rgb(59, 130, 246)"
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">疼痛趋势</CardTitle>
        </CardHeader>
        <CardContent>
          <TrendDotChart
            data={data.painTrend.map((t) => ({ label: t.date, value: t.painLevel }))}
            color="rgb(239, 68, 68)"
          />
        </CardContent>
      </Card>

      <Card className="lg:col-span-2 overflow-hidden">
        <CardHeader className="border-b border-border/60 bg-muted/20 pb-3">
          <div className="flex items-center justify-between gap-2">
            <CardTitle className="text-sm">趋势分析</CardTitle>
            <span className="metric-chip">智能摘要</span>
          </div>
        </CardHeader>
        <CardContent className="pt-4">
          <p className="text-sm leading-relaxed text-foreground/90">{data.summary}</p>
        </CardContent>
      </Card>
    </div>
  );
}

/* ── main client component ────────────────────────────── */

export function InsightTabs({ userId: _userId }: { userId: string }) {
  const [tab, setTab] = useState<Tab>("weekly");
  const [weekly, setWeekly] = useState<WeeklyReport | null>(null);
  const [monthly, setMonthly] = useState<MonthlyReport | null>(null);
  const [trends, setTrends] = useState<TrendReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadCurrentTab() {
      setLoading(true);
      setError(null);
      try {
        if (tab === "weekly") {
          const res = await fetch("/api/v1/reports/weekly");
          if (!res.ok) throw new Error("周报加载失败");
          const d = await res.json();
          if (!cancelled) setWeekly(d.report);
        } else if (tab === "monthly") {
          const res = await fetch("/api/v1/reports/monthly");
          if (!res.ok) throw new Error("月报加载失败");
          const d = await res.json();
          if (!cancelled) setMonthly(d.report);
        } else {
          const res = await fetch("/api/v1/reports/trends");
          if (!res.ok) throw new Error("趋势加载失败");
          const d = await res.json();
          if (!cancelled) setTrends(d.report);
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "加载失败");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadCurrentTab();
    return () => {
      cancelled = true;
    };
  }, [tab]);


  const data =
    tab === "weekly" ? weekly : tab === "monthly" ? monthly : trends;

  return (
    <div className="space-y-5">
      <div className="desk-toolbar justify-start">
        <div className="inline-flex gap-1 rounded-full border border-border/80 bg-card/90 p-1 shadow-sm">
          {TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={cn(
                "pressable rounded-full px-4 py-1.5 text-sm font-medium transition-colors",
                tab === t.key
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:bg-muted/70 hover:text-foreground",
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}

      {loading && !data && (
        <div className="desk-cockpit">
          <div className="desk-main">
            <div className="skeleton h-64 w-full rounded-2xl" />
          </div>
          <div className="desk-rail">
            <div className="skeleton h-40 w-full rounded-2xl" />
          </div>
        </div>
      )}

      {!loading && !error && data && (
        <>
          {tab === "weekly" && <WeeklyView data={data as WeeklyReport} />}
          {tab === "monthly" && <MonthlyView data={data as MonthlyReport} />}
          {tab === "trends" && <TrendsView data={data as TrendReport} />}
        </>
      )}
    </div>
  );
}
