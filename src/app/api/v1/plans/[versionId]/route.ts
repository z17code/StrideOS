import { jsonError, jsonOk, requireUser } from "@/lib/auth/guards";
import {
  activatePlanVersion,
  deletePlanVersion,
  getPlanVersion,
  mapPlanVersion,
  patchPlanVersion,
} from "@/lib/plans/service";
import { updatePlanVersionSchema } from "@/lib/validators/planning";

type Ctx = { params: Promise<{ versionId: string }> };

export async function GET(_request: Request, { params }: Ctx) {
  const auth = await requireUser();
  if (auth.error) return auth.error;

  const { versionId } = await params;
  const plan = await getPlanVersion(auth.user.id, versionId);
  if (!plan) {
    return jsonError(404, "NOT_FOUND", "计划版本不存在");
  }

  return jsonOk({ plan: mapPlanVersion(plan.version, plan.workouts) });
}

export async function PATCH(request: Request, { params }: Ctx) {
  const auth = await requireUser();
  if (auth.error) return auth.error;

  const { versionId } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError(400, "INVALID_JSON", "请求体必须是 JSON");
  }

  const parsed = updatePlanVersionSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(
      400,
      "VALIDATION_ERROR",
      "参数校验失败",
      parsed.error.flatten(),
    );
  }

  const updated = await patchPlanVersion(auth.user.id, versionId, parsed.data);
  if (!updated) {
    return jsonError(404, "NOT_FOUND", "计划版本不存在");
  }

  return jsonOk({ plan: mapPlanVersion(updated) });
}

export async function POST(request: Request, { params }: Ctx) {
  const auth = await requireUser();
  if (auth.error) return auth.error;

  const { versionId } = await params;
  const activated = await activatePlanVersion(auth.user.id, versionId);
  if (!activated) {
    return jsonError(404, "NOT_FOUND", "计划版本不存在");
  }
  return jsonOk({ plan: mapPlanVersion(activated) });
}

export async function DELETE(_request: Request, { params }: Ctx) {
  const auth = await requireUser();
  if (auth.error) return auth.error;

  const { versionId } = await params;
  const deleted = await deletePlanVersion(auth.user.id, versionId);
  if (!deleted) {
    return jsonError(404, "NOT_FOUND", "计划版本不存在");
  }
  return jsonOk({ ok: true });
}
