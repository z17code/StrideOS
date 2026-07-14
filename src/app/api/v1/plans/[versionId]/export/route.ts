import { jsonError, requireUser } from "@/lib/auth/guards";
import { getPlanVersion, mapPlanVersion } from "@/lib/plans/service";
import {
  buildPlanIcs,
  buildPlanMarkdown,
  buildPlanPrintHtml,
  type ExportPlan,
} from "@/lib/plans/export";

type Ctx = { params: Promise<{ versionId: string }> };

export async function GET(request: Request, { params }: Ctx) {
  const auth = await requireUser();
  if (auth.error) return auth.error;

  const { versionId } = await params;
  const plan = await getPlanVersion(auth.user.id, versionId);
  if (!plan) {
    return jsonError(404, "NOT_FOUND", "计划版本不存在");
  }

  const mapped = mapPlanVersion(plan.version, plan.workouts);
  const exportPlan: ExportPlan = {
    versionNumber: mapped.versionNumber,
    label: mapped.label ?? null,
    startsOn: mapped.startsOn,
    endsOn: mapped.endsOn,
    totalWeeks: mapped.totalWeeks,
    workouts: (mapped.workouts ?? []).map((w) => ({
      scheduledDate: w.scheduledDate,
      workoutType: w.workoutType,
      phase: w.phase,
      distanceKm: w.distanceKm,
      durationMin: w.durationMin,
      targetRpe: w.targetRpe,
      targetPaceMinKm: w.targetPaceMinKm,
      targetPaceMaxKm: w.targetPaceMaxKm,
      isQuality: w.isQuality,
      notes: w.notes,
    })),
  };

  const url = new URL(request.url);
  const format = (url.searchParams.get("format") ?? "ics").toLowerCase();
  const baseName = `strideos-plan-v${exportPlan.versionNumber}`;

  if (format === "md" || format === "markdown") {
    const body = buildPlanMarkdown(exportPlan);
    return new Response(body, {
      status: 200,
      headers: {
        "Content-Type": "text/markdown; charset=utf-8",
        "Content-Disposition": `attachment; filename="${baseName}.md"`,
      },
    });
  }

  if (format === "pdf" || format === "print" || format === "html") {
    const body = buildPlanPrintHtml(exportPlan);
    return new Response(body, {
      status: 200,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
      },
    });
  }

  const body = buildPlanIcs(exportPlan);
  return new Response(body, {
    status: 200,
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="${baseName}.ics"`,
    },
  });
}