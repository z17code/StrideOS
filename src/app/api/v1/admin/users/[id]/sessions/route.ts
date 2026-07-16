import { eq } from "drizzle-orm";
import { db } from "@/db";
import { sessions, users } from "@/db/schema";
import { destroyAllUserSessions } from "@/lib/auth/session";
import { jsonError, jsonOk, requireAdmin } from "@/lib/auth/guards";
import { logAdminAction } from "@/lib/admin/audit";
import { assertSameOrigin } from "@/lib/security/request";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

/** DELETE /api/v1/admin/users/:id/sessions — force logout all sessions */
export async function DELETE(request: Request, { params }: Params) {
  const originCheck = assertSameOrigin(request);
  if (!originCheck.ok) {
    return jsonError(originCheck.status, originCheck.code, originCheck.message);
  }

  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  const { id } = await params;
  const target = await db.query.users.findFirst({
    where: eq(users.id, id),
  });
  if (!target) {
    return jsonError(404, "NOT_FOUND", "用户不存在");
  }

  const before = await db
    .select({ id: sessions.id })
    .from(sessions)
    .where(eq(sessions.userId, id));

  await destroyAllUserSessions(id);

  await logAdminAction({
    admin: auth.user,
    action: "user.kick_sessions",
    targetType: "user",
    targetId: id,
    summary: `踢下线 ${target.username}（${before.length} 个会话）`,
    metadata: { username: target.username, sessionCount: before.length },
  });

  return jsonOk({ ok: true, destroyed: before.length, username: target.username });
}

