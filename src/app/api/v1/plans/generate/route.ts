import { jsonCreated, jsonError, requireUser } from "@/lib/auth/guards";
import { todayInShanghai } from "@/lib/datetime";
import {
  generateAndPersistPlan,
  mapPlanVersion,
} from "@/lib/plans/service";
import { PlanEngineError } from "@/lib/plans/types";
import { generatePlanSchema } from "@/lib/validators/planning";

export async function POST(request: Request) {
  const auth = await requireUser();
  if (auth.error) return auth.error;

  let body: unknown = {};
  try {
    const text = await request.text();
    if (text) body = JSON.parse(text);
  } catch {
    return jsonError(400, "INVALID_JSON", "请求体必须是 JSON");
  }

  const parsed = generatePlanSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(
      400,
      "VALIDATION_ERROR",
      "参数校验失败",
      parsed.error.flatten(),
    );
  }

  // Capture once for retries / consistency
  const generationDate = todayInShanghai();

  try {
    const { version, workouts, generated } = await generateAndPersistPlan(
      auth.user.id,
      parsed.data.reason,
      generationDate,
    );

    return jsonCreated({
      plan: mapPlanVersion(version, workouts),
      warnings: generated.warnings,
      completionMode: generated.completionMode,
    });
  } catch (err) {
    if (err instanceof PlanEngineError) {
      const status =
        err.code === "PLAN_WINDOW_INVALID"
          ? 422
          : err.code === "ONBOARDING_REQUIRED" || err.code === "NO_ACTIVE_GOAL"
            ? 400
            : 400;
      return jsonError(status, err.code, err.message, err.details);
    }
    throw err;
  }
}
