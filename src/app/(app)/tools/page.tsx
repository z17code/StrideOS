import { requireOnboardedUser } from "@/lib/auth/onboarding-gate";

export const dynamic = "force-dynamic";

export default async function ToolsPage() {
  await requireOnboardedUser();
  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-xl font-semibold tracking-tight">工具</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        力量、跑鞋与比赛策略将在 Phase 4 提供
      </p>
    </div>
  );
}
