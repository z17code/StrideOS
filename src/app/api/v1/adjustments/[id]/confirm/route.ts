import { jsonError, jsonOk, requireUser } from "@/lib/auth/guards";
import { confirmProposal, mapProposal } from "@/lib/adjustments/service";
import { mapPlanVersion } from "@/lib/plans/service";

type Ctx = { params: Promise<{ id: string }> };

export async function PUT(_request: Request, ctx: Ctx) {
  const auth = await requireUser();
  if (auth.error) return auth.error;

  const { id } = await ctx.params;
  const result = await confirmProposal(auth.user.id, id);

  if ("error" in result && result.error) {
    const status = result.error === "NOT_FOUND" ? 404 : 400;
    return jsonError(status, result.error, result.message);
  }

  return jsonOk({
    proposal: mapProposal(result.proposal!),
    plan: mapPlanVersion(result.version!),
  });
}
