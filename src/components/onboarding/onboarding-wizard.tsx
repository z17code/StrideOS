"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

const WEEKDAYS = [
  { value: 1, label: "一" },
  { value: 2, label: "二" },
  { value: 3, label: "三" },
  { value: 4, label: "四" },
  { value: 5, label: "五" },
  { value: 6, label: "六" },
  { value: 0, label: "日" },
] as const;

const DISTANCES = [
  { value: "10k", label: "10 公里" },
  { value: "half", label: "半程马拉松" },
  { value: "full", label: "全程马拉松" },
] as const;

type Step = 0 | 1 | 2 | 3 | 4;

function parseTimeToSec(value: string): number | null {
  const v = value.trim();
  if (!v) return null;
  const parts = v.split(":").map((p) => Number(p));
  if (parts.some((n) => !Number.isFinite(n) || n < 0)) return null;
  if (parts.length === 2) return Math.round(parts[0]! * 60 + parts[1]!);
  if (parts.length === 3)
    return Math.round(parts[0]! * 3600 + parts[1]! * 60 + parts[2]!);
  return null;
}

export function OnboardingWizard() {
  const router = useRouter();
  const [step, setStep] = useState<Step>(0);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [skipping, setSkipping] = useState(false);

  // Step 0 — base
  const [weeklyDistance, setWeeklyDistance] = useState("30");
  const [weeklyRuns, setWeeklyRuns] = useState("4");
  const [longestRun, setLongestRun] = useState("12");

  // Step 1 — recent race
  const [hasRace, setHasRace] = useState(false);
  const [raceDistKm, setRaceDistKm] = useState("10");
  const [raceTime, setRaceTime] = useState("50:00");
  const [raceDate, setRaceDate] = useState("");

  // Step 2 — schedule
  const [trainableDays, setTrainableDays] = useState<number[]>([1, 3, 5, 6]);
  const [longRunDay, setLongRunDay] = useState(6);

  // Step 3 — pain
  const [painLevel, setPainLevel] = useState("0");
  const [restrictions, setRestrictions] = useState("");

  // Step 4 — goal
  const [distanceType, setDistanceType] =
    useState<"10k" | "half" | "full">("half");
  const [goalRaceDate, setGoalRaceDate] = useState("");
  const [goalTime, setGoalTime] = useState("");
  const [completionOnly, setCompletionOnly] = useState(false);

  const progress = useMemo(() => ((step + 1) / 5) * 100, [step]);

  function toggleDay(d: number) {
    setTrainableDays((prev) => {
      const next = prev.includes(d)
        ? prev.filter((x) => x !== d)
        : [...prev, d].sort((a, b) => a - b);
      if (!next.includes(longRunDay) && next.length > 0) {
        setLongRunDay(next[next.length - 1]!);
      }
      return next;
    });
  }

  function validateStep(): string | null {
    if (step === 0) {
      if (Number(weeklyDistance) < 0 || Number(weeklyRuns) < 0)
        return "请填写有效的跑量与频次";
      if (Number(longestRun) < 0) return "最长跑距离无效";
    }
    if (step === 1 && hasRace) {
      if (!raceDate) return "请填写基准比赛日期";
      if (!parseTimeToSec(raceTime)) return "成绩格式为 mm:ss 或 h:mm:ss";
    }
    if (step === 2) {
      if (trainableDays.length < 3) return "请至少选择 3 个可训练日";
      if (!trainableDays.includes(longRunDay)) return "长跑日须在可训练日中";
    }
    if (step === 4) {
      if (!goalRaceDate) return "请选择比赛日期";
      if (!completionOnly && !parseTimeToSec(goalTime))
        return "目标成绩格式为 mm:ss 或 h:mm:ss（或勾选仅完赛）";
    }
    return null;
  }

  async function submit() {
    setError(null);
    const v = validateStep();
    if (v) {
      setError(v);
      return;
    }
    setLoading(true);
    try {
      const recentRace =
        hasRace && raceDate
          ? {
              distanceKm: Number(raceDistKm),
              timeSec: parseTimeToSec(raceTime)!,
              raceDate,
            }
          : null;

      const body = {
        profile: {
          weeklyDistance: Number(weeklyDistance),
          weeklyRuns: Number(weeklyRuns),
          longestRun: Number(longestRun),
          trainableDays,
          longRunDay,
          painLevel: Number(painLevel),
          restrictions: restrictions.trim() || null,
          recentRace,
        },
        goal: {
          distanceType,
          raceDate: goalRaceDate,
          targetTime: completionOnly ? null : parseTimeToSec(goalTime),
        },
      };

      const res = await fetch("/api/v1/onboarding/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error?.message ?? "提交失败");
        return;
      }

      // Auto-generate plan
      const gen = await fetch("/api/v1/plans/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: "onboarding" }),
      });
      if (!gen.ok) {
        const g = await gen.json();
        // Still go to plan page; user can regenerate
        console.warn(g?.error?.message);
      }

      router.replace("/plan");
      router.refresh();
    } catch {
      setError("网络错误，请稍后重试");
    } finally {
      setLoading(false);
    }
  }

  async function skip() {
    setError(null);
    setSkipping(true);
    try {
      const res = await fetch("/api/v1/onboarding/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ skip: true }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error?.message ?? "跳过失败");
        return;
      }
      router.replace("/today");
      router.refresh();
    } catch {
      setError("网络错误，请稍后重试");
    } finally {
      setSkipping(false);
    }
  }

  function next() {
    setError(null);
    const v = validateStep();
    if (v) {
      setError(v);
      return;
    }
    if (step < 4) setStep((s) => (s + 1) as Step);
    else void submit();
  }

  function back() {
    setError(null);
    if (step > 0) setStep((s) => (s - 1) as Step);
  }

  const titles = [
    "训练基础",
    "近期成绩",
    "训练安排",
    "伤痛与限制",
    "比赛目标",
  ] as const;

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div>
        <p className="text-xs text-muted-foreground">
          第 {step + 1} 步，共 5 步
        </p>
        <h1 className="mt-1 text-xl font-semibold tracking-tight">
          {titles[step]}
        </h1>
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full bg-primary transition-all"
            style={{ width: `${progress}%` }}
            role="progressbar"
            aria-valuenow={step + 1}
            aria-valuemin={1}
            aria-valuemax={5}
          />
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{titles[step]}</CardTitle>
          <CardDescription>
            {step === 0 && "近 6 周平均跑量、频次与最长距离"}
            {step === 1 && "可选：用于生成配速区间的基准成绩"}
            {step === 2 && "选择可训练的星期与偏好长跑日"}
            {step === 3 && "帮助教练控制强度与风险"}
            {step === 4 && "设定目标距离、比赛日与成绩"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {step === 0 && (
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="周跑量 (km)" id="wd">
                <Input
                  id="wd"
                  type="number"
                  min={0}
                  step={0.1}
                  value={weeklyDistance}
                  onChange={(e) => setWeeklyDistance(e.target.value)}
                />
              </Field>
              <Field label="每周次数" id="wr">
                <Input
                  id="wr"
                  type="number"
                  min={0}
                  max={7}
                  value={weeklyRuns}
                  onChange={(e) => setWeeklyRuns(e.target.value)}
                />
              </Field>
              <Field label="最长跑 (km)" id="lr">
                <Input
                  id="lr"
                  type="number"
                  min={0}
                  step={0.1}
                  value={longestRun}
                  onChange={(e) => setLongestRun(e.target.value)}
                />
              </Field>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-4">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={hasRace}
                  onChange={(e) => setHasRace(e.target.checked)}
                />
                有近期基准比赛成绩
              </label>
              {hasRace && (
                <div className="grid gap-4 sm:grid-cols-3">
                  <Field label="距离 (km)" id="rd">
                    <Input
                      id="rd"
                      type="number"
                      min={1}
                      step={0.1}
                      value={raceDistKm}
                      onChange={(e) => setRaceDistKm(e.target.value)}
                    />
                  </Field>
                  <Field label="成绩 (h:mm:ss)" id="rt">
                    <Input
                      id="rt"
                      value={raceTime}
                      onChange={(e) => setRaceTime(e.target.value)}
                      placeholder="50:00"
                    />
                  </Field>
                  <Field label="日期" id="rdate">
                    <Input
                      id="rdate"
                      type="date"
                      value={raceDate}
                      onChange={(e) => setRaceDate(e.target.value)}
                    />
                  </Field>
                </div>
              )}
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <div>
                <p className="mb-2 text-sm font-medium">可训练日</p>
                <div className="flex flex-wrap gap-2">
                  {WEEKDAYS.map((d) => {
                    const active = trainableDays.includes(d.value);
                    return (
                      <button
                        key={d.value}
                        type="button"
                        onClick={() => toggleDay(d.value)}
                        className={cn(
                          "h-10 w-10 rounded-md border text-sm",
                          active
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-border text-muted-foreground hover:bg-muted",
                        )}
                        aria-pressed={active}
                      >
                        {d.label}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div>
                <p className="mb-2 text-sm font-medium">长跑日偏好</p>
                <div className="flex flex-wrap gap-2">
                  {WEEKDAYS.filter((d) => trainableDays.includes(d.value)).map(
                    (d) => (
                      <button
                        key={d.value}
                        type="button"
                        onClick={() => setLongRunDay(d.value)}
                        className={cn(
                          "h-10 min-w-10 rounded-md border px-3 text-sm",
                          longRunDay === d.value
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-border text-muted-foreground hover:bg-muted",
                        )}
                        aria-pressed={longRunDay === d.value}
                      >
                        周{d.label}
                      </button>
                    ),
                  )}
                </div>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <Field label="当前疼痛 0–10" id="pain">
                <Input
                  id="pain"
                  type="number"
                  min={0}
                  max={10}
                  value={painLevel}
                  onChange={(e) => setPainLevel(e.target.value)}
                />
              </Field>
              <Field label="训练限制（可选）" id="rest">
                <textarea
                  id="rest"
                  className="flex min-h-24 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                  value={restrictions}
                  onChange={(e) => setRestrictions(e.target.value)}
                  maxLength={1000}
                  placeholder="例如：左膝不适，避免下坡"
                />
              </Field>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-4">
              <div>
                <p className="mb-2 text-sm font-medium">目标距离</p>
                <div className="grid gap-2 sm:grid-cols-3">
                  {DISTANCES.map((d) => (
                    <button
                      key={d.value}
                      type="button"
                      onClick={() => setDistanceType(d.value)}
                      className={cn(
                        "rounded-md border px-3 py-2 text-sm",
                        distanceType === d.value
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border hover:bg-muted",
                      )}
                      aria-pressed={distanceType === d.value}
                    >
                      {d.label}
                    </button>
                  ))}
                </div>
              </div>
              <Field label="比赛日期" id="gdate">
                <Input
                  id="gdate"
                  type="date"
                  value={goalRaceDate}
                  onChange={(e) => setGoalRaceDate(e.target.value)}
                />
              </Field>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={completionOnly}
                  onChange={(e) => setCompletionOnly(e.target.checked)}
                />
                仅完赛，不设目标成绩
              </label>
              {!completionOnly && (
                <Field label="目标成绩 (h:mm:ss)" id="gtime">
                  <Input
                    id="gtime"
                    value={goalTime}
                    onChange={(e) => setGoalTime(e.target.value)}
                    placeholder="1:45:00"
                  />
                </Field>
              )}
            </div>
          )}

          {error && (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          )}

          <div className="flex items-center justify-between gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={back}
              disabled={step === 0 || loading || skipping}
            >
              上一步
            </Button>
            <div className="flex gap-2">
              {step > 0 && (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={skip}
                  disabled={loading || skipping}
                >
                  {skipping ? "处理中…" : "稍后填写"}
                </Button>
              )}
              <Button type="button" onClick={next} disabled={loading || skipping}>
                {loading
                  ? "提交中…"
                  : step === 4
                    ? "完成并生成计划"
                    : "继续"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function Field({
  label,
  id,
  children,
}: {
  label: string;
  id: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      {children}
    </div>
  );
}
