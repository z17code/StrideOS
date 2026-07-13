import Link from "next/link";
import { requireOnboardedUser } from "@/lib/auth/onboarding-gate";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const dynamic = "force-dynamic";

const TOOLS = [
  {
    href: "/tools/race",
    title: "比赛策略",
    description: "VDOT 计算 · 训练配速 · 负分割分段",
  },
  {
    href: "/tools/shoes",
    title: "跑鞋管理",
    description: "记录跑鞋 · 累计里程 · 退役提醒",
  },
  {
    href: "/tools/strength",
    title: "力量训练",
    description: "核心 / 髋部 / 小腿 / 平衡 / 活动度",
  },
] as const;

export default async function ToolsPage() {
  await requireOnboardedUser();
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">工具</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          跑鞋、力量与比赛策略
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {TOOLS.map((t) => (
          <Link key={t.href} href={t.href} className="block">
            <Card className="h-full transition-colors hover:bg-muted/40">
              <CardHeader>
                <CardTitle>{t.title}</CardTitle>
                <CardDescription>{t.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <span className="text-xs text-muted-foreground">进入 →</span>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
