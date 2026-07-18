import { requireUser, jsonError, jsonOk } from "@/lib/auth/guards";
import { assertSameOrigin, readJsonBody } from "@/lib/security/request";
import { totpCodeSchema } from "@/lib/validators/auth";
import { disableTotp, isTotpError } from "@/lib/auth/totp-service";
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
    await disableTotp(auth.user.id, parsed.data.code);
    return jsonOk({ enabled: false });
  } catch (err) {
    if (isTotpError(err)) {
      return jsonError(400, err.code, err.message);
    }
    console.error("[me/totp/disable]", err);
    return jsonError(500, "TOTP_DISABLE_FAILED", "无法关闭二次验证");
  }
}
