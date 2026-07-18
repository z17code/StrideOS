import { requireUser, jsonError, jsonOk } from "@/lib/auth/guards";
import { assertSameOrigin, readJsonBody } from "@/lib/security/request";
import { totpCodeSchema } from "@/lib/validators/auth";
import {
  confirmTotpSetup,
  isTotpError,
} from "@/lib/auth/totp-service";
import { firstZodMessage } from "@/lib/validators/format";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function POST(request: Request) {
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

  const parsed = totpCodeSchema.safeParse(bodyResult.data);
  if (!parsed.success) {
    return jsonError(
      400,
      "VALIDATION_ERROR",
      firstZodMessage(parsed.error),
      parsed.error.flatten(),
    );
  }

  try {
    const result = await confirmTotpSetup(auth.user.id, parsed.data.code);
    return jsonOk({
      enabled: true,
      backupCodes: result.backupCodes,
    });
  } catch (err) {
    if (isTotpError(err)) {
      return jsonError(400, err.code, err.message);
    }
    console.error("[me/totp/confirm]", err);
    return jsonError(500, "TOTP_CONFIRM_FAILED", "无法确认二次验证");
  }
}
