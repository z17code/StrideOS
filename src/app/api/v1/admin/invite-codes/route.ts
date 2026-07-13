import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { inviteCodes } from "@/db/schema";
import { generateToken } from "@/lib/auth/tokens";
import { jsonCreated, jsonError, jsonOk, requireAdmin } from "@/lib/auth/guards";
import { createInviteCodeSchema } from "@/lib/validators/auth";

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
    .limit(100);

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
  const expiresAt = parsed.data.expiresInDays
    ? new Date(Date.now() + parsed.data.expiresInDays * 24 * 60 * 60 * 1000)
    : null;

  const values = Array.from({ length: count }, () => ({
    code: makeInviteCode(),
    createdByAdminId: auth.user.id,
    expiresAt,
  }));

  const created = await db.insert(inviteCodes).values(values).returning();

  return jsonCreated({ inviteCodes: created });
}
