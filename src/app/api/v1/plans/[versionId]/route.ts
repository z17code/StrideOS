import { jsonError, jsonOk, requireUser } from "@/lib/auth/guards";
import { getPlanVersion, mapPlanVersion } from "@/lib/plans/service";

type Params = { params: Promise<{ versionId: string }> };

export async function GET(_request: Request, { params }: Params) {
  const auth = await requireUser();
  if (auth.error) return auth.error;

  const { versionId } = await params;
  const plan = await getPlanVersion(auth.user.id, versionId);
  if (!plan) {
    return jsonError(404, "NOT_FOUND", "计划版本不存在");
  }

  return jsonOk({ plan: mapPlanVersion(plan.version, plan.workouts) });
}
