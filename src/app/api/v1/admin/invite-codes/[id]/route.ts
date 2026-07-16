import { eq } from "drizzle-orm";
import { db } from "@/db";
import { inviteCodes } from "@/db/schema";
import { jsonError, jsonOk, requireAdmin } from "@/lib/auth/guards";
import { isInviteConsumed } from "@/lib/auth/invite-status";

type Params = { params: Promise<{ id: string }> };

export async function DELETE(_request: Request, { params }: Params) {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  const { id } = await params;

  const existing = await db.query.inviteCodes.findFirst({
    where: eq(inviteCodes.id, id),
  });
  if (!existing) {
    return jsonError(404, "NOT_FOUND", "邀请码不存在");
  }
  if (isInviteConsumed(existing)) {
    return jsonError(400, "ALREADY_USED", "已使用的邀请码无法撤销");
  }

  await db.delete(inviteCodes).where(eq(inviteCodes.id, id));
  return jsonOk({ ok: true });
}
