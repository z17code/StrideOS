import { jsonError, jsonOk, requireUser } from "@/lib/auth/guards";
import {
  deleteStrategy,
  getStrategy,
  mapStrategy,
} from "@/lib/strategy/service";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_request: Request, ctx: Ctx) {
  const auth = await requireUser();
  if (auth.error) return auth.error;

  const { id } = await ctx.params;
  const row = await getStrategy(auth.user.id, id);
  if (!row) {
    return jsonError(404, "NOT_FOUND", "比赛策略不存在");
  }
  return jsonOk({ strategy: mapStrategy(row) });
}

export async function DELETE(_request: Request, ctx: Ctx) {
  const auth = await requireUser();
  if (auth.error) return auth.error;

  const { id } = await ctx.params;
  const deleted = await deleteStrategy(auth.user.id, id);
  if (!deleted) {
    return jsonError(404, "NOT_FOUND", "比赛策略不存在");
  }
  return jsonOk({ ok: true });
}
