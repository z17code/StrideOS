import { jsonError, jsonOk, requireUser } from "@/lib/auth/guards";
import { buildMonthlyReport } from "@/lib/reports/service";
import { monthlyReportSchema } from "@/lib/validators/report";

export async function GET(request: Request) {
  const auth = await requireUser();
  if (auth.error) return auth.error;

  const url = new URL(request.url);
  const parsed = monthlyReportSchema.safeParse({
    month: url.searchParams.get("month") ?? undefined,
  });
  if (!parsed.success) {
    return jsonError(
      400,
      "VALIDATION_ERROR",
      "参数校验失败",
      parsed.error.flatten(),
    );
  }

  const report = await buildMonthlyReport(auth.user.id, parsed.data.month);
  return jsonOk({ report });
}
