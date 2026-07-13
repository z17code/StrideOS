import { jsonError, jsonOk, requireUser } from "@/lib/auth/guards";
import {
  deleteStrengthSession,
  getStrengthSession,
  mapStrengthSession,
  updateStrengthSession,
} from "@/lib/strength/service";
import { updateStrengthSchema } from "@/lib/validators/strength";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_request: Request, ctx: Ctx) {
  const auth = await requireUser();
  if (auth.error) return auth.error;

  const { id } = await ctx.params;
  const session = await getStrengthSession(auth.user.id, id);
  if (!session) {
    return jsonError(404, "NOT_FOUND", "力量训练记录不存在");
  }
  return jsonOk({ session: mapStrengthSession(session) });
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

  const parsed = updateStrengthSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(
      400,
      "VALIDATION_ERROR",
      "参数校验失败",
      parsed.error.flatten(),
    );
  }

  const updated = await updateStrengthSession(auth.user.id, id, parsed.data);
  if (!updated) {
    return jsonError(404, "NOT_FOUND", "力量训练记录不存在");
  }
  return jsonOk({ session: mapStrengthSession(updated) });
}

export async function DELETE(_request: Request, ctx: Ctx) {
  const auth = await requireUser();
  if (auth.error) return auth.error;

  const { id } = await ctx.params;
  const deleted = await deleteStrengthSession(auth.user.id, id);
  if (!deleted) {
    return jsonError(404, "NOT_FOUND", "力量训练记录不存在");
  }
  return jsonOk({ ok: true });
}
