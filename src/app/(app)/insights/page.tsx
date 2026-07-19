import { requireOnboardedUser } from "@/lib/auth/onboarding-gate";
import { InsightTabs } from "./insight-tabs";

export const dynamic = "force-dynamic";

export default async function InsightsPage() {
  const { user } = await requireOnboardedUser();

  return (
    <div className="page-shell-wide">
      <div className="page-header-row">
        <div className="page-header">
          <p className="page-eyebrow">INSIGHTS</p>
          <h1 className="page-title">洞察</h1>
          <p className="page-subtitle">
            完成率、负荷趋势与周报，电脑端更适合对照数据
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="metric-chip">周报</span>
          <span className="metric-chip">月报</span>
          <span className="metric-chip">趋势</span>
        </div>
      </div>
      <InsightTabs userId={user.id} />
    </div>
  );
}
