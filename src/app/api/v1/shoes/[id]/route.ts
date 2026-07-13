import { jsonError, jsonOk, requireUser } from "@/lib/auth/guards";
import {
  deleteShoe,
  getShoe,
  mapShoe,
  updateShoe,
} from "@/lib/shoes/service";
import { updateShoeSchema } from "@/lib/validators/shoe";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_request: Request, ctx: Ctx) {
  const auth = await requireUser();
  if (auth.error) return auth.error;

  const { id } = await ctx.params;
  const shoe = await getShoe(auth.user.id, id);
  if (!shoe) {
    return jsonError(404, "NOT_FOUND", "跑鞋不存在");
  }
  return jsonOk({ shoe: mapShoe(shoe) });
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

  const parsed = updateShoeSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(
      400,
      "VALIDATION_ERROR",
      "参数校验失败",
      parsed.error.flatten(),
    );
  }

  const updated = await updateShoe(auth.user.id, id, parsed.data);
  if (!updated) {
    return jsonError(404, "NOT_FOUND", "跑鞋不存在");
  }
  return jsonOk({ shoe: mapShoe(updated) });
}

export async function DELETE(_request: Request, ctx: Ctx) {
  const auth = await requireUser();
  if (auth.error) return auth.error;

  const { id } = await ctx.params;
  const deleted = await deleteShoe(auth.user.id, id);
  if (!deleted) {
    return jsonError(404, "NOT_FOUND", "跑鞋不存在");
  }
  return jsonOk({ ok: true });
}
