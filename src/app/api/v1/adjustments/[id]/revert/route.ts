import { jsonError, jsonOk, requireUser } from "@/lib/auth/guards";
import { mapProposal, revertProposal } from "@/lib/adjustments/service";
import { mapPlanVersion } from "@/lib/plans/service";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(_request: Request, ctx: Ctx) {
  const auth = await requireUser();
  if (auth.error) return auth.error;

  const { id } = await ctx.params;
  const result = await revertProposal(auth.user.id, id);

  if ("error" in result && result.error) {
    const status = result.error === "NOT_FOUND" ? 404 : 400;
    return jsonError(status, result.error, result.message);
  }

  return jsonOk({
    proposal: mapProposal(result.proposal!),
    plan: result.version ? mapPlanVersion(result.version) : null,
  });
}
