import { jsonError, jsonOk, requireUser } from "@/lib/auth/guards";
import { buildWeeklyReport } from "@/lib/reports/service";
import { weeklyReportSchema } from "@/lib/validators/report";

export async function GET(request: Request) {
  const auth = await requireUser();
  if (auth.error) return auth.error;

  const url = new URL(request.url);
  const parsed = weeklyReportSchema.safeParse({
    weekStart: url.searchParams.get("weekStart") ?? undefined,
  });
  if (!parsed.success) {
    return jsonError(
      400,
      "VALIDATION_ERROR",
      "参数校验失败",
      parsed.error.flatten(),
    );
  }

  const report = await buildWeeklyReport(
    auth.user.id,
    parsed.data.weekStart,
  );
  return jsonOk({ report });
}
