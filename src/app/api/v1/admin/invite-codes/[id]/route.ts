import { eq } from "drizzle-orm";
import { db } from "@/db";
import { inviteCodes } from "@/db/schema";
import { jsonError, jsonOk, requireAdmin } from "@/lib/auth/guards";
import { logAdminAction } from "@/lib/admin/audit";
import { assertSameOrigin } from "@/lib/security/request";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

/**
 * Hard-delete any invite code (used or unused).
 * Removes the row so the code string can never be used to register.
 */
export async function DELETE(request: Request, { params }: Params) {
  const originCheck = assertSameOrigin(request);
  if (!originCheck.ok) {
    return jsonError(originCheck.status, originCheck.code, originCheck.message);
  }

  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  const { id } = await params;

  const existing = await db.query.inviteCodes.findFirst({
    where: eq(inviteCodes.id, id),
  });
  if (!existing) {
    return jsonError(404, "NOT_FOUND", "邀请码不存在");
  }

  await db.delete(inviteCodes).where(eq(inviteCodes.id, id));

  await logAdminAction({
    admin: auth.user,
    action: "invite.delete",
    targetType: "invite_code",
    targetId: id,
    summary: `删除邀请码 ${existing.code}`,
    metadata: { code: existing.code },
  });

  return jsonOk({ ok: true });
}
