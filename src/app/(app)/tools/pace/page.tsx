"use client";

import { useMemo, useState } from "react";
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
  splitSecToHms,
} from "@/components/ui/duration-fields";
import { formatDurationSec, formatPaceMinPerKm } from "@/lib/datetime";
import {
  computePace,
  DEFAULT_LAP_METERS,
  PACE_RACE_OPTIONS,
  type PaceInputField,
  type PaceRaceType,
} from "@/lib/tools/pace";
import { cn } from "@/lib/utils";

function paceToFields(minPerKm: number): { m: string; s: string } {
  const totalSec = Math.round(minPerKm * 60);
  return {
    m: String(Math.floor(totalSec / 60)),
    s: String(totalSec % 60),
  };
}

function fieldsToPace(m: string, s: string): number | null {
  const mm = m === "" ? 0 : Number(m);
  const ss = s === "" ? 0 : Number(s);
  if (
    ![mm, ss].every((n) => Number.isFinite(n) && n >= 0 && Number.isInteger(n))
  ) {
    return null;
  }
  if (ss >= 60) return null;
  const total = mm * 60 + ss;
  return total > 0 ? total / 60 : null;
}

function lapToFields(lapSec: number): { m: string; s: string } {
  const sec = Math.round(lapSec);
  return {
    m: String(Math.floor(sec / 60)),
    s: String(sec % 60),
  };
}

function fieldsToLap(m: string, s: string): number | null {
  const mm = m === "" ? 0 : Number(m);
  const ss = s === "" ? 0 : Number(s);
  if (
    ![mm, ss].every((n) => Number.isFinite(n) && n >= 0 && Number.isInteger(n))
  ) {
    return null;
  }
  if (ss >= 60) return null;
  const total = mm * 60 + ss;
  return total > 0 ? total : null;
}

type FormState = {
  distanceStr: string;
  timeH: string;
  timeM: string;
  timeS: string;
  paceM: string;
  paceS: string;
  lapM: string;
  lapS: string;
};

const INITIAL: FormState = {
  distanceStr: "10",
  timeH: "",
  timeM: "",
  timeS: "",
  paceM: "",
  paceS: "",
  lapM: "",
  lapS: "",
};

function applyComputed(
  base: FormState,
  priority: PaceInputField,
): { next: FormState; error: string | null } {
  const distanceKm = Number(base.distanceStr);
  if (!Number.isFinite(distanceKm) || distanceKm <= 0) {
    return { next: base, error: null };
  }

  const timeSec = parseHmsToSec(base.timeH, base.timeM, base.timeS);
  const paceMinPerKm = fieldsToPace(base.paceM, base.paceS);
  const lapSec = fieldsToLap(base.lapM, base.lapS);

  // While the user is mid-editing the priority field, don't fall back to
  // other fields and overwrite what they are typing.
  if (priority === "time" && timeSec == null) {
    return { next: base, error: null };
  }
  if (priority === "pace" && paceMinPerKm == null) {
    return { next: base, error: null };
  }
  if (priority === "lap" && lapSec == null) {
    return { next: base, error: null };
  }

  if (timeSec == null && paceMinPerKm == null && lapSec == null) {
    return { next: base, error: null };
  }

  try {
    const r = computePace(
      { distanceKm, timeSec, paceMinPerKm, lapSec },
      priority,
    );
    const hms = splitSecToHms(r.timeSec);
    const pace = paceToFields(r.paceMinPerKm);
    const lap = lapToFields(r.lapSec);

    return {
      next: {
        distanceStr: base.distanceStr,
        timeH: priority === "time" ? base.timeH : hms.h || "0",
        timeM: priority === "time" ? base.timeM : hms.m,
        timeS: priority === "time" ? base.timeS : hms.s,
        paceM: priority === "pace" ? base.paceM : pace.m,
        paceS: priority === "pace" ? base.paceS : pace.s,
        lapM: priority === "lap" ? base.lapM : lap.m,
        lapS: priority === "lap" ? base.lapS : lap.s,
      },
      error: null,
    };
  } catch (e) {
    return {
      next: base,
      error: e instanceof Error ? e.message : "计算失败",
    };
  }
}

export default function PaceCalculatorPage() {
  const [raceType, setRaceType] = useState<PaceRaceType>("10k");
  const [form, setForm] = useState<FormState>(INITIAL);
  const [error, setError] = useState<string | null>(null);

  const distanceLocked = raceType !== "custom";

  function handleChange(priority: PaceInputField, partial: Partial<FormState>) {
    const merged = { ...form, ...partial };
    const { next, error: err } = applyComputed(merged, priority);
    setForm(next);
    setError(err);
  }

  function applyRaceType(next: PaceRaceType) {
    setRaceType(next);
    const opt = PACE_RACE_OPTIONS.find((o) => o.value === next);
    if (opt?.km != null) {
      handleChange("distance", { distanceStr: String(opt.km) });
    }
  }

  const summary = useMemo(() => {
    const distanceKm = Number(form.distanceStr);
    const timeSec = parseHmsToSec(form.timeH, form.timeM, form.timeS);
    const paceMinPerKm = fieldsToPace(form.paceM, form.paceS);
    const lapSec = fieldsToLap(form.lapM, form.lapS);
    if (
      !Number.isFinite(distanceKm) ||
      distanceKm <= 0 ||
      timeSec == null ||
      paceMinPerKm == null ||
      lapSec == null
    ) {
      return null;
    }
    return { distanceKm, timeSec, paceMinPerKm, lapSec };
  }, [form]);

  function clearAll() {
    setRaceType("10k");
    setForm({
      distanceStr: "10",
      timeH: "",
      timeM: "",
      timeS: "",
      paceM: "",
      paceS: "",
      lapM: "",
      lapS: "",
    });
    setError(null);
  }

  return (
    <div className="page-shell max-w-lg">
      <div>
        <Link
          href="/tools"
          className="text-xs text-muted-foreground hover:text-foreground"
        >
          ← 工具
        </Link>
        <h1 className="page-title mt-1">配速计算器</h1>
        <p className="page-subtitle">
          输入里程，再填用时 / 配速 / 圈速中任意一项，其余自动计算
        </p>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">参数</CardTitle>
          <CardDescription>
            修改任意一项后，其它关联值会自动更新（圈速默认 400 m）
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-2">
            <Label>类型</Label>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {PACE_RACE_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => applyRaceType(opt.value)}
                  className={cn(
                    "rounded-lg border px-3 py-2 text-sm touch-manipulation transition-colors active:scale-[0.98]",
                    raceType === opt.value
                      ? "border-primary bg-primary/10 text-foreground"
                      : "border-border text-muted-foreground hover:border-foreground/30",
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="pace-distance">里程 km</Label>
            <Input
              id="pace-distance"
              type="number"
              inputMode="decimal"
              min={0.1}
              step={0.001}
              value={form.distanceStr}
              disabled={distanceLocked}
              onChange={(e) =>
                handleChange("distance", { distanceStr: e.target.value })
              }
            />
          </div>

          <div className="space-y-2">
            <Label>用时 h:m:s</Label>
            <DurationFields
              idPrefix="pace-time"
              hours={form.timeH}
              minutes={form.timeM}
              seconds={form.timeS}
              onHoursChange={(v) => handleChange("time", { timeH: v })}
              onMinutesChange={(v) => handleChange("time", { timeM: v })}
              onSecondsChange={(v) => handleChange("time", { timeS: v })}
            />
          </div>

          <div className="space-y-2">
            <Label>配速 m:s / km</Label>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Input
                  type="number"
                  inputMode="numeric"
                  min={0}
                  max={59}
                  value={form.paceM}
                  onChange={(e) =>
                    handleChange("pace", { paceM: e.target.value })
                  }
                  placeholder="分"
                  aria-label="配速分"
                />
                <span className="mt-0.5 block text-center text-[10px] text-muted-foreground">
                  分
                </span>
              </div>
              <div>
                <Input
                  type="number"
                  inputMode="numeric"
                  min={0}
                  max={59}
                  value={form.paceS}
                  onChange={(e) =>
                    handleChange("pace", { paceS: e.target.value })
                  }
                  placeholder="秒"
                  aria-label="配速秒"
                />
                <span className="mt-0.5 block text-center text-[10px] text-muted-foreground">
                  秒
                </span>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-baseline justify-between">
              <Label>圈速 m:s</Label>
              <span className="text-[10px] text-muted-foreground">
                {DEFAULT_LAP_METERS} m
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Input
                  type="number"
                  inputMode="numeric"
                  min={0}
                  max={59}
                  value={form.lapM}
                  onChange={(e) =>
                    handleChange("lap", { lapM: e.target.value })
                  }
                  placeholder="分"
                  aria-label="圈速分"
                />
                <span className="mt-0.5 block text-center text-[10px] text-muted-foreground">
                  分
                </span>
              </div>
              <div>
                <Input
                  type="number"
                  inputMode="numeric"
                  min={0}
                  max={59}
                  value={form.lapS}
                  onChange={(e) =>
                    handleChange("lap", { lapS: e.target.value })
                  }
                  placeholder="秒"
                  aria-label="圈速秒"
                />
                <span className="mt-0.5 block text-center text-[10px] text-muted-foreground">
                  秒
                </span>
              </div>
            </div>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          {summary && (
            <div className="rounded-lg bg-muted/50 px-3 py-3 text-sm">
              <div className="grid grid-cols-2 gap-2 tabular-nums">
                <div>
                  <div className="text-xs text-muted-foreground">里程</div>
                  <div className="font-medium">{summary.distanceKm} km</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">用时</div>
                  <div className="font-medium">
                    {formatDurationSec(summary.timeSec)}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">配速</div>
                  <div className="font-medium">
                    {formatPaceMinPerKm(summary.paceMinPerKm)}/km
                  </div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">
                    圈速 ({DEFAULT_LAP_METERS}m)
                  </div>
                  <div className="font-medium">
                    {formatDurationSec(summary.lapSec)}
                  </div>
                </div>
              </div>
            </div>
          )}

          <Button
            type="button"
            variant="outline"
            className="w-full touch-manipulation"
            onClick={clearAll}
          >
            清空
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

