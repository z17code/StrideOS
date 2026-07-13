import { jsonOk, requireUser } from "@/lib/auth/guards";
import { listPlanVersions, mapPlanVersion } from "@/lib/plans/service";

export async function GET() {
  const auth = await requireUser();
  if (auth.error) return auth.error;

  const versions = await listPlanVersions(auth.user.id);
  return jsonOk({
    plans: versions.map((v) => mapPlanVersion(v)),
  });
}
