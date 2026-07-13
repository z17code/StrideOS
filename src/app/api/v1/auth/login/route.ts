import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { verifyPassword } from "@/lib/auth/password";
import {
  createSession,
  setSessionCookie,
} from "@/lib/auth/session";
import { jsonError, jsonOk } from "@/lib/auth/guards";
import { loginSchema } from "@/lib/validators/auth";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError(400, "INVALID_JSON", "请求体必须是 JSON");
  }

  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(400, "VALIDATION_ERROR", "参数校验失败", parsed.error.flatten());
  }

  const { username, password } = parsed.data;

  const user = await db.query.users.findFirst({
    where: eq(users.username, username),
  });

  if (!user) {
    return jsonError(401, "INVALID_CREDENTIALS", "用户名或密码错误");
  }

  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) {
    return jsonError(401, "INVALID_CREDENTIALS", "用户名或密码错误");
  }

  if (!user.isActive) {
    return jsonError(403, "ACCOUNT_DISABLED", "账号已被停用，请联系管理员");
  }

  const token = await createSession(user.id);
  await setSessionCookie(token);

  return jsonOk({
    user: {
      id: user.id,
      username: user.username,
      role: user.role,
    },
  });
}
