import Link from "next/link";
import { notFound } from "next/navigation";
import { requireOnboardedUser } from "@/lib/auth/onboarding-gate";
import { getPlanVersion, mapPlanVersion } from "@/lib/plans/service";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { WORKOUT_LABEL, type PlannedWorkoutType } from "@/lib/plans/types";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ versionId: string }> };

export default async function PlanHistoryPage({ params }: Params) {
  const { user } = await requireOnboardedUser();
  const { versionId } = await params;
  const plan = await getPlanVersion(user.id, versionId);
  if (!plan) notFound();

  const dto = mapPlanVersion(plan.version, plan.workouts);

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <Link
        href="/plan"
        className="text-sm text-muted-foreground underline-offset-4 hover:underline"
      >
        ← 返回计划
      </Link>
      <div>
        <h1 className="text-xl font-semibold tracking-tight">
          计划版本 v{dto.versionNumber}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {dto.startsOn} → {dto.endsOn} · {dto.createdReason}
          {dto.isActive ? " · 当前活跃" : ""}
        </p>
      </div>

      {dto.warnings.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">警告</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
              {dto.warnings.map((w) => (
                <li key={w}>{w}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">课表快照</CardTitle>
          <CardDescription>只读历史，共 {dto.workouts?.length ?? 0} 节</CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="divide-y divide-border">
            {(dto.workouts ?? []).map((w) => (
              <li
                key={w.id}
                className="flex items-center justify-between gap-3 py-2 text-sm"
              >
                <span className="text-muted-foreground tabular-nums">
                  {w.scheduledDate}
                </span>
                <span className="font-medium">
                  {WORKOUT_LABEL[w.workoutType as PlannedWorkoutType] ??
                    w.workoutType}
                </span>
                <span className="tabular-nums text-muted-foreground">
                  {w.distanceKm != null ? `${w.distanceKm} km` : "—"}
                </span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
