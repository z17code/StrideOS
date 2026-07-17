import { requireOnboardedUser } from "@/lib/auth/onboarding-gate";
import { InsightTabs } from "./insight-tabs";

export const dynamic = "force-dynamic";

export default async function InsightsPage() {
  const { user } = await requireOnboardedUser();

  return (
    <div className="page-shell">
      <div className="page-header">
        <p className="page-eyebrow">INSIGHTS</p>
        <h1 className="page-title">洞察</h1>
        <p className="page-subtitle">
          完成率、负荷趋势与周报
        </p>
      </div>
      <InsightTabs userId={user.id} />
    </div>
  );
}

