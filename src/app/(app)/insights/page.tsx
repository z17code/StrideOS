import { requireOnboardedUser } from "@/lib/auth/onboarding-gate";
import { InsightTabs } from "./insight-tabs";

export const dynamic = "force-dynamic";

export default async function InsightsPage() {
  const { user } = await requireOnboardedUser();

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">洞察</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          完成率、负荷趋势与周报
        </p>
      </div>
      <InsightTabs userId={user.id} />
    </div>
  );
}
