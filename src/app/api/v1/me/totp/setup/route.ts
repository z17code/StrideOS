import { requireUser, jsonError, jsonOk } from "@/lib/auth/guards";
import { assertSameOrigin } from "@/lib/security/request";
import {
  beginTotpSetup,
  isTotpError,
} from "@/lib/auth/totp-service";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function POST(request: Request) {
  const originCheck = assertSameOrigin(request);
  if (!originCheck.ok) {
    return jsonError(originCheck.status, originCheck.code, originCheck.message);
  }

  const auth = await requireUser();
  if (auth.error) return auth.error;

  try {
    const setup = await beginTotpSetup(auth.user.id, auth.user.username);
    return jsonOk({
      secret: setup.secret,
      otpauthUrl: setup.otpauthUrl,
      qrDataUrl: setup.qrDataUrl,
    });
  } catch (err) {
    if (isTotpError(err)) {
      return jsonError(400, err.code, err.message);
    }
    console.error("[me/totp/setup]", err);
    return jsonError(500, "TOTP_SETUP_FAILED", "无法开始绑定验证器");
  }
}
