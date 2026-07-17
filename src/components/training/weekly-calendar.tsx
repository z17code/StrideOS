"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  addDays,
  formatMonthDayZh,
  startOfMondayWeek,
  weekdayLabelZh,
} from "@/lib/datetime";
import { WORKOUT_LABEL, PHASE_LABEL, type PlanPhase } from "@/lib/plans/types";
import { cn } from "@/lib/utils";

export type PlanWorkoutDto = {
  id: string;
  weekNumber: number;
  phase: PlanPhase;
  dayOfWeek: number;
  scheduledDate: string;
  workoutType: string;
  distanceKm: number | null;
  durationMin: number | null;
  targetRpe: number | null;
  targetPaceMinKm: number | null;
  targetPaceMaxKm: number | null;
  isQuality: boolean;
  notes: string | null;
};

export type PlanDto = {
  id: string;
  versionNumber: number;
  startsOn: string;
  endsOn: string;
  totalWeeks: number;
  warnings: string[];
  workouts: PlanWorkoutDto[];
};

function workoutTitle(type: string) {
  return (
    WORKOUT_LABEL[type as keyof typeof WORKOUT_LABEL] ?? type
  );
}

export function WeeklyCalendar({
  plan,
  today,
}: {
  plan: PlanDto;
  today: string;
}) {
  const router = useRouter();
  const search = useSearchParams();
  const weekParam = search.get("week");
  const weekStart = useMemo(() => {
    const candidate = weekParam && /^\d{4}-\d{2}-\d{2}$/.test(weekParam)
      ? startOfMondayWeek(weekParam)
      : startOfMondayWeek(
          today < plan.startsOn
            ? plan.startsOn
            : today > plan.endsOn
              ? plan.endsOn
              : today,
        );
    // Clamp into plan range
    if (candidate < startOfMondayWeek(plan.startsOn))
      return startOfMondayWeek(plan.startsOn);
    if (candidate > startOfMondayWeek(plan.endsOn))
      return startOfMondayWeek(plan.endsOn);
    return candidate;
  }, [weekParam, plan.startsOn, plan.endsOn, today]);

  const days = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)),
    [weekStart],
  );

  const byDate = useMemo(() => {
    const map = new Map<string, PlanWorkoutDto[]>();
    for (const w of plan.workouts ?? []) {
      const list = map.get(w.scheduledDate) ?? [];
      list.push(w);
      map.set(w.scheduledDate, list);
    }
    return map;
  }, [plan.workouts]);

  const weekNumber =
    byDate.get(days.find((d) => byDate.has(d)) ?? "")?.[0]?.weekNumber ??
    Math.floor(
      (Date.parse(weekStart) - Date.parse(startOfMondayWeek(plan.startsOn))) /
        (7 * 86400000),
    ) + 1;

  const phase = (plan.workouts.find((w) => w.scheduledDate >= weekStart && w.scheduledDate <= days[6]!)
    ?.phase ?? "base") as PlanPhase;

  const minWeek = startOfMondayWeek(plan.startsOn);
  const maxWeek = startOfMondayWeek(plan.endsOn);
  const canGoPrev = weekStart > minWeek;
  const canGoNext = weekStart < maxWeek;

  function go(delta: number) {
    const next = addDays(weekStart, delta * 7);
    if (next < minWeek || next > maxWeek) return;
    router.replace(`/plan?week=${next}`);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm text-muted-foreground">
            第 {weekNumber} 周 · {PHASE_LABEL[phase]}
          </p>
          <p className="text-sm font-medium">
            {formatMonthDayZh(weekStart)} – {formatMonthDayZh(days[6]!)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {canGoPrev && (
            <Button
              type="button"
              size="icon"
              variant="outline"
              onClick={() => go(-1)}
              aria-label="上一周"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
          )}
          <Button
            type="button"
            size="sm"
            variant="secondary"
            onClick={() =>
              router.replace(`/plan?week=${startOfMondayWeek(today)}`)
            }
          >
            本周
          </Button>
          {canGoNext && (
            <Button
              type="button"
              size="icon"
              variant="outline"
              onClick={() => go(1)}
              aria-label="下一周"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Desktop grid */}
      <div className="hidden gap-2 lg:grid lg:grid-cols-7">
        {days.map((date) => (
          <DayCell
            key={date}
            date={date}
            today={today}
            workouts={byDate.get(date) ?? []}
          />
        ))}
      </div>

      {/* Mobile agenda */}
      <div className="space-y-2 lg:hidden">
        {days.map((date) => (
          <DayCell
            key={date}
            date={date}
            today={today}
            workouts={byDate.get(date) ?? []}
            agenda
          />
        ))}
      </div>
    </div>
  );
}

function DayCell({
  date,
  today,
  workouts,
  agenda,
}: {
  date: string;
  today: string;
  workouts: PlanWorkoutDto[];
  agenda?: boolean;
}) {
  const isToday = date === today;
  return (
    <div
      className={cn(
        "rounded-xl border border-border/80 bg-card p-2.5 shadow-sm",
        isToday && "ring-2 ring-ring",
        agenda && "flex gap-3",
      )}
    >
      <div className={cn("mb-2", agenda && "mb-0 w-14 shrink-0")}>
        <p className="text-xs text-muted-foreground">{weekdayLabelZh(date)}</p>
        <p
          className={cn(
            "text-sm font-medium tabular-nums",
            isToday &&
              "inline-flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground",
          )}
        >
          {Number(date.slice(8, 10))}
        </p>
      </div>
      <div className="min-w-0 flex-1 space-y-1.5">
        {workouts.length === 0 ? (
          <p className="text-xs text-muted-foreground">休息</p>
        ) : (
          workouts.map((w) => (
            <Link
              key={w.id}
              href={`/plan/workouts/${w.id}`}
              className={cn(
                "block rounded-xl border border-border/80 bg-muted/40 px-2 py-1.5 text-xs transition-colors hover:border-primary/30 hover:bg-primary-soft touch-manipulation active:opacity-80",
                w.workoutType === "race" && "border-primary bg-primary/5",
                w.isQuality && "border-foreground/40",
              )}
            >
              <p className="font-medium">{workoutTitle(w.workoutType)}</p>
              {w.distanceKm != null && (
                <p className="tabular-nums text-muted-foreground">
                  {w.distanceKm} km
                  {w.targetRpe != null ? ` · RPE ${w.targetRpe}` : ""}
                </p>
              )}
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
