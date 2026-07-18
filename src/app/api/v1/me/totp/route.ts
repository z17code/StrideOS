import { requireUser, jsonError, jsonOk } from "@/lib/auth/guards";
import { getTotpStatus } from "@/lib/auth/totp-service";

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requireUser();
  if (auth.error) return auth.error;

  try {
    const status = await getTotpStatus(auth.user.id);
    return jsonOk({
      enabled: status.enabled,
      enabledAt: status.enabledAt?.toISOString() ?? null,
    });
  } catch (err) {
    console.error("[me/totp GET]", err);
    return jsonError(500, "TOTP_STATUS_FAILED", "无法读取二次验证状态");
  }
}
