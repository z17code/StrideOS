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
      authenticators: status.authenticators.map((a) => ({
        id: a.id,
        name: a.name,
        createdAt: a.createdAt.toISOString(),
        lastUsedAt: a.lastUsedAt?.toISOString() ?? null,
      })),
      maxAuthenticators: 5,
    });
  } catch (err) {
    console.error("[me/totp GET]", err);
    return jsonError(500, "TOTP_STATUS_FAILED", "无法读取二次验证状态");
  }
}
