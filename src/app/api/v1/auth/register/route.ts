import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import { inviteCodes, users } from "@/db/schema";
import { hashPassword } from "@/lib/auth/password";
import {
  createSession,
  setSessionCookie,
} from "@/lib/auth/session";
import { jsonCreated, jsonError } from "@/lib/auth/guards";
import { registerSchema } from "@/lib/validators/auth";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError(400, "INVALID_JSON", "请求体必须是 JSON");
  }

  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(400, "VALIDATION_ERROR", "参数校验失败", parsed.error.flatten());
  }

  const { inviteCode, username, password } = parsed.data;
  const code = inviteCode.trim().toUpperCase();

  const invite = await db.query.inviteCodes.findFirst({
    where: and(eq(inviteCodes.code, code), isNull(inviteCodes.usedByUserId)),
  });

  if (!invite) {
    return jsonError(400, "INVALID_INVITE", "邀请码无效或已被使用");
  }

  if (invite.expiresAt && invite.expiresAt < new Date()) {
    return jsonError(400, "INVITE_EXPIRED", "邀请码已过期");
  }

  const existing = await db.query.users.findFirst({
    where: eq(users.username, username),
  });
  if (existing) {
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

    // Re-check invite inside transaction
    const [claimed] = await tx
      .update(inviteCodes)
      .set({
        usedByUserId: user.id,
        usedAt: new Date(),
      })
      .where(
        and(eq(inviteCodes.id, invite.id), isNull(inviteCodes.usedByUserId)),
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
    return jsonError(400, "INVALID_INVITE", "邀请码无效或已被使用");
  }

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
