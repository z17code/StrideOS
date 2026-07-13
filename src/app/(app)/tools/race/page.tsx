"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
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

type DistanceType = "10k" | "half" | "full";

interface PaceRange {
  minPerKm: number;
  maxPerKm: number;
}

interface StrategySegment {
  label: string;
  distanceKm: number;
  paceMinPerKm: number;
  durationSec: number;
}

interface StrategyData {
  id?: string;
  distanceType: DistanceType;
  targetTimeSec: number;
  vdot: number;
  averagePaceMinPerKm: number;
  trainingPaces: Record<string, PaceRange>;
  equivalentTimes: Record<string, number>;
  segments: StrategySegment[];
  label?: string | null;
  createdAt?: string;
}

const DISTANCE_OPTIONS: Array<{ value: DistanceType; label: string }> = [
  { value: "10k", label: "10 公里" },
  { value: "half", label: "半程马拉松" },
  { value: "full", label: "全程马拉松" },
];

const PACE_LABELS: Record<string, string> = {
  easy: "轻松跑",
  marathon: "马拉松配速",
  threshold: "乳酸阈",
  interval: "间歇",
  repetition: "重复跑",
};

const EQ_LABELS: Record<string, string> = {
  "5k": "5K",
  "10k": "10K",
  half: "半马",
  full: "全马",
};

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function formatHms(totalSec: number) {
  const s = Math.max(0, Math.round(totalSec));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}:${pad2(m)}:${pad2(sec)}`;
  return `${m}:${pad2(sec)}`;
}

function formatPace(minPerKm: number) {
  const totalSec = Math.round(minPerKm * 60);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${pad2(s)}/km`;
}

function parseTimeToSec(h: string, m: string, s: string): number | null {
  const hh = h === "" ? 0 : Number(h);
  const mm = m === "" ? 0 : Number(m);
  const ss = s === "" ? 0 : Number(s);
  if (![hh, mm, ss].every((n) => Number.isFinite(n) && n >= 0)) return null;
  if (mm >= 60 || ss >= 60) return null;
  const total = hh * 3600 + mm * 60 + ss;
  return total > 0 ? total : null;
}

export default function RaceStrategyPage() {
  const [distanceType, setDistanceType] = useState<DistanceType>("half");
  const [hours, setHours] = useState("1");
  const [minutes, setMinutes] = useState("30");
  const [seconds, setSeconds] = useState("0");
  const [label, setLabel] = useState("");
  const [strategy, setStrategy] = useState<StrategyData | null>(null);
  const [saved, setSaved] = useState<StrategyData[]>([]);
  const [computing, setComputing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const targetTimeSec = useMemo(
    () => parseTimeToSec(hours, minutes, seconds),
    [hours, minutes, seconds],
  );

  const loadSaved = useCallback(async () => {
    try {
      const res = await fetch("/api/v1/strategies");
      if (!res.ok) return;
      const data = await res.json();
      setSaved(data.strategies ?? []);
    } catch {
      /* ignore list errors on mount */
    }
  }, []);

  useEffect(() => {
    void loadSaved();
  }, [loadSaved]);

  async function compute(e?: React.FormEvent) {
    e?.preventDefault();
    if (targetTimeSec == null) {
      setError("请输入有效的目标成绩");
      return;
    }
    setComputing(true);
    setError(null);
    try {
      const res = await fetch("/api/v1/strategies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          distanceType,
          targetTimeSec,
          save: false,
        }),
      });
      if (!res.ok) {
        const b = await res.json().catch(() => null);
        throw new Error(b?.error?.message ?? "计算失败");
      }
      const data = await res.json();
      setStrategy(data.strategy);
    } catch (err) {
      setError(err instanceof Error ? err.message : "计算失败");
    } finally {
      setComputing(false);
    }
  }

  async function save() {
    if (targetTimeSec == null) {
      setError("请输入有效的目标成绩");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/v1/strategies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          distanceType,
          targetTimeSec,
          label: label || null,
          save: true,
        }),
      });
      if (!res.ok) {
        const b = await res.json().catch(() => null);
        throw new Error(b?.error?.message ?? "保存失败");
      }
      const data = await res.json();
      setStrategy(data.strategy);
      setLabel("");
      await loadSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "保存失败");
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: string) {
    if (!confirm("确认删除该策略？")) return;
    try {
      const res = await fetch(`/api/v1/strategies/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const b = await res.json().catch(() => null);
        throw new Error(b?.error?.message ?? "删除失败");
      }
      await loadSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "删除失败");
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">比赛策略</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Daniels VDOT · 训练配速 · 负分割分段
          </p>
        </div>
        <Link
          href="/tools"
          className="text-sm text-muted-foreground hover:underline"
        >
          ← 工具
        </Link>
      </div>

      {error && (
        <p className="rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}

      <Card>
        <CardHeader>
          <CardTitle>计算目标成绩</CardTitle>
          <CardDescription>
            输入距离与目标完赛时间，生成 VDOT 与分段策略
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={compute} className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1 sm:col-span-2">
              <Label htmlFor="distanceType">距离</Label>
              <select
                id="distanceType"
                className="flex h-10 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                value={distanceType}
                onChange={(e) =>
                  setDistanceType(e.target.value as DistanceType)
                }
              >
                {DISTANCE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1 sm:col-span-2">
              <Label>目标成绩</Label>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <Input
                    type="number"
                    min={0}
                    max={10}
                    value={hours}
                    onChange={(e) => setHours(e.target.value)}
                    placeholder="时"
                    aria-label="小时"
                  />
                  <span className="mt-0.5 block text-center text-[10px] text-muted-foreground">
                    时
                  </span>
                </div>
                <div>
                  <Input
                    type="number"
                    min={0}
                    max={59}
                    value={minutes}
                    onChange={(e) => setMinutes(e.target.value)}
                    placeholder="分"
                    aria-label="分钟"
                  />
                  <span className="mt-0.5 block text-center text-[10px] text-muted-foreground">
                    分
                  </span>
                </div>
                <div>
                  <Input
                    type="number"
                    min={0}
                    max={59}
                    value={seconds}
                    onChange={(e) => setSeconds(e.target.value)}
                    placeholder="秒"
                    aria-label="秒"
                  />
                  <span className="mt-0.5 block text-center text-[10px] text-muted-foreground">
                    秒
                  </span>
                </div>
              </div>
            </div>
            <div className="space-y-1 sm:col-span-2">
              <Label htmlFor="label">标签（保存时可选）</Label>
              <Input
                id="label"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="例：上海马拉松 2026"
              />
            </div>
            <div className="flex flex-wrap gap-2 sm:col-span-2">
              <Button type="submit" disabled={computing}>
                {computing ? "计算中…" : "计算"}
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={saving || targetTimeSec == null}
                onClick={() => void save()}
              >
                {saving ? "保存中…" : "计算并保存"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {strategy && (
        <>
          <Card>
            <CardHeader>
              <CardTitle>VDOT {strategy.vdot}</CardTitle>
              <CardDescription>
                平均配速 {formatPace(strategy.averagePaceMinPerKm)} · 目标{" "}
                {formatHms(strategy.targetTimeSec)}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="mb-2 text-sm font-medium">负分割分段</h3>
                <ul className="divide-y divide-border rounded-md border">
                  {strategy.segments.map((seg) => (
                    <li
                      key={seg.label}
                      className="flex items-center justify-between gap-3 px-3 py-2 text-sm"
                    >
                      <div>
                        <div className="font-medium">{seg.label}</div>
                        <div className="text-xs text-muted-foreground">
                          {seg.distanceKm.toFixed(2)} km
                        </div>
                      </div>
                      <div className="text-right">
                        <div>{formatPace(seg.paceMinPerKm)}</div>
                        <div className="text-xs text-muted-foreground">
                          {formatHms(seg.durationSec)}
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <h3 className="mb-2 text-sm font-medium">训练配速区间</h3>
                <ul className="grid gap-2 sm:grid-cols-2">
                  {Object.entries(strategy.trainingPaces).map(([key, range]) => (
                    <li
                      key={key}
                      className="rounded-md border px-3 py-2 text-sm"
                    >
                      <div className="font-medium">
                        {PACE_LABELS[key] ?? key}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {formatPace(range.minPerKm)} –{" "}
                        {formatPace(range.maxPerKm)}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <h3 className="mb-2 text-sm font-medium">等价成绩</h3>
                <ul className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {Object.entries(strategy.equivalentTimes).map(
                    ([key, sec]) => (
                      <li
                        key={key}
                        className="rounded-md border px-3 py-2 text-center text-sm"
                      >
                        <div className="text-xs text-muted-foreground">
                          {EQ_LABELS[key] ?? key}
                        </div>
                        <div className="font-medium">{formatHms(sec)}</div>
                      </li>
                    ),
                  )}
                </ul>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      <div>
        <h2 className="mb-3 text-sm font-medium">已保存策略</h2>
        {saved.length === 0 ? (
          <p className="text-sm text-muted-foreground">暂无保存</p>
        ) : (
          <ul className="space-y-3">
            {saved.map((s) => (
              <li key={s.id}>
                <Card>
                  <CardContent className="flex items-center justify-between gap-3 p-4">
                    <div>
                      <div className="font-medium">
                        {s.label ||
                          DISTANCE_OPTIONS.find(
                            (d) => d.value === s.distanceType,
                          )?.label ||
                          s.distanceType}
                      </div>
                      <div className="mt-0.5 text-xs text-muted-foreground">
                        VDOT {s.vdot} · {formatHms(s.targetTimeSec)} ·{" "}
                        {formatPace(s.averagePaceMinPerKm)}
                      </div>
                    </div>
                    <div className="flex shrink-0 gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => setStrategy(s)}
                      >
                        查看
                      </Button>
                      {s.id && (
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={() => void remove(s.id!)}
                        >
                          删除
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
