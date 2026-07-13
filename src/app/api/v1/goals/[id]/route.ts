import { jsonError, jsonOk, requireUser } from "@/lib/auth/guards";
import { deleteGoal, mapGoal, updateGoal } from "@/lib/plans/service";
import { updateGoalSchema } from "@/lib/validators/planning";

type Params = { params: Promise<{ id: string }> };

export async function PUT(request: Request, { params }: Params) {
  const auth = await requireUser();
  if (auth.error) return auth.error;

  const { id } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError(400, "INVALID_JSON", "请求体必须是 JSON");
  }

  const parsed = updateGoalSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(
      400,
      "VALIDATION_ERROR",
      "参数校验失败",
      parsed.error.flatten(),
    );
  }

  const updated = await updateGoal(auth.user.id, id, parsed.data);
  if (!updated) {
    return jsonError(404, "NOT_FOUND", "目标不存在");
  }
  return jsonOk({ goal: mapGoal(updated) });
}

export async function DELETE(_request: Request, { params }: Params) {
  const auth = await requireUser();
  if (auth.error) return auth.error;

  const { id } = await params;
  const deleted = await deleteGoal(auth.user.id, id);
  if (!deleted) {
    return jsonError(404, "NOT_FOUND", "目标不存在");
  }
  return jsonOk({ ok: true });
}
