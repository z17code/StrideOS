import { and, eq, isNull } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { inviteCodes, users } from "@/db/schema";
import { hashPassword } from "@/lib/auth/password";
import {
  createSession,
  setSessionCookie,
} from "@/lib/auth/session";
import { jsonCreated, jsonError, type ApiErrorBody } from "@/lib/auth/guards";
import { isInviteConsumed } from "@/lib/auth/invite-status";
import { registerSchema } from "@/lib/validators/auth";
import { verifyTurnstileToken } from "@/lib/security/turnstile";
import { firstZodMessage } from "@/lib/validators/format";
import {
  assertSameOrigin,
  getClientIp,
  ipBucketKey,
  readJsonBody,
} from "@/lib/security/request";
import {
  REGISTER_IP_POLICY,
  checkRateLimit,
  clearRateLimit,
  formatLockMessage,
  hitRateLimit,
  rateLimitHeaders,
  type RateLimitStatus,
} from "@/lib/security/rate-limit";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

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

  const parsed = registerSchema.safeParse(bodyResult.data);
  if (!parsed.success) {
    return jsonError(
      400,
      "VALIDATION_ERROR",
      firstZodMessage(parsed.error),
      parsed.error.flatten(),
    );
  }

  const ip = getClientIp(request);
  const ipKey = ipBucketKey("register", ip);
  const ipStatus = await checkRateLimit(ipKey, REGISTER_IP_POLICY);
  if (!ipStatus.allowed) return lockedResponse(ipStatus);

  const turnstile = await verifyTurnstileToken(
    parsed.data.turnstileToken,
    request,
  );
  if (!turnstile.ok) {
    return jsonError(400, turnstile.code, turnstile.message);
  }

  const { inviteCode, username, password } = parsed.data;
  const code = inviteCode.trim().toUpperCase();

  const invite = await db.query.inviteCodes.findFirst({
    where: and(
      eq(inviteCodes.code, code),
      isNull(inviteCodes.usedAt),
      isNull(inviteCodes.usedByUserId),
    ),
  });

  if (!invite || isInviteConsumed(invite)) {
    const after = await hitRateLimit(ipKey, REGISTER_IP_POLICY);
    if (!after.allowed) return lockedResponse(after);
    return jsonError(400, "INVALID_INVITE", "邀请码无效或已被使用");
  }

  if (invite.expiresAt && invite.expiresAt < new Date()) {
    const after = await hitRateLimit(ipKey, REGISTER_IP_POLICY);
    if (!after.allowed) return lockedResponse(after);
    return jsonError(400, "INVITE_EXPIRED", "邀请码已过期");
  }

  const existing = await db.query.users.findFirst({
    where: eq(users.username, username),
  });
  if (existing) {
    // Username taken is not an invite brute-force signal; still soft-limit IP.
    const after = await hitRateLimit(ipKey, REGISTER_IP_POLICY);
    if (!after.allowed) return lockedResponse(after);
    return jsonError(409, "USERNAME_TAKEN", "用户名已被占用");
  }

  const passwordHash = await hashPassword(password);

  const result = await db.transaction(async (tx) => {
    const [user] = await tx
      .insert(users)
      .values({
        username,
        passwordHash,
        role: "user",
        isActive: true,
      })
      .returning();

    const [claimed] = await tx
      .update(inviteCodes)
      .set({
        usedByUserId: user.id,
        usedAt: new Date(),
      })
      .where(
        and(
          eq(inviteCodes.id, invite.id),
          isNull(inviteCodes.usedAt),
          isNull(inviteCodes.usedByUserId),
        ),
      )
      .returning();

    if (!claimed) {
      throw new Error("INVITE_RACE");
    }

    return user;
  }).catch((err: unknown) => {
    if (err instanceof Error && err.message === "INVITE_RACE") {
      return null;
    }
    throw err;
  });

  if (!result) {
    const after = await hitRateLimit(ipKey, REGISTER_IP_POLICY);
    if (!after.allowed) return lockedResponse(after);
    return jsonError(400, "INVALID_INVITE", "邀请码无效或已被使用");
  }

  await clearRateLimit(ipKey);

  const token = await createSession(result.id);
  await setSessionCookie(token);

  return jsonCreated({
    user: {
      id: result.id,
      username: result.username,
      role: result.role,
    },
  });
}
