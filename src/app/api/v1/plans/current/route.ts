import { jsonError, jsonOk, requireUser } from "@/lib/auth/guards";
import {
  getActiveGoal,
  getActivePlan,
  getProfileForUser,
  mapGoal,
  mapPlanVersion,
  mapProfile,
} from "@/lib/plans/service";

export async function GET() {
  const auth = await requireUser();
  if (auth.error) return auth.error;

  const plan = await getActivePlan(auth.user.id);
  if (!plan) {
    return jsonError(404, "PLAN_NOT_FOUND", "当前没有活跃计划");
  }

  const goal = await getActiveGoal(auth.user.id);
  const profile = await getProfileForUser(auth.user.id);

  return jsonOk({
    plan: mapPlanVersion(plan.version, plan.workouts),
    activeGoal: goal ? mapGoal(goal) : null,
    profile: profile ? mapProfile(profile) : null,
  });
}
