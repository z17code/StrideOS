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
  buildTrainingPaceTable,
  PACE_RACE_PRESETS,
  TRAINING_PACE_HINTS,
  TRAINING_PACE_LABELS,
  type PaceRaceKey,
  type TrainingPaceTable,
} from "@/lib/tools/paces";
import type { TrainingPaceKey } from "@/lib/strategy/engine";

const PACE_ORDER: TrainingPaceKey[] = [
  "easy",
  "marathon",
  "threshold",
  "interval",
  "repetition",
];

export default function TrainingPacesPage() {
  const [raceKey, setRaceKey] = useState<PaceRaceKey>("10k");
  const [customKm, setCustomKm] = useState("");
  const [h, setH] = useState("");
  const [m, setM] = useState("");
  const [s, setS] = useState("");
  const [result, setResult] = useState<TrainingPaceTable | null>(null);
  const [error, setError] = useState<string | null>(null);

  function onCalc(e?: React.FormEvent) {
    e?.preventDefault();
    setError(null);
    const preset = PACE_RACE_PRESETS.find((p) => p.key === raceKey)!;
    const distanceKm =
      raceKey === "custom" ? Number(customKm) : (preset.km as number);
    const timeSec = parseHmsToSec(h, m, s);
    if (timeSec == null) {
      setError("请输入有效成绩（时/分/秒）");
      setResult(null);
      return;
    }
    try {
      setResult(buildTrainingPaceTable(distanceKm, timeSec));
    } catch (err) {
      setError(err instanceof Error ? err.message : "计算失败");
      setResult(null);
    }
  }

  return (
    <div className="page-shell max-w-lg">
      <div>
        <Link href="/tools" className="text-xs text-muted-foreground hover:text-foreground">
          ← 工具
        </Link>
        <h1 className="page-title mt-1">训练配速表</h1>
        <p className="page-subtitle">根据近期成绩生成 E / M / T / I / R 配速区间</p>
      </div>

      {result && (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-xs text-muted-foreground">VDOT</div>
              <div className="mt-1 text-4xl font-semibold tabular-nums">{result.vdot}</div>
              <p className="mt-1 text-xs text-muted-foreground">
                锚点 {result.distanceKm} km · {formatDurationSec(result.timeSec)}
              </p>
            </div>
            <ul className="mt-5 space-y-3">
              {PACE_ORDER.map((key) => {
                const range = result.paces[key];
                return (
                  <li
                    key={key}
                    className="flex items-start justify-between gap-3 border-b border-border/60 pb-3 last:border-0 last:pb-0"
                  >
                    <div>
                      <div className="text-sm font-medium">{TRAINING_PACE_LABELS[key]}</div>
                      <div className="text-xs text-muted-foreground">{TRAINING_PACE_HINTS[key]}</div>
                    </div>
                    <div className="shrink-0 text-right text-sm tabular-nums">
                      {formatPaceMinPerKm(range.minPerKm)} – {formatPaceMinPerKm(range.maxPerKm)}
                      <div className="text-[10px] text-muted-foreground">min/km</div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">输入成绩</CardTitle>
          <CardDescription>建议使用 4 周内接近全力的比赛或测验</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onCalc} className="space-y-4">
            <div className="space-y-2">
              <Label>距离</Label>
              <div className="flex flex-wrap gap-2">
                {PACE_RACE_PRESETS.map((p) => (
                  <Button
                    key={p.key}
                    type="button"
                    size="sm"
                    variant={raceKey === p.key ? "default" : "outline"}
                    className="touch-manipulation"
                    onClick={() => setRaceKey(p.key)}
                  >
                    {p.label}
                  </Button>
                ))}
              </div>
            </div>
            {raceKey === "custom" && (
              <div className="space-y-2">
                <Label htmlFor="custom-km">自定义距离（km）</Label>
                <Input
                  id="custom-km"
                  type="number"
                  inputMode="decimal"
                  min={1}
                  step={0.1}
                  value={customKm}
                  onChange={(e) => setCustomKm(e.target.value)}
                />
              </div>
            )}
            <div className="space-y-2">
              <Label>成绩</Label>
              <DurationFields
                hours={h}
                minutes={m}
                seconds={s}
                onHoursChange={setH}
                onMinutesChange={setM}
                onSecondsChange={setS}
                idPrefix="paces"
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" className="w-full touch-manipulation">
              生成配速表
            </Button>
          </form>
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground">
        基于 Daniels VDOT。详见{" "}
        <Link href="/tools/vdot" className="underline hover:text-foreground">
          VDOT 说明
        </Link>
        。
      </p>
    </div>
  );
}
