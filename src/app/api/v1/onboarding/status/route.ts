import { jsonOk, requireUser } from "@/lib/auth/guards";
import { getActiveGoal, getProfileForUser, mapProfile } from "@/lib/plans/service";

export async function GET() {
  const auth = await requireUser();
  if (auth.error) return auth.error;

  const profile = await getProfileForUser(auth.user.id);
  const goal = await getActiveGoal(auth.user.id);

  return jsonOk({
    completed: Boolean(profile?.onboardingCompletedAt),
    skipped: Boolean(profile?.onboardingSkippedAt),
    hasActiveGoal: Boolean(goal),
    profile: profile ? mapProfile(profile) : null,
  });
}
