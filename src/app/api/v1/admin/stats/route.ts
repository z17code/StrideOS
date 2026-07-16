import { jsonOk, requireAdmin } from "@/lib/auth/guards";
import { getAdminDashboardStats } from "@/lib/admin/stats";

export const dynamic = "force-dynamic";

/** GET /api/v1/admin/stats — dashboard KPIs */
export async function GET() {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  const stats = await getAdminDashboardStats();
  return jsonOk({ stats });
}
