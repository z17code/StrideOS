/**
 * Admin audit log helper — best-effort; never throw into request path.
 */
import { desc } from "drizzle-orm";
import { db } from "@/db";
import { adminAuditLogs } from "@/db/schema";
import type { SessionUser } from "@/lib/auth/session";

export type AdminAuditAction =
  | "user.update"
  | "user.disable"
  | "user.enable"
  | "user.delete"
  | "user.kick_sessions"
  | "reset_token.create"
  | "reset_token.invalidate"
  | "invite.create"
  | "invite.delete"
  | "invite.clear"
  | "rate_limit.clear";

export async function logAdminAction(input: {
  admin: Pick<SessionUser, "id" | "username">;
  action: AdminAuditAction | string;
  targetType?: string | null;
  targetId?: string | null;
  summary?: string | null;
  metadata?: Record<string, unknown> | null;
}): Promise<void> {
  try {
    await db.insert(adminAuditLogs).values({
      adminId: input.admin.id,
      adminUsername: input.admin.username,
      action: input.action,
      targetType: input.targetType ?? null,
      targetId: input.targetId ?? null,
      summary: input.summary ?? null,
      metadata: input.metadata ?? null,
    });
  } catch (err) {
    console.error("[admin-audit] write failed", err);
  }
}

export async function listAdminAuditLogs(limit = 100) {
  const n = Math.min(Math.max(limit, 1), 200);
  return db
    .select({
      id: adminAuditLogs.id,
      adminId: adminAuditLogs.adminId,
      adminUsername: adminAuditLogs.adminUsername,
      action: adminAuditLogs.action,
      targetType: adminAuditLogs.targetType,
      targetId: adminAuditLogs.targetId,
      summary: adminAuditLogs.summary,
      metadata: adminAuditLogs.metadata,
      createdAt: adminAuditLogs.createdAt,
    })
    .from(adminAuditLogs)
    .orderBy(desc(adminAuditLogs.createdAt))
    .limit(n);
}
