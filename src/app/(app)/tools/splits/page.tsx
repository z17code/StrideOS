"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  DurationFields,
  parseHmsToSec,
} from "@/components/ui/duration-fields";
import { formatDurationSec, formatPaceMinPerKm } from "@/lib/datetime";
import {
  buildSplitTable,
  SPLIT_DISTANCES,
  type SplitDistanceKey,
  type SplitMode,
  type SplitTable,
} from "@/lib/tools/splits";
import { cn } from "@/lib/utils";

export default function SplitsPage() {
  const [distanceKey, setDistanceKey] = useState<SplitDistanceKey>("full");
  const [customKm, setCustomKm] = useState("");
  const [mode, setMode] = useState<SplitMode>("even");
  const [h, setH] = useState("");
  const [m, setM] = useState("");
  const [s, setS] = useState("");
  const [result, setResult] = useState<SplitTable | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);

  function onCalc(e?: React.FormEvent) {
    e?.preventDefault();
    setError(null);
    const preset = SPLIT_DISTANCES.find((d) => d.key === distanceKey)!;
    const distanceKm =
      distanceKey === "custom" ? Number(customKm) : (preset.km as number);
    const timeSec = parseHmsToSec(h, m, s);
    if (timeSec == null) {
      setError("请输入目标完赛时间");
      setResult(null);
      return;
    }
    try {
      setResult(buildSplitTable(distanceKm, timeSec, mode));
      setShowAll(distanceKm <= 10);
    } catch (err) {
      setError(err instanceof Error ? err.message : "计算失败");
      setResult(null);
    }
  }

  const rows =
    result == null
      ? []
      : showAll
        ? result.rows
        : result.rows.filter(
            (r, i, arr) =>
              r.kmIndex % 5 === 0 || i === arr.length - 1 || r.kmIndex === 1,
          );

  return (
    <div className="page-shell max-w-lg">
      <div>
        <Link href="/tools" className="text-xs text-muted-foreground hover:text-foreground">
          ← 工具
        </Link>
        <h1 className="page-title mt-1">分段配速表</h1>
        <p className="page-subtitle">目标成绩 → 每公里 / 汇总分段用时</p>
      </div>

      {result && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">结果</CardTitle>
            <CardDescription>
              均速 {formatPaceMinPerKm(result.averagePaceMinPerKm)} /km ·{" "}
              {result.mode === "even" ? "匀速" : "小负分割"}
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="max-h-[420px] overflow-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-card">
                  <tr className="border-y border-border bg-muted/40 text-left">
                    <th className="px-3 py-2 font-medium">公里</th>
                    <th className="px-3 py-2 font-medium">配速</th>
                    <th className="px-3 py-2 font-medium">分段</th>
                    <th className="px-3 py-2 font-medium">累计</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.kmIndex} className="border-b border-border/60">
                      <td className="px-3 py-2 tabular-nums">
                        {r.splitKm < 1
                          ? r.cumulativeKm.toFixed(2)
                          : r.kmIndex}
                      </td>
                      <td className="px-3 py-2 tabular-nums">
                        {formatPaceMinPerKm(r.paceMinPerKm)}
                      </td>
                      <td className="px-3 py-2 tabular-nums text-muted-foreground">
                        {formatDurationSec(r.splitSec)}
                      </td>
                      <td className="px-3 py-2 tabular-nums">
                        {formatDurationSec(r.cumulativeSec)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {result.distanceKm > 10 && (
              <div className="p-3">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="w-full touch-manipulation"
                  onClick={() => setShowAll((v) => !v)}
                >
                  {showAll ? "只看每 5 公里" : "展开每公里"}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">目标</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={onCalc} className="space-y-4">
            <div className="space-y-2">
              <Label>距离</Label>
              <div className="flex flex-wrap gap-2">
                {SPLIT_DISTANCES.map((d) => (
                  <Button
                    key={d.key}
                    type="button"
                    size="sm"
                    variant={distanceKey === d.key ? "default" : "outline"}
                    className="touch-manipulation"
                    onClick={() => setDistanceKey(d.key)}
                  >
                    {d.label}
                  </Button>
                ))}
              </div>
            </div>
            {distanceKey === "custom" && (
              <div className="space-y-2">
                <Label htmlFor="split-km">自定义 km</Label>
                <Input
                  id="split-km"
                  type="number"
                  inputMode="decimal"
                  value={customKm}
                  onChange={(e) => setCustomKm(e.target.value)}
                />
              </div>
            )}
            <div className="space-y-2">
              <Label>策略</Label>
              <div className="flex gap-2">
                {(
                  [
                    ["even", "匀速"],
                    ["negative", "小负分割"],
                  ] as const
                ).map(([k, label]) => (
                  <Button
                    key={k}
                    type="button"
                    size="sm"
                    variant={mode === k ? "default" : "outline"}
                    className={cn("flex-1 touch-manipulation")}
                    onClick={() => setMode(k)}
                  >
                    {label}
                  </Button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label>目标完赛时间</Label>
              <DurationFields
                hours={h}
                minutes={m}
                seconds={s}
                onHoursChange={setH}
                onMinutesChange={setM}
                onSecondsChange={setS}
                idPrefix="splits"
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" className="w-full touch-manipulation">
              生成分段表
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
