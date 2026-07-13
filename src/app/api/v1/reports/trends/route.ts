import { jsonError, jsonOk, requireUser } from "@/lib/auth/guards";
import { buildTrendReport } from "@/lib/reports/service";

export async function GET(request: Request) {
  const auth = await requireUser();
  if (auth.error) return auth.error;

  const url = new URL(request.url);
  const weeksRaw = url.searchParams.get("weeks");
  const weeks = weeksRaw ? Number(weeksRaw) : 8;
  if (!Number.isFinite(weeks) || weeks < 1 || weeks > 52) {
    return jsonError(400, "VALIDATION_ERROR", "weeks 须为 1–52");
  }

  const report = await buildTrendReport(auth.user.id, weeks);
  return jsonOk({ report });
}
