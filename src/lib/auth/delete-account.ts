import { and, count, eq, ne } from "drizzle-orm";
import { db } from "@/db";
import { inviteCodes, planVersions, users } from "@/db/schema";

export {
  ADMIN_DELETE_USER_CONFIRMATION,
  DELETE_ACCOUNT_CONFIRMATION,
} from "./delete-account-constants";

export type DeleteAccountErrorCode =
  | "NOT_FOUND"
  | "LAST_ADMIN"
  | "CANNOT_DELETE_SELF";

export class DeleteAccountError extends Error {
  constructor(
    public readonly code: DeleteAccountErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "DeleteAccountError";
  }
}

async function countAdmins(excludeUserId?: string): Promise<number> {
  const where = excludeUserId
    ? and(eq(users.role, "admin"), ne(users.id, excludeUserId))
    : eq(users.role, "admin");
  const [row] = await db
    .select({ n: count() })
    .from(users)
    .where(where);
  return Number(row?.n ?? 0);
}

/**
 * Permanently delete a user and all related training data.
 *
 * Order matters: `plan_versions.race_goal_id` is ON DELETE RESTRICT, so plans
 * must be removed before the user row (which would cascade-delete race goals).
 * Invite codes created by an admin are reassigned to another admin when possible.
 */
export async function permanentlyDeleteUser(
  userId: string,
  options?: { actingAdminId?: string },
): Promise<{ deletedUsername: string }> {
  const target = await db.query.users.findFirst({
    where: eq(users.id, userId),
  });
  if (!target) {
    throw new DeleteAccountError("NOT_FOUND", "用户不存在");
  }

  if (options?.actingAdminId && options.actingAdminId === userId) {
    throw new DeleteAccountError(
      "CANNOT_DELETE_SELF",
      "不能通过管理端注销自己的账号，请在「我的」中自助注销",
    );
  }

  if (target.role === "admin") {
    const otherAdmins = await countAdmins(userId);
    if (otherAdmins < 1) {
      throw new DeleteAccountError(
        "LAST_ADMIN",
        "不能注销唯一的管理员账号，请先创建其他管理员",
      );
    }
  }

  await db.transaction(async (tx) => {
    if (target.role === "admin") {
      const [otherAdmin] = await tx
        .select({ id: users.id })
        .from(users)
        .where(and(eq(users.role, "admin"), ne(users.id, userId)))
        .limit(1);

      if (otherAdmin) {
        await tx
          .update(inviteCodes)
          .set({ createdByAdminId: otherAdmin.id })
          .where(eq(inviteCodes.createdByAdminId, userId));
      }
    }

    // Break race_goals RESTRICT: remove plan trees first (workouts/adjustments cascade).
    await tx.delete(planVersions).where(eq(planVersions.userId, userId));

    await tx.delete(users).where(eq(users.id, userId));
  });

  return { deletedUsername: target.username };
}

export function isDeleteAccountError(err: unknown): err is DeleteAccountError {
  return err instanceof DeleteAccountError;
}
