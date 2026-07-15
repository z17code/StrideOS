import { eq } from "drizzle-orm";
import { db } from "@/db";
import { runnerProfiles } from "@/db/schema";
import {
  isDeleteAccountError,
  permanentlyDeleteUser,
} from "@/lib/auth/delete-account";
import { clearSessionCookie } from "@/lib/auth/session";
import { jsonError, jsonOk, requireUser } from "@/lib/auth/guards";
import { getActiveGoal, mapGoal, mapProfile } from "@/lib/plans/service";
import { assertSameOrigin, readJsonBody } from "@/lib/security/request";
import { deleteAccountSchema } from "@/lib/validators/auth";

export async function GET() {
  const auth = await requireUser();
  if (auth.error) return auth.error;

  const profile = await db.query.runnerProfiles.findFirst({
    where: eq(runnerProfiles.userId, auth.user.id),
  });
  const goal = await getActiveGoal(auth.user.id);

  return jsonOk({
    user: {
      id: auth.user.id,
      username: auth.user.username,
      email: auth.user.email,
      role: auth.user.role,
      createdAt: auth.user.createdAt,
    },
    profile: profile ? mapProfile(profile) : null,
    activeGoal: goal ? mapGoal(goal) : null,
  });
}

/** Self-serve permanent account deletion. Requires exact confirmation phrase. */
export async function DELETE(request: Request) {
  const originCheck = assertSameOrigin(request);
  if (!originCheck.ok) {
    return jsonError(originCheck.status, originCheck.code, originCheck.message);
  }

  const auth = await requireUser();
  if (auth.error) return auth.error;

  const bodyResult = await readJsonBody(request);
  if (!bodyResult.ok) {
    return jsonError(bodyResult.status, bodyResult.code, bodyResult.message);
  }

  const parsed = deleteAccountSchema.safeParse(bodyResult.data);
  if (!parsed.success) {
    return jsonError(
      400,
      "VALIDATION_ERROR",
      "请完整输入确认文案后再注销",
      parsed.error.flatten(),
    );
  }

  try {
    const result = await permanentlyDeleteUser(auth.user.id);
    // Session rows cascade-delete with the user; still clear the cookie.
    await clearSessionCookie();
    return jsonOk({ ok: true, deletedUsername: result.deletedUsername });
  } catch (err) {
    if (isDeleteAccountError(err)) {
      const status =
        err.code === "NOT_FOUND"
          ? 404
          : err.code === "LAST_ADMIN"
            ? 409
            : 400;
      return jsonError(status, err.code, err.message);
    }
    console.error("[me DELETE] unexpected", err);
    return jsonError(500, "INTERNAL_ERROR", "注销失败，请稍后重试");
  }
}
