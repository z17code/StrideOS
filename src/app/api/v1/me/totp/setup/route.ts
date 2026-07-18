import { requireUser, jsonError, jsonOk } from "@/lib/auth/guards";
import { assertSameOrigin, readJsonBody } from "@/lib/security/request";
import { totpSetupSchema } from "@/lib/validators/auth";
import {
  beginTotpSetup,
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

  let name: string | undefined;
  const bodyResult = await readJsonBody(request);
  if (bodyResult.ok) {
    const parsed = totpSetupSchema.safeParse(bodyResult.data ?? {});
    if (!parsed.success) {
      return jsonError(
        400,
        "VALIDATION_ERROR",
        firstZodMessage(parsed.error),
        parsed.error.flatten(),
      );
    }
    name = parsed.data.name;
  } else if (bodyResult.code !== "INVALID_JSON") {
    // Empty body from older clients is treated as no name; other errors propagate.
    return jsonError(bodyResult.status, bodyResult.code, bodyResult.message);
  }

  try {
    const setup = await beginTotpSetup(
      auth.user.id,
      auth.user.username,
      name,
    );
    return jsonOk({
      secret: setup.secret,
      otpauthUrl: setup.otpauthUrl,
      qrDataUrl: setup.qrDataUrl,
      name: setup.name,
    });
  } catch (err) {
    if (isTotpError(err)) {
      return jsonError(400, err.code, err.message);
    }
    console.error("[me/totp/setup]", err);
    return jsonError(500, "TOTP_SETUP_FAILED", "无法开始绑定验证器");
  }
}
