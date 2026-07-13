import { jsonError, jsonOk, requireUser } from "@/lib/auth/guards";
import {
  deleteActivity,
  getActivity,
  mapActivity,
  updateActivity,
} from "@/lib/activities/service";
import { updateActivitySchema } from "@/lib/validators/activity";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_request: Request, ctx: Ctx) {
  const auth = await requireUser();
  if (auth.error) return auth.error;

  const { id } = await ctx.params;
  const activity = await getActivity(auth.user.id, id);
  if (!activity) {
    return jsonError(404, "NOT_FOUND", "训练记录不存在");
  }
  return jsonOk({ activity: mapActivity(activity) });
}

export async function PUT(request: Request, ctx: Ctx) {
  const auth = await requireUser();
  if (auth.error) return auth.error;

  const { id } = await ctx.params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError(400, "INVALID_JSON", "请求体必须是 JSON");
  }

  const parsed = updateActivitySchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(
      400,
      "VALIDATION_ERROR",
      "参数校验失败",
      parsed.error.flatten(),
    );
  }

  const updated = await updateActivity(auth.user.id, id, parsed.data);
  if (!updated) {
    return jsonError(404, "NOT_FOUND", "训练记录不存在");
  }
  return jsonOk({ activity: mapActivity(updated) });
}

export async function DELETE(_request: Request, ctx: Ctx) {
  const auth = await requireUser();
  if (auth.error) return auth.error;

  const { id } = await ctx.params;
  const deleted = await deleteActivity(auth.user.id, id);
  if (!deleted) {
    return jsonError(404, "NOT_FOUND", "训练记录不存在");
  }
  return jsonOk({ ok: true });
}
