import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import {
  createSession,
  setSessionCookie,
} from "@/lib/auth/session";
import {
  deletePending2faToken,
  findPending2faToken,
  verifyUserTotpOrBackup,
} from "@/lib/auth/totp-service";
import { jsonError, jsonOk, type ApiErrorBody } from "@/lib/auth/guards";
import { login2faSchema } from "@/lib/validators/auth";
import {
  assertSameOrigin,
  getClientIp,
  ipBucketKey,
  readJsonBody,
  usernameBucketKey,
} from "@/lib/security/request";
import {
  LOGIN_IP_POLICY,
  LOGIN_USER_POLICY,
  TOTP_VERIFY_POLICY,
  checkRateLimit,
  clearRateLimit,
  formatLockMessage,
  hitRateLimit,
  rateLimitHeaders,
  type RateLimitStatus,
} from "@/lib/security/rate-limit";

export const maxDuration = 30;
export const dynamic = "force-dynamic";

function lockedResponse(status: RateLimitStatus) {
  const body: ApiErrorBody = {
    error: {
      code: "TOO_MANY_ATTEMPTS",
      message: formatLockMessage(status.retryAfterSec),
      details: { retryAfterSec: status.retryAfterSec },
    },
  };
  return NextResponse.json(body, {
    status: 429,
    headers: rateLimitHeaders(status),
  });
}

/**
 * Complete 2FA after password step.
 * No Turnstile here: password step already challenged; waiting for CF
 * would burn the user's 30s TOTP window.
 */
export async function POST(request: Request) {
  const originCheck = assertSameOrigin(request);
  if (!originCheck.ok) {
    return jsonError(originCheck.status, originCheck.code, originCheck.message);
  }

  const bodyResult = await readJsonBody(request);
  if (!bodyResult.ok) {
    return jsonError(bodyResult.status, bodyResult.code, bodyResult.message);
  }

  const parsed = login2faSchema.safeParse(bodyResult.data);
  if (!parsed.success) {
    return jsonError(400, "VALIDATION_ERROR", "参数校验失败", parsed.error.flatten());
  }

  const ip = getClientIp(request);
  const ipKey = ipBucketKey("login", ip);
  const totpKey = ipBucketKey("totp", ip);

  try {
    const [ipStatus, totpStatus] = await Promise.all([
      checkRateLimit(ipKey, LOGIN_IP_POLICY),
      checkRateLimit(totpKey, TOTP_VERIFY_POLICY),
    ]);
    if (!ipStatus.allowed) return lockedResponse(ipStatus);
    if (!totpStatus.allowed) return lockedResponse(totpStatus);

    const { pendingToken, code } = parsed.data;
    const pending = await findPending2faToken(pendingToken);
    if (!pending) {
      const after = await hitRateLimit(totpKey, TOTP_VERIFY_POLICY);
      if (!after.allowed) return lockedResponse(after);
      return jsonError(
        401,
        "PENDING_EXPIRED",
        "二次验证已过期，请重新登录",
      );
    }

    const ok = await verifyUserTotpOrBackup(pending.userId, code);
    if (!ok) {
      const [afterIp, afterTotp] = await Promise.all([
        hitRateLimit(ipKey, LOGIN_IP_POLICY),
        hitRateLimit(totpKey, TOTP_VERIFY_POLICY),
      ]);
      if (!afterIp.allowed) return lockedResponse(afterIp);
      if (!afterTotp.allowed) return lockedResponse(afterTotp);
      return jsonError(401, "INVALID_2FA", "验证码或备份码错误");
    }

    await deletePending2faToken(pending.id);

    const row = await db
      .select({
        id: users.id,
        username: users.username,
        role: users.role,
        isActive: users.isActive,
      })
      .from(users)
      .where(eq(users.id, pending.userId))
      .limit(1);

    const user = row[0];
    if (!user || !user.isActive) {
      return jsonError(403, "ACCOUNT_DISABLED", "账号已被停用，请联系管理员");
    }

    const userKey = usernameBucketKey("login", user.username);
    await Promise.all([
      clearRateLimit(ipKey),
      clearRateLimit(userKey),
      clearRateLimit(totpKey),
    ]);

    const token = await createSession(user.id);
    await setSessionCookie(token);

    try {
      await db
        .update(users)
        .set({ lastLoginAt: new Date() })
        .where(eq(users.id, user.id));
    } catch (stampErr) {
      console.error("[auth/login/2fa] lastLoginAt stamp failed", stampErr);
    }

    return jsonOk({
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
      },
    });
  } catch (err) {
    console.error("[auth/login/2fa]", err);
    return jsonError(500, "LOGIN_2FA_FAILED", "登录服务异常，请稍后重试");
  }
}
