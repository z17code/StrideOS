import { requireUser, jsonError, jsonOk } from "@/lib/auth/guards";
import { assertSameOrigin, readJsonBody } from "@/lib/security/request";
import {
  totpRemoveAuthenticatorSchema,
  totpRenameSchema,
} from "@/lib/validators/auth";
import {
  isTotpError,
  removeAuthenticator,
  renameAuthenticator,
} from "@/lib/auth/totp-service";
import { firstZodMessage } from "@/lib/validators/format";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

type RouteCtx = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, ctx: RouteCtx) {
  const originCheck = assertSameOrigin(request);
  if (!originCheck.ok) {
    return jsonError(originCheck.status, originCheck.code, originCheck.message);
  }

  const auth = await requireUser();
  if (auth.error) return auth.error;

  const { id } = await ctx.params;
  if (!id) {
    return jsonError(400, "VALIDATION_ERROR", "缺少验证器 id");
  }

  const bodyResult = await readJsonBody(request);
  if (!bodyResult.ok) {
    return jsonError(bodyResult.status, bodyResult.code, bodyResult.message);
  }

  const parsed = totpRenameSchema.safeParse(bodyResult.data);
  if (!parsed.success) {
    return jsonError(
      400,
      "VALIDATION_ERROR",
      firstZodMessage(parsed.error),
      parsed.error.flatten(),
    );
  }

  try {
    const row = await renameAuthenticator(auth.user.id, id, parsed.data.name);
    return jsonOk({
      authenticator: {
        id: row.id,
        name: row.name,
        createdAt: row.createdAt.toISOString(),
        lastUsedAt: row.lastUsedAt?.toISOString() ?? null,
      },
    });
  } catch (err) {
    if (isTotpError(err)) {
      const status = err.code === "NOT_FOUND" ? 404 : 400;
      return jsonError(status, err.code, err.message);
    }
    console.error("[me/totp/authenticators PATCH]", err);
    return jsonError(500, "TOTP_RENAME_FAILED", "无法重命名验证器");
  }
}

export async function DELETE(request: Request, ctx: RouteCtx) {
  const originCheck = assertSameOrigin(request);
  if (!originCheck.ok) {
    return jsonError(originCheck.status, originCheck.code, originCheck.message);
  }

  const auth = await requireUser();
  if (auth.error) return auth.error;

  const { id } = await ctx.params;
  if (!id) {
    return jsonError(400, "VALIDATION_ERROR", "缺少验证器 id");
  }

  const bodyResult = await readJsonBody(request);
  if (!bodyResult.ok) {
    return jsonError(bodyResult.status, bodyResult.code, bodyResult.message);
  }

  const parsed = totpRemoveAuthenticatorSchema.safeParse(bodyResult.data);
  if (!parsed.success) {
    return jsonError(
      400,
      "VALIDATION_ERROR",
      firstZodMessage(parsed.error),
      parsed.error.flatten(),
    );
  }

  try {
    const result = await removeAuthenticator(
      auth.user.id,
      id,
      parsed.data.code,
    );
    return jsonOk({ enabled: result.enabled, removedId: id });
  } catch (err) {
    if (isTotpError(err)) {
      const status = err.code === "NOT_FOUND" ? 404 : 400;
      return jsonError(status, err.code, err.message);
    }
    console.error("[me/totp/authenticators DELETE]", err);
    return jsonError(500, "TOTP_REMOVE_FAILED", "无法移除验证器");
  }
}