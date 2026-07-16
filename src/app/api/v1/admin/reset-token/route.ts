import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import { passwordResetTokens, users } from "@/db/schema";
import { generateToken, hashToken } from "@/lib/auth/tokens";
import { jsonCreated, jsonError, jsonOk, requireAdmin } from "@/lib/auth/guards";
import { logAdminAction } from "@/lib/admin/audit";
import { adminCreateResetTokenSchema } from "@/lib/validators/auth";
import { assertSameOrigin, readJsonBody } from "@/lib/security/request";

export const dynamic = "force-dynamic";

function buildResetLinks(request: Request, token: string) {
  const path = `/reset-password?token=${encodeURIComponent(token)}`;
  let absolute: string | null = null;
  const candidates = [
    process.env.APP_URL,
    process.env.NEXT_PUBLIC_APP_URL,
    process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : undefined,
  ];
  for (const raw of candidates) {
    if (!raw) continue;
    try {
      const base = new URL(raw.includes("://") ? raw : `https://${raw}`);
      absolute = new URL(path, base.origin).toString();
      break;
    } catch {
      // ignore
    }
  }
  if (!absolute) {
    try {
      absolute = new URL(path, new URL(request.url).origin).toString();
    } catch {
      absolute = null;
    }
  }
  return { resetPath: path, resetUrl: absolute };
}

/**
 * Admin generates a one-time password reset token for a user.
 * POST /api/v1/admin/reset-token
 * Returns the plaintext token once (not stored). Prior unused tokens for the user are invalidated.
 */
export async function POST(request: Request) {
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

  const parsed = adminCreateResetTokenSchema.safeParse(bodyResult.data);
  if (!parsed.success) {
    return jsonError(400, "VALIDATION_ERROR", "参数校验失败", parsed.error.flatten());
  }

  const { userId, expiresInHours } = parsed.data;

  const target = await db.query.users.findFirst({
    where: eq(users.id, userId),
  });
  if (!target) {
    return jsonError(404, "NOT_FOUND", "用户不存在");
  }

  const now = new Date();
  const token = generateToken(32);
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + expiresInHours * 60 * 60 * 1000);

  // Invalidate previous unused tokens for this user.
  await db
    .update(passwordResetTokens)
    .set({ usedAt: now })
    .where(
      and(
        eq(passwordResetTokens.userId, userId),
        isNull(passwordResetTokens.usedAt),
      ),
    );

  await db.insert(passwordResetTokens).values({
    userId,
    tokenHash,
    expiresAt,
    createdByAdminId: auth.user.id,
  });

  const links = buildResetLinks(request, token);

  await logAdminAction({
    admin: auth.user,
    action: "reset_token.create",
    targetType: "user",
    targetId: userId,
    summary: `为 ${target.username} 生成重置令牌`,
    metadata: { username: target.username, expiresInHours },
  });

  return jsonCreated({
    token,
    expiresAt,
    username: target.username,
    resetPath: links.resetPath,
    resetUrl: links.resetUrl,
    message: "请将此令牌或链接安全地交给用户，令牌仅显示一次；此前未使用的令牌已作废",
  });
}

/**
 * Invalidate all unused reset tokens for a user.
 * DELETE /api/v1/admin/reset-token  body: { userId }
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

  const userId =
    typeof bodyResult.data === "object" &&
    bodyResult.data &&
    "userId" in bodyResult.data
      ? String((bodyResult.data as { userId: unknown }).userId)
      : "";

  if (!userId || !/^[0-9a-f-]{36}$/i.test(userId)) {
    return jsonError(400, "VALIDATION_ERROR", "需要有效的 userId");
  }

  const target = await db.query.users.findFirst({
    where: eq(users.id, userId),
  });
  if (!target) {
    return jsonError(404, "NOT_FOUND", "用户不存在");
  }

  const now = new Date();
  const updated = await db
    .update(passwordResetTokens)
    .set({ usedAt: now })
    .where(
      and(
        eq(passwordResetTokens.userId, userId),
        isNull(passwordResetTokens.usedAt),
      ),
    )
    .returning({ id: passwordResetTokens.id });

  await logAdminAction({
    admin: auth.user,
    action: "reset_token.invalidate",
    targetType: "user",
    targetId: userId,
    summary: `作废 ${target.username} 的未用重置令牌（${updated.length}）`,
    metadata: { username: target.username, count: updated.length },
  });

  return jsonOk({ ok: true, invalidated: updated.length, username: target.username });
}
