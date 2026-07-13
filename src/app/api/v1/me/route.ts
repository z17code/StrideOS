import { eq } from "drizzle-orm";
import { db } from "@/db";
import { runnerProfiles } from "@/db/schema";
import { jsonOk, requireUser } from "@/lib/auth/guards";
import { getActiveGoal, mapGoal, mapProfile } from "@/lib/plans/service";

export async function GET() {
  const auth = await requireUser();
  if (auth.error) return auth.error;

  const profile = await db.query.runnerProfiles.findFirst({
    where: eq(runnerProfiles.userId, auth.user.id),
  });
  const goal = await getActiveGoal(auth.user.id);

  return jsonOk({
    user: {
      id: auth.user.id,
      username: auth.user.username,
      email: auth.user.email,
      role: auth.user.role,
      createdAt: auth.user.createdAt,
    },
    profile: profile ? mapProfile(profile) : null,
    activeGoal: goal ? mapGoal(goal) : null,
  });
}
