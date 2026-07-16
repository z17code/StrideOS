import { eq } from "drizzle-orm";
import { db } from "@/db";
import { inviteCodes } from "@/db/schema";
import { jsonError, jsonOk, requireAdmin } from "@/lib/auth/guards";

type Params = { params: Promise<{ id: string }> };

/**
 * Hard-delete any invite code (used or unused).
 * Removes the row so the code string can never be used to register.
 */
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

  await db.delete(inviteCodes).where(eq(inviteCodes.id, id));
  return jsonOk({ ok: true });
}
