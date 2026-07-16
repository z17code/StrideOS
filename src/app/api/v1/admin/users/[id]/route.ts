import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { permanentlyDeleteUser, isDeleteAccountError } from "@/lib/auth/delete-account";
import { destroyAllUserSessions } from "@/lib/auth/session";
import { jsonError, jsonOk, requireAdmin } from "@/lib/auth/guards";
import { logAdminAction } from "@/lib/admin/audit";
import { getAdminUserDetail } from "@/lib/admin/users";
import { assertSameOrigin, readJsonBody } from "@/lib/security/request";
import {
  adminDeleteUserSchema,
  adminUpdateUserSchema,
} from "@/lib/validators/auth";

type Params = { params: Promise<{ id: string }> };

export const dynamic = "force-dynamic";

/** GET /api/v1/admin/users/:id — read-only support summary */
export async function GET(_request: Request, { params }: Params) {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  const { id } = await params;
  const detail = await getAdminUserDetail(id);
  if (!detail) {
    return jsonError(404, "NOT_FOUND", "用户不存在");
  }
  return jsonOk(detail);
}

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

  if (parsed.data.username && parsed.data.username !== target.username) {
    const taken = await db.query.users.findFirst({
      where: eq(users.username, parsed.data.username),
    });
    if (taken) {
      return jsonError(409, "USERNAME_TAKEN", "用户名已被占用");
    }
  }

  const [updated] = await db
    .update(users)
    .set({
      ...(parsed.data.isActive !== undefined
        ? { isActive: parsed.data.isActive }
        : {}),
      ...(parsed.data.username !== undefined
        ? { username: parsed.data.username }
        : {}),
      ...(parsed.data.adminNote !== undefined
        ? { adminNote: parsed.data.adminNote }
        : {}),
    })
    .where(eq(users.id, id))
    .returning({
      id: users.id,
      username: users.username,
      adminNote: users.adminNote,
      role: users.role,
      isActive: users.isActive,
      lastLoginAt: users.lastLoginAt,
      createdAt: users.createdAt,
    });

  if (parsed.data.isActive === false) {
    await destroyAllUserSessions(id);
  }

  const actions: string[] = [];
  if (parsed.data.isActive === false) actions.push("user.disable");
  if (parsed.data.isActive === true) actions.push("user.enable");
  if (parsed.data.username !== undefined) actions.push("user.update");
  if (parsed.data.adminNote !== undefined) actions.push("user.update");
  if (actions.length === 0) actions.push("user.update");

  await logAdminAction({
    admin: auth.user,
    action: actions[0]!,
    targetType: "user",
    targetId: id,
    summary: `更新用户 ${updated.username}`,
    metadata: {
      isActive: parsed.data.isActive,
      username: parsed.data.username,
      adminNote: parsed.data.adminNote,
    },
  });

  return jsonOk({ user: updated });
}

/** Permanently delete a user and all related data (admin). */
export async function DELETE(request: Request, { params }: Params) {
  const originCheck = assertSameOrigin(request);
  if (!originCheck.ok) {
    return jsonError(originCheck.status, originCheck.code, originCheck.message);
  }

  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  const { id } = await params;

  const bodyResult = await readJsonBody(request);
  if (!bodyResult.ok) {
    return jsonError(bodyResult.status, bodyResult.code, bodyResult.message);
  }

  const parsed = adminDeleteUserSchema.safeParse(bodyResult.data);
  if (!parsed.success) {
    return jsonError(
      400,
      "VALIDATION_ERROR",
      "请完整输入确认文案后再注销",
      parsed.error.flatten(),
    );
  }

  try {
    const result = await permanentlyDeleteUser(id, {
      actingAdminId: auth.user.id,
    });
    await logAdminAction({
      admin: auth.user,
      action: "user.delete",
      targetType: "user",
      targetId: id,
      summary: `永久注销 ${result.deletedUsername}`,
      metadata: { username: result.deletedUsername },
    });
    return jsonOk({ ok: true, deletedUsername: result.deletedUsername });
  } catch (err) {
    if (isDeleteAccountError(err)) {
      const status =
        err.code === "NOT_FOUND"
          ? 404
          : err.code === "LAST_ADMIN" || err.code === "CANNOT_DELETE_SELF"
            ? 409
            : 400;
      return jsonError(status, err.code, err.message);
    }
    console.error("[admin users DELETE] unexpected", err);
    return jsonError(500, "INTERNAL_ERROR", "注销失败，请稍后重试");
  }
}

