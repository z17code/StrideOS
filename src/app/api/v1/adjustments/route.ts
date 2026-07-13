import { jsonOk, requireUser } from "@/lib/auth/guards";
import { listProposals, mapProposal } from "@/lib/adjustments/service";

export async function GET() {
  const auth = await requireUser();
  if (auth.error) return auth.error;

  const rows = await listProposals(auth.user.id);
  return jsonOk({ adjustments: rows.map(mapProposal) });
}
