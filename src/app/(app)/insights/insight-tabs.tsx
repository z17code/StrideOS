"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

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
    <div className="flex items-end gap-1 h-24">
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
    <div className="relative h-24">
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
    <div className="space-y-3">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">
            {data.weekStart} ~ {data.weekEnd}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-0">
          <StatRow label="距离" value={data.totalDistanceKm} unit=" km" />
          <StatRow label="时长" value={data.totalDurationMin} unit=" min" />
          <StatRow label="跑步次数" value={data.runCount} />
          <StatRow label="素质课" value={data.qualityCount} />
          <StatRow label="平均 RPE" value={data.avgRpe} />
          <StatRow label="平均疲劳" value={data.avgFatigue} />
          <StatRow label="平均疼痛" value={data.avgPain} />
          <StatRow label="计划距离" value={data.plannedDistanceKm} unit=" km" />
          <CompletionBar rate={data.completionRate} />
          <div className="flex items-center justify-between py-1">
            <span className="text-sm text-muted-foreground">连续跑步</span>
            <span className="text-sm font-medium tabular-nums">
              {data.streaks.currentRunStreak} 天 / 最长{" "}
              {data.streaks.longestRunStreak} 天
            </span>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">AI 周评</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm leading-relaxed">{data.summary}</p>
        </CardContent>
      </Card>
    </div>
  );
}

function MonthlyView({ data }: { data: MonthlyReport }) {
  const weekDistances = data.weeklyReports.map((w) => ({
    label: w.weekStart.slice(5),
    value: w.totalDistanceKm,
  }));

  return (
    <div className="space-y-3">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">{data.month}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-0">
          <StatRow label="距离" value={data.totalDistanceKm} unit=" km" />
          <StatRow label="时长" value={data.totalDurationMin} unit=" min" />
          <StatRow label="跑步次数" value={data.runCount} />
          <StatRow label="平均 RPE" value={data.avgRpe} />
          <StatRow label="平均疼痛" value={data.avgPain} />
          <StatRow label="覆盖周数" value={data.weekCount} />
        </CardContent>
      </Card>
      {weekDistances.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">各周距离</CardTitle>
          </CardHeader>
          <CardContent>
            <MiniBarChart
              data={weekDistances}
              labelFn={(s) => s}
            />
          </CardContent>
        </Card>
      )}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">AI 月评</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm leading-relaxed">{data.summary}</p>
        </CardContent>
      </Card>
    </div>
  );
}

function TrendsView({ data }: { data: TrendReport }) {
  const maxDist = Math.max(
    ...data.weeklyDistances.map((d) => d.distanceKm),
    0.1,
  );
  const barData = data.weeklyDistances.map((d) => ({
    label: d.weekStart.slice(5),
    value: d.distanceKm,
  }));

  return (
    <div className="space-y-3">
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

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">AI 趋势分析</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm leading-relaxed">{data.summary}</p>
        </CardContent>
      </Card>
    </div>
  );
}

/* ── main client component ────────────────────────────── */

export function InsightTabs({ userId }: { userId: string }) {
  const [tab, setTab] = useState<Tab>("weekly");
  const [weekly, setWeekly] = useState<WeeklyReport | null>(null);
  const [monthly, setMonthly] = useState<MonthlyReport | null>(null);
  const [trends, setTrends] = useState<TrendReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const initialized = useRef(false);

  async function loadCurrentTab() {
    setLoading(true);
    setError(null);
    try {
      if (tab === "weekly") {
        const res = await fetch("/api/v1/reports/weekly");
        if (!res.ok) throw new Error("周报加载失败");
        const d = await res.json();
        setWeekly(d.report);
      } else if (tab === "monthly") {
        const res = await fetch("/api/v1/reports/monthly");
        if (!res.ok) throw new Error("月报加载失败");
        const d = await res.json();
        setMonthly(d.report);
      } else {
        const res = await fetch("/api/v1/reports/trends");
        if (!res.ok) throw new Error("趋势加载失败");
        const d = await res.json();
        setTrends(d.report);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "加载失败");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!initialized.current) {
      initialized.current = true;
      loadCurrentTab();
    }
  }, [tab]);

  const data =
    tab === "weekly" ? weekly : tab === "monthly" ? monthly : trends;

  return (
    <div className="space-y-4">
      <div className="flex gap-1 rounded-md border border-border p-1 w-fit">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={cn(
              "px-4 py-1.5 rounded-md text-sm font-medium transition-colors",
              tab === t.key
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}

      {loading && !data && (
        <Card>
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            加载中…
          </CardContent>
        </Card>
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
