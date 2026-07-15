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

/** Give Neon cold-start a bit more room on Vercel serverless. */
export const maxDuration = 30;
export const dynamic = "force-dynamic";

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

  try {
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
  } catch (err) {
    console.error("[auth/login]", err);
    const message = err instanceof Error ? err.message : String(err);

    if (/DATABASE_URL is not set/i.test(message)) {
      return jsonError(503, "DB_NOT_CONFIGURED", "服务端数据库未配置，请联系管理员");
    }

    // Postgres: undefined_column (42703) after schema drift (e.g. admin_note).
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
