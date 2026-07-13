import { jsonCreated, jsonError, jsonOk, requireUser } from "@/lib/auth/guards";
import { createGoal, listGoals, mapGoal } from "@/lib/plans/service";
import { createGoalSchema } from "@/lib/validators/planning";

export async function GET() {
  const auth = await requireUser();
  if (auth.error) return auth.error;

  const goals = await listGoals(auth.user.id);
  return jsonOk({ goals: goals.map(mapGoal) });
}

export async function POST(request: Request) {
  const auth = await requireUser();
  if (auth.error) return auth.error;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError(400, "INVALID_JSON", "请求体必须是 JSON");
  }

  const parsed = createGoalSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(
      400,
      "VALIDATION_ERROR",
      "参数校验失败",
      parsed.error.flatten(),
    );
  }

  const goal = await createGoal(auth.user.id, parsed.data);
  return jsonCreated({ goal: mapGoal(goal) });
}
