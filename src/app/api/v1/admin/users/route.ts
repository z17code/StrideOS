import { jsonOk, requireAdmin } from "@/lib/auth/guards";
import {
  listAdminUsers,
  type AdminUserStatusFilter,
} from "@/lib/admin/users";

export const dynamic = "force-dynamic";

/** GET /api/v1/admin/users?q=&status=all|active|disabled|admin */
export async function GET(request: Request) {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  const url = new URL(request.url);
  const q = url.searchParams.get("q") ?? undefined;
  const statusRaw = url.searchParams.get("status") ?? "all";
  const allowed: AdminUserStatusFilter[] = ["all", "active", "disabled", "admin"];
  const status = allowed.includes(statusRaw as AdminUserStatusFilter)
    ? (statusRaw as AdminUserStatusFilter)
    : "all";

  const list = await listAdminUsers({ q, status });
  return jsonOk({ users: list });
}
