import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { verifyPassword } from "@/lib/auth/password";
import {
  createSession,
  setSessionCookie,
} from "@/lib/auth/session";
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

/** Give Neon cold-start a bit more room on Vercel serverless. */
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

    // Select only auth fields so a missing optional column (e.g. admin_note
    // before migration 0004) cannot take down login.
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

    const user = row[0];
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

    await Promise.all([clearRateLimit(ipKey), clearRateLimit(userKey)]);

    const token = await createSession(user.id);
    await setSessionCookie(token);

    return jsonOk({
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
      return jsonError(503, "DB_NOT_CONFIGURED", "服务端数据库未配置，请联系管理员");
    }

    if (
      /column .* does not exist|undefined_column|42703/i.test(message)
    ) {
      return jsonError(
        503,
        "DB_SCHEMA_OUTDATED",
        "数据库结构未同步，请管理员对生产库执行 npm run db:migrate",
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
        "数据库暂时不可用（可能冷启动），请几秒后重试",
      );
    }

    return jsonError(500, "LOGIN_FAILED", "登录服务异常，请稍后重试");
  }
}
