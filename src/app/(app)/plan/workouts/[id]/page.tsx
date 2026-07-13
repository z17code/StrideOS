import Link from "next/link";
import { notFound } from "next/navigation";
import { requireOnboardedUser } from "@/lib/auth/onboarding-gate";
import {
  formatMonthDayZh,
  formatPaceMinPerKm,
  weekdayLabelZh,
} from "@/lib/datetime";
import { getWorkoutForUser } from "@/lib/plans/service";
import {
  PHASE_LABEL,
  WORKOUT_LABEL,
  type PlanPhase,
  type PlannedWorkoutType,
} from "@/lib/plans/types";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export default async function WorkoutDetailPage({ params }: Params) {
  const { user } = await requireOnboardedUser();
  const { id } = await params;
  const row = await getWorkoutForUser(user.id, id);
  if (!row) notFound();

  const { workout: w } = row;
  const typeLabel =
    WORKOUT_LABEL[w.workoutType as PlannedWorkoutType] ?? w.workoutType;

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <Link
        href="/plan"
        className="text-sm text-muted-foreground underline-offset-4 hover:underline"
      >
        ← 返回计划
      </Link>

      <div>
        <p className="text-sm text-muted-foreground">
          {weekdayLabelZh(w.scheduledDate)} · {formatMonthDayZh(w.scheduledDate)}
        </p>
        <h1 className="mt-1 text-xl font-semibold tracking-tight">
          {typeLabel}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          第 {w.weekNumber} 周 · {PHASE_LABEL[w.phase as PlanPhase]}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">处方</CardTitle>
          <CardDescription>以 RPE 为首要强度依据</CardDescription>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Metric label="距离" value={w.distanceKm != null ? `${w.distanceKm} km` : "—"} />
            <Metric
              label="时长"
              value={w.durationMin != null ? `${w.durationMin} 分钟` : "—"}
            />
            <Metric
              label="目标 RPE"
              value={w.targetRpe != null ? String(w.targetRpe) : "—"}
            />
            <Metric
              label="配速"
              value={
                w.targetPaceMinKm != null && w.targetPaceMaxKm != null
                  ? `${formatPaceMinPerKm(w.targetPaceMinKm)}–${formatPaceMinPerKm(w.targetPaceMaxKm)} /km`
                  : "—"
              }
            />
          </dl>
        </CardContent>
      </Card>

      {w.notes && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">说明</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">
              {w.notes}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-1 text-sm font-medium tabular-nums">{value}</dd>
    </div>
  );
}
