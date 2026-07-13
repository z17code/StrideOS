import { Suspense } from "react";
import Link from "next/link";
import { requireOnboardedUser } from "@/lib/auth/onboarding-gate";
import { todayInShanghai, formatDurationSec } from "@/lib/datetime";
import {
  getActiveGoal,
  getActivePlan,
  listPlanVersions,
  mapGoal,
  mapPlanVersion,
} from "@/lib/plans/service";
import { DISTANCE_LABEL } from "@/lib/plans/types";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { WeeklyCalendar, type PlanDto } from "@/components/training/weekly-calendar";
import { GeneratePlanButton } from "@/components/training/generate-plan-button";

export const dynamic = "force-dynamic";

export default async function PlanPage() {
  const { user } = await requireOnboardedUser();
  const active = await getActivePlan(user.id);
  const goal = await getActiveGoal(user.id);
  const versions = await listPlanVersions(user.id);
  const today = todayInShanghai();

  const planDto: PlanDto | null = active
    ? (mapPlanVersion(active.version, active.workouts) as PlanDto)
    : null;

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">计划</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            周历课表 · 版本 v{planDto?.versionNumber ?? "—"}
          </p>
        </div>
        <GeneratePlanButton
          label={planDto ? "重新生成" : "生成计划"}
          reason={planDto ? "regenerate" : "manual"}
        />
      </div>

      {goal ? (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">
              {DISTANCE_LABEL[goal.distanceType]}
            </CardTitle>
            <CardDescription>
              比赛日 {goal.raceDate}
              {goal.targetTime
                ? ` · 目标 ${formatDurationSec(goal.targetTime)}`
                : " · 完赛目标"}
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">尚无活跃比赛目标</CardTitle>
            <CardDescription>请先创建目标后再生成计划</CardDescription>
          </CardHeader>
        </Card>
      )}

      {!planDto ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            还没有训练计划。点击右上角生成。
          </CardContent>
        </Card>
      ) : (
        <>
          {planDto.warnings?.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">计划提示</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                  {planDto.warnings.map((w) => (
                    <li key={w}>{w}</li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          <Suspense fallback={<p className="text-sm text-muted-foreground">加载周历…</p>}>
            <WeeklyCalendar plan={planDto} today={today} />
          </Suspense>
        </>
      )}

      {versions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">版本历史</CardTitle>
            <CardDescription>计划版本只读，重新生成会创建新版本</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm">
              {versions.map((v) => (
                <li key={v.id} className="flex items-center justify-between gap-2">
                  <Link
                    href={`/plan/history/${v.id}`}
                    className="font-medium underline-offset-4 hover:underline"
                  >
                    v{v.versionNumber}
                    {v.isActive ? "（当前）" : ""}
                  </Link>
                  <span className="text-muted-foreground">
                    {v.startsOn} → {v.endsOn} · {v.createdReason}
                  </span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
