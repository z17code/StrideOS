import { z } from "zod";
import { jsonError, jsonOk, requireAdmin } from "@/lib/auth/guards";
import { logAdminAction } from "@/lib/admin/audit";
import {
  clearRateLimit,
  clearRateLimitById,
  clearRateLimitsForUsername,
  listRateLimitBuckets,
} from "@/lib/security/rate-limit";
import { assertSameOrigin, readJsonBody } from "@/lib/security/request";

export const dynamic = "force-dynamic";

/** GET /api/v1/admin/rate-limits */
export async function GET() {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  const now = new Date();
  const rows = await listRateLimitBuckets(200);
  const rateLimits = rows.map((r) => ({
    id: r.id,
    bucket: r.bucket,
    hits: r.hits,
    windowStart: r.windowStart,
    lockedUntil: r.lockedUntil,
    updatedAt: r.updatedAt,
    isLocked: Boolean(r.lockedUntil && r.lockedUntil > now),
  }));

  return jsonOk({ rateLimits });
}

const clearSchema = z
  .object({
    id: z.string().uuid().optional(),
    bucket: z.string().min(1).max(200).optional(),
    username: z.string().min(1).max(64).optional(),
  })
  .refine((v) => Boolean(v.id || v.bucket || v.username), {
    message: "需要 id、bucket 或 username 之一",
  });

/**
 * DELETE /api/v1/admin/rate-limits
 * body: { id } | { bucket } | { username }
 */
export async function DELETE(request: Request) {
  const originCheck = assertSameOrigin(request);
  if (!originCheck.ok) {
    return jsonError(originCheck.status, originCheck.code, originCheck.message);
  }

  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  const bodyResult = await readJsonBody(request);
  if (!bodyResult.ok) {
    return jsonError(bodyResult.status, bodyResult.code, bodyResult.message);
  }

  const parsed = clearSchema.safeParse(bodyResult.data);
  if (!parsed.success) {
    return jsonError(400, "VALIDATION_ERROR", "参数校验失败", parsed.error.flatten());
  }

  let deleted = 0;
  if (parsed.data.id) {
    deleted = (await clearRateLimitById(parsed.data.id)) ? 1 : 0;
  } else if (parsed.data.bucket) {
    await clearRateLimit(parsed.data.bucket);
    deleted = 1;
  } else if (parsed.data.username) {
    deleted = await clearRateLimitsForUsername(parsed.data.username);
  }

  await logAdminAction({
    admin: auth.user,
    action: "rate_limit.clear",
    targetType: "rate_limit",
    targetId: parsed.data.id ?? parsed.data.bucket ?? parsed.data.username ?? null,
    summary: `清除限流/锁定（${deleted}）`,
    metadata: parsed.data,
  });

  return jsonOk({ ok: true, deleted });
}
