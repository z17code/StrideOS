import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { inviteCodes } from "@/db/schema";
import { generateToken } from "@/lib/auth/tokens";
import { jsonCreated, jsonError, jsonOk, requireAdmin } from "@/lib/auth/guards";
import { logAdminAction } from "@/lib/admin/audit";
import { createInviteCodeSchema } from "@/lib/validators/auth";
import { assertSameOrigin, readJsonBody } from "@/lib/security/request";

export const dynamic = "force-dynamic";

function makeInviteCode(): string {
  // Short readable code: 8 chars base64url uppercased, no padding
  return generateToken(6).toUpperCase().replace(/[^A-Z0-9]/g, "X").slice(0, 8);
}

export async function GET() {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  const codes = await db
    .select()
    .from(inviteCodes)
    .orderBy(desc(inviteCodes.createdAt))
    .limit(200);

  return jsonOk({ inviteCodes: codes });
}

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  let body: unknown = {};
  try {
    const text = await request.text();
    if (text) body = JSON.parse(text);
  } catch {
    return jsonError(400, "INVALID_JSON", "请求体必须是 JSON");
  }

  const parsed = createInviteCodeSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(400, "VALIDATION_ERROR", "参数校验失败", parsed.error.flatten());
  }

  const count = parsed.data.count ?? 1;
  // null / undefined expiresInDays => no expiry; positive number => days from now
  const expiresInDays = parsed.data.expiresInDays;
  const expiresAt =
    expiresInDays == null
      ? null
      : new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000);

  const values = Array.from({ length: count }, () => ({
    code: makeInviteCode(),
    createdByAdminId: auth.user.id,
    expiresAt,
  }));

  const created = await db.insert(inviteCodes).values(values).returning();

  await logAdminAction({
    admin: auth.user,
    action: "invite.create",
    targetType: "invite_code",
    summary: `创建 ${created.length} 个邀请码`,
    metadata: {
      count: created.length,
      expiresInDays: expiresInDays ?? null,
      codes: created.map((c) => c.code),
    },
  });

  return jsonCreated({ inviteCodes: created });
}

/**
 * Hard-delete all invite codes (admin clear).
 * DELETE /api/v1/admin/invite-codes
 */
export async function DELETE(request: Request) {
  const originCheck = assertSameOrigin(request);
  if (!originCheck.ok) {
    return jsonError(originCheck.status, originCheck.code, originCheck.message);
  }

  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  const deleted = await db.delete(inviteCodes).returning({ id: inviteCodes.id });

  await logAdminAction({
    admin: auth.user,
    action: "invite.clear",
    targetType: "invite_code",
    summary: `一键清空邀请码（${deleted.length}）`,
    metadata: { deletedCount: deleted.length },
  });

  return jsonOk({ ok: true, deletedCount: deleted.length });
}
