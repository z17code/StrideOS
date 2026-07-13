import { jsonCreated, jsonError, requireUser } from "@/lib/auth/guards";
import { mapProposal, proposeAdjustment } from "@/lib/adjustments/service";
import { proposeAdjustmentSchema } from "@/lib/validators/adjustment";

export async function POST(request: Request) {
  const auth = await requireUser();
  if (auth.error) return auth.error;

  let body: unknown = {};
  try {
    const text = await request.text();
    if (text) body = JSON.parse(text);
  } catch {
    return jsonError(400, "INVALID_JSON", "请求体必须是 JSON");
  }

  const parsed = proposeAdjustmentSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(
      400,
      "VALIDATION_ERROR",
      "参数校验失败",
      parsed.error.flatten(),
    );
  }

  const result = await proposeAdjustment(auth.user.id, parsed.data.reason);
  if ("error" in result && result.error) {
    if (result.error === "NO_ADJUSTMENT_NEEDED") {
      return Response.json(
        {
          proposal: null,
          proposals: [],
          warnings: "warnings" in result ? result.warnings : [],
          message: result.message,
        },
        { status: 200 },
      );
    }
    return jsonError(400, result.error, result.message);
  }

  return jsonCreated({
    proposal: mapProposal(result.proposal!),
    proposals: result.proposals,
    warnings: result.warnings,
  });
}
