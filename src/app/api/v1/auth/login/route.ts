import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { verifyPassword } from "@/lib/auth/password";
import {
  createSession,
  setSessionCookie,
} from "@/lib/auth/session";
import { createPending2faToken } from "@/lib/auth/totp-service";
import { jsonError, jsonOk, type ApiErrorBody } from "@/lib/auth/guards";
import { loginSchema } from "@/lib/validators/auth";
import {
  DUMMY_PASSWORD_HASH,
  assertSameOrigin,
  getClientIp,
  ipBucketKey,
  readJsonBody,
  usernameBucketKey,
} from "@/lib/security/request";
import {
  LOGIN_IP_POLICY,
  LOGIN_USER_POLICY,
  checkRateLimit,
  clearRateLimit,
  formatLockMessage,
  hitRateLimit,
  rateLimitHeaders,
  type RateLimitStatus,
} from "@/lib/security/rate-limit";
import { verifyTurnstileToken } from "@/lib/security/turnstile";

/** Give Neon cold-start a bit more room on Vercel serverless. */
export const maxDuration = 30;
export const dynamic = "force-dynamic";

type LoginUser = {
  id: string;
  username: string;
  passwordHash: string;
  role: (typeof users.$inferSelect)["role"];
  isActive: boolean;
  totpEnabled: boolean;
};

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

function isMissingColumnError(err: unknown): boolean {
  const message = err instanceof Error ? err.message : String(err);
  const code =
    typeof err === "object" && err && "code" in err
      ? String((err as { code?: unknown }).code)
      : "";
  return (
    code === "42703" ||
    /column .* does not exist|undefined_column|42703|字段 .* 不存在|列 .* 不存在/i.test(
      message,
    )
  );
}

/**
 * Load login fields. Prefer including totp_enabled; if the production DB has
 * not run migration 0007 yet, fall back so password login still works.
 */
async function loadLoginUser(username: string): Promise<LoginUser | undefined> {
  try {
    const row = await db
      .select({
        id: users.id,
        username: users.username,
        passwordHash: users.passwordHash,
        role: users.role,
        isActive: users.isActive,
        totpEnabled: users.totpEnabled,
      })
      .from(users)
      .where(eq(users.username, username))
      .limit(1);
    const u = row[0];
    if (!u) return undefined;
    return { ...u, totpEnabled: Boolean(u.totpEnabled) };
  } catch (err) {
    if (!isMissingColumnError(err)) throw err;
    console.error(
      "[auth/login] totp_enabled missing — run npm run db:migrate on production DATABASE_URL",
    );
    const row = await db
      .select({
        id: users.id,
        username: users.username,
        passwordHash: users.passwordHash,
        role: users.role,
        isActive: users.isActive,
      })
      .from(users)
      .where(eq(users.username, username))
      .limit(1);
    const u = row[0];
    if (!u) return undefined;
    return { ...u, totpEnabled: false };
  }
}

export async function POST(request: Request) {
  const originCheck = assertSameOrigin(request);
  if (!originCheck.ok) {
    return jsonError(originCheck.status, originCheck.code, originCheck.message);
  }

  const bodyResult = await readJsonBody(request);
  if (!bodyResult.ok) {
    return jsonError(bodyResult.status, bodyResult.code, bodyResult.message);
  }

  const parsed = loginSchema.safeParse(bodyResult.data);
  if (!parsed.success) {
    return jsonError(400, "VALIDATION_ERROR", "参数校验失败", parsed.error.flatten());
  }

  const turnstile = await verifyTurnstileToken(
    parsed.data.turnstileToken,
    request,
  );
  if (!turnstile.ok) {
    return jsonError(400, turnstile.code, turnstile.message);
  }

  const { username, password } = parsed.data;
  const ip = getClientIp(request);
  const ipKey = ipBucketKey("login", ip);
  const userKey = usernameBucketKey("login", username);

  try {
    const [ipStatus, userStatus] = await Promise.all([
      checkRateLimit(ipKey, LOGIN_IP_POLICY),
      checkRateLimit(userKey, LOGIN_USER_POLICY),
    ]);

    if (!ipStatus.allowed) return lockedResponse(ipStatus);
    if (!userStatus.allowed) return lockedResponse(userStatus);

    const user = await loadLoginUser(username);
    // Always verify (dummy hash if missing) to reduce username timing leaks.
    const valid = await verifyPassword(
      password,
      user?.passwordHash ?? DUMMY_PASSWORD_HASH,
    );

    if (!user || !valid) {
      const [afterIp, afterUser] = await Promise.all([
        hitRateLimit(ipKey, LOGIN_IP_POLICY),
        hitRateLimit(userKey, LOGIN_USER_POLICY),
      ]);
      if (!afterIp.allowed) return lockedResponse(afterIp);
      if (!afterUser.allowed) return lockedResponse(afterUser);
      return jsonError(401, "INVALID_CREDENTIALS", "用户名或密码错误");
    }

    if (!user.isActive) {
      await hitRateLimit(ipKey, LOGIN_IP_POLICY);
      return jsonError(403, "ACCOUNT_DISABLED", "账号已被停用，请联系管理员");
    }

    // Password OK — if 2FA enabled, hold full session until code verified.
    if (user.totpEnabled) {
      try {
        const pendingToken = await createPending2faToken(user.id);
        return jsonOk({
          requires2fa: true as const,
          pendingToken,
          // Do not clear login rate limits until 2FA succeeds.
        });
      } catch (pendingErr) {
        // pending_2fa table missing = schema not migrated; fail closed for 2FA users only.
        console.error("[auth/login] pending 2fa", pendingErr);
        return jsonError(
          503,
          "DB_SCHEMA_OUTDATED",
          "服务暂时不可用，请联系管理员",
        );
      }
    }

    await Promise.all([clearRateLimit(ipKey), clearRateLimit(userKey)]);

    const token = await createSession(user.id);
    await setSessionCookie(token);

    try {
      await db
        .update(users)
        .set({ lastLoginAt: new Date() })
        .where(eq(users.id, user.id));
    } catch (stampErr) {
      console.error("[auth/login] lastLoginAt stamp failed", stampErr);
    }

    return jsonOk({
      requires2fa: false as const,
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
      },
    });
  } catch (err) {
    console.error("[auth/login]", err);
    const message = err instanceof Error ? err.message : String(err);

    if (/DATABASE_URL is not set/i.test(message)) {
      return jsonError(503, "DB_NOT_CONFIGURED", "服务暂时不可用，请联系管理员");
    }

    if (isMissingColumnError(err)) {
      return jsonError(
        503,
        "DB_SCHEMA_OUTDATED",
        "服务暂时不可用，请联系管理员",
      );
    }

    if (
      /connect|timeout|ECONNREFUSED|ENOTFOUND|fetch failed|Connection terminated|sorry, too many clients|remaining connection slots|Neon|SSL/i.test(
        message,
      )
    ) {
      return jsonError(
        503,
        "DB_UNAVAILABLE",
        "服务暂时繁忙，请几秒后重试",
      );
    }

    return jsonError(500, "LOGIN_FAILED", "登录服务异常，请稍后重试");
  }
}
