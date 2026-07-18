import { jsonOk, requireUser } from "@/lib/auth/guards";
import { listActiveAnnouncements } from "@/lib/announcements/service";

export const dynamic = "force-dynamic";

/** GET /api/v1/announcements — active published notices for logged-in users */
export async function GET() {
  const auth = await requireUser();
  if (auth.error) return auth.error;

  const items = await listActiveAnnouncements();
  return jsonOk({ announcements: items });
}
