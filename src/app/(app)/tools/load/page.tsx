"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { todayInShanghai } from "@/lib/datetime";
import {
  buildLoadOverview,
  type LoadOverview,
} from "@/lib/tools/load";
import { cn } from "@/lib/utils";

export default function LoadPage() {
  const [overview, setOverview] = useState<LoadOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const today = todayInShanghai();
      const [planRes, actRes] = await Promise.all([
        fetch("/api/v1/plans/current"),
        fetch("/api/v1/activities?limit=100"),
      ]);

      let planned: Array<{
        scheduledDate: string;
        distanceKm: number | null;
        isQuality?: boolean | null;
      }> = [];

      if (planRes.ok) {
        const data = await planRes.json();
        planned = data?.plan?.workouts ?? [];
      } else if (planRes.status !== 404) {
        const body = await planRes.json().catch(() => null);
        throw new Error(body?.error?.message ?? "加载计划失败");
      }

      if (!actRes.ok) {
        const body = await actRes.json().catch(() => null);
        throw new Error(body?.error?.message ?? "加载训练记录失败");
      }
      const actData = await actRes.json();
      const activities = actData?.activities ?? [];

      setOverview(
        buildLoadOverview({
          today,
          weekCount: 4,
          planned,
          activities,
        }),
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "加载失败");
      setOverview(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const thisWeek = overview?.thisWeek ?? null;

  return (
    <div className="page-shell max-w-lg">
      <div className="flex items-start justify-between gap-3">
        <div>
          <Link href="/tools" className="text-xs text-muted-foreground hover:text-foreground">
            ← 工具
          </Link>
          <h1 className="page-title mt-1">周负荷一览</h1>
          <p className="page-subtitle">近 4 周计划跑量 vs 实际完成</p>
        </div>
        <Button type="button" size="sm" variant="outline" className="touch-manipulation" onClick={() => void load()}>
          刷新
        </Button>
      </div>

      {error && (
        <p className="rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}

      {loading ? (
        <p className="text-sm text-muted-foreground">加载中…</p>
      ) : overview ? (
        <>
          {thisWeek && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">本周</CardTitle>
                <CardDescription>
                  {thisWeek.weekStart} ~ {thisWeek.weekEnd}
                </CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-4 text-center">
                <div>
                  <div className="text-xs text-muted-foreground">计划</div>
                  <div className="mt-1 text-2xl font-semibold tabular-nums">{thisWeek.plannedKm}</div>
                  <div className="text-[10px] text-muted-foreground">km · {thisWeek.plannedSessions} 次</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">实际</div>
                  <div className="mt-1 text-2xl font-semibold tabular-nums">{thisWeek.actualKm}</div>
                  <div className="text-[10px] text-muted-foreground">km · {thisWeek.actualSessions} 次</div>
                </div>
                <div className="col-span-2">
                  <div className="text-xs text-muted-foreground">完成度</div>
                  <div className="mt-1 text-lg font-medium tabular-nums">
                    {thisWeek.completionRatio == null
                      ? "无计划跑量"
                      : `${Math.round(thisWeek.completionRatio * 100)}%`}
                  </div>
                  {thisWeek.plannedKm > 0 && (
                    <div className="mx-auto mt-2 h-2 max-w-xs overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-foreground/80"
                        style={{
                          width: `${Math.min(100, Math.round((thisWeek.completionRatio ?? 0) * 100))}%`,
                        }}
                      />
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">近 4 周</CardTitle>
              <CardDescription>
                合计实际 {overview.totalActualKm} km / 计划 {overview.totalPlannedKm} km
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {overview.weeks.map((w) => {
                const ratio = w.completionRatio;
                return (
                  <div key={w.weekStart} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">
                        {w.weekStart.slice(5)} ~ {w.weekEnd.slice(5)}
                      </span>
                      <span className="tabular-nums">
                        {w.actualKm}/{w.plannedKm} km
                        {ratio != null && (
                          <span
                            className={cn(
                              "ml-2",
                              ratio >= 0.9
                                ? "text-emerald-600 dark:text-emerald-400"
                                : ratio < 0.6
                                  ? "text-orange-500"
                                  : "",
                            )}
                          >
                            {Math.round(ratio * 100)}%
                          </span>
                        )}
                      </span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-foreground/70"
                        style={{
                          width: `${Math.min(
                            100,
                            w.plannedKm > 0
                              ? Math.round(((w.actualKm / w.plannedKm) * 100) || 0)
                              : w.actualKm > 0
                                ? 100
                                : 0,
                          )}%`,
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>

          <p className="text-xs text-muted-foreground">
            根据你的计划与训练记录汇总。若暂无活跃计划，仅显示实际跑量。
          </p>
        </>
      ) : null}
    </div>
  );
}
