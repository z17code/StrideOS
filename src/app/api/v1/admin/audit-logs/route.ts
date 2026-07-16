import { jsonOk, requireAdmin } from "@/lib/auth/guards";
import { listAdminAuditLogs } from "@/lib/admin/audit";

export const dynamic = "force-dynamic";

/** GET /api/v1/admin/audit-logs */
export async function GET(request: Request) {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  const url = new URL(request.url);
  const limit = Number(url.searchParams.get("limit") ?? "100");
  const logs = await listAdminAuditLogs(Number.isFinite(limit) ? limit : 100);
  return jsonOk({ logs });
}
