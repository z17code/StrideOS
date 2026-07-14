import { jsonError, jsonOk, requireUser } from "@/lib/auth/guards";
import { completeOnboarding, mapGoal, mapProfile, skipOnboarding } from "@/lib/plans/service";
import { onboardingCompleteSchema } from "@/lib/validators/planning";

export async function POST(request: Request) {
  const auth = await requireUser();
  if (auth.error) return auth.error;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError(400, "INVALID_JSON", "请求体必须是 JSON");
  }

  const skip = (body as Record<string, unknown>).skip === true;

  if (skip) {
    const profile = await skipOnboarding(auth.user.id);
    return jsonOk({
      skipped: true,
      profile: mapProfile(profile),
    });
  }

  const parsed = onboardingCompleteSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(
      400,
      "VALIDATION_ERROR",
      "参数校验失败",
      parsed.error.flatten(),
    );
  }

  const { profile, goal } = await completeOnboarding(auth.user.id, parsed.data);

  return jsonOk({
    skipped: false,
    profile: mapProfile(profile),
    goal: mapGoal(goal),
  });
}
