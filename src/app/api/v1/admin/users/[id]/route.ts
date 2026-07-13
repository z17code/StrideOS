import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import {
  destroyAllUserSessions,
} from "@/lib/auth/session";
import { jsonError, jsonOk, requireAdmin } from "@/lib/auth/guards";
import { adminUpdateUserSchema } from "@/lib/validators/auth";

type Params = { params: Promise<{ id: string }> };

export async function PUT(request: Request, { params }: Params) {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  const { id } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError(400, "INVALID_JSON", "请求体必须是 JSON");
  }

  const parsed = adminUpdateUserSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(400, "VALIDATION_ERROR", "参数校验失败", parsed.error.flatten());
  }

  if (id === auth.user.id && parsed.data.isActive === false) {
    return jsonError(400, "CANNOT_DISABLE_SELF", "不能停用自己的账号");
  }

  const target = await db.query.users.findFirst({
    where: eq(users.id, id),
  });
  if (!target) {
    return jsonError(404, "NOT_FOUND", "用户不存在");
  }

  const [updated] = await db
    .update(users)
    .set({
      ...(parsed.data.isActive !== undefined
        ? { isActive: parsed.data.isActive }
        : {}),
    })
    .where(eq(users.id, id))
    .returning({
      id: users.id,
      username: users.username,
      role: users.role,
      isActive: users.isActive,
    });

  if (parsed.data.isActive === false) {
    await destroyAllUserSessions(id);
  }

  return jsonOk({ user: updated });
}
