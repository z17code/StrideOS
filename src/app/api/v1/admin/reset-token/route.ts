import { eq } from "drizzle-orm";
import { db } from "@/db";
import { passwordResetTokens, users } from "@/db/schema";
import { generateToken, hashToken } from "@/lib/auth/tokens";
import { jsonCreated, jsonError, requireAdmin } from "@/lib/auth/guards";
import { adminCreateResetTokenSchema } from "@/lib/validators/auth";

/**
 * Admin generates a one-time password reset token for a user.
 * POST /api/v1/admin/reset-token
 * Returns the plaintext token once (not stored).
 */
export async function POST(request: Request) {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError(400, "INVALID_JSON", "请求体必须是 JSON");
  }

  const parsed = adminCreateResetTokenSchema.safeParse(body);
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

  const token = generateToken(32);
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + expiresInHours * 60 * 60 * 1000);

  await db.insert(passwordResetTokens).values({
    userId,
    tokenHash,
    expiresAt,
    createdByAdminId: auth.user.id,
  });

  return jsonCreated({
    token,
    expiresAt,
    username: target.username,
    message: "请将此令牌安全地交给用户，令牌仅显示一次",
  });
}
