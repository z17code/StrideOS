import { Suspense } from "react";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth/session";
import { todayInShanghai, formatDurationSec } from "@/lib/datetime";
import {
  getActiveGoal,
  getActivePlan,
  getProfileForUser,
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
import { Button } from "@/components/ui/button";
import { WeeklyCalendar, type PlanDto } from "@/components/training/weekly-calendar";
import { GeneratePlanButton } from "@/components/training/generate-plan-button";
import { VersionHistoryList } from "@/components/training/plan-version-history";
import { PlanExportButtons } from "@/components/training/plan-export-buttons";

export const dynamic = "force-dynamic";

export default async function PlanPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role === "admin") redirect("/admin");

  const profile = await getProfileForUser(user.id);
  const showOnboardingPrompt = !profile?.onboardingCompletedAt;
  const active = await getActivePlan(user.id);
  const goal = await getActiveGoal(user.id);
  const versions = await listPlanVersions(user.id);
  const today = todayInShanghai();

  const planDto: PlanDto | null = active
    ? (mapPlanVersion(active.version, active.workouts) as PlanDto)
    : null;

  return (
    <div className="page-shell-wide">
      <div className="space-y-3">
        <div className="page-header">
          <p className="page-eyebrow">PLAN</p>
          <h1 className="page-title">计划</h1>
          <p className="page-subtitle">
            周历课表 · 版本 v{planDto?.versionNumber ?? "—"}
          </p>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-start">
          {showOnboardingPrompt && (
            <Link href="/onboarding" className="block">
              <Button variant="outline" className="w-full sm:w-auto">
                去填写问卷
              </Button>
            </Link>
          )}
          <GeneratePlanButton
            label={planDto ? "重新生成" : "生成计划"}
            reason={planDto ? "regenerate" : "manual"}
            className="min-w-0"
          />
          {planDto && <PlanExportButtons versionId={planDto.id} />}
        </div>
        {showOnboardingPrompt && (
          <p className="text-xs text-muted-foreground">
            请先完成入门问卷以生成个性化计划
          </p>
        )}
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
            <CardDescription>切换、重命名或删除历史版本</CardDescription>
          </CardHeader>
          <CardContent>
            <VersionHistoryList versions={versions} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}

