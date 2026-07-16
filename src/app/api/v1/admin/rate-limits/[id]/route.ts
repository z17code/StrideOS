import { jsonError, jsonOk, requireAdmin } from "@/lib/auth/guards";
import { logAdminAction } from "@/lib/admin/audit";
import { clearRateLimitById } from "@/lib/security/rate-limit";
import { assertSameOrigin } from "@/lib/security/request";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

/** DELETE /api/v1/admin/rate-limits/:id */
export async function DELETE(_request: Request, { params }: Params) {
  const originCheck = assertSameOrigin(_request);
  if (!originCheck.ok) {
    return jsonError(originCheck.status, originCheck.code, originCheck.message);
  }

  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  const { id } = await params;
  const ok = await clearRateLimitById(id);
  if (!ok) {
    return jsonError(404, "NOT_FOUND", "限流记录不存在");
  }

  await logAdminAction({
    admin: auth.user,
    action: "rate_limit.clear",
    targetType: "rate_limit",
    targetId: id,
    summary: "清除限流/锁定",
  });

  return jsonOk({ ok: true });
}
