import Link from "next/link";
import {
  Activity,
  Calculator,
  Dumbbell,
  Footprints,
  Gauge,
  Scale,
  type LucideIcon,
} from "lucide-react";
import { requireOnboardedUser } from "@/lib/auth/onboarding-gate";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const dynamic = "force-dynamic";

const TOOLS: {
  href: string;
  title: string;
  description: string;
  icon: LucideIcon;
}[] = [
  {
    href: "/tools/predict",
    title: "成绩预测",
    description: "输入近期成绩 · 评估各距离表现 · 预测等价成绩",
    icon: Activity,
  },
  {
    href: "/tools/pace",
    title: "配速计算器",
    description: "里程 + 用时 / 配速 / 圈速，任意一项自动推算",
    icon: Calculator,
  },
  {
    href: "/tools/bmi",
    title: "BMI 计算器",
    description: "身高体重 · 身体状况 · 标准体重参考",
    icon: Scale,
  },
  {
    href: "/tools/race",
    title: "比赛策略",
    description: "VDOT 计算 · 训练配速 · 负分割分段",
    icon: Gauge,
  },
  {
    href: "/tools/shoes",
    title: "跑鞋管理",
    description: "记录跑鞋 · 累计里程 · 退役提醒",
    icon: Footprints,
  },
  {
    href: "/tools/strength",
    title: "力量训练",
    description: "核心 / 髋部 / 小腿 / 平衡 / 活动度",
    icon: Dumbbell,
  },
];

export default async function ToolsPage() {
  await requireOnboardedUser();
  return (
    <div className="page-shell">
      <div>
        <h1 className="page-title">工具</h1>
        <p className="page-subtitle">成绩预测、配速、BMI 与训练辅助</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {TOOLS.map((t) => {
          const Icon = t.icon;
          return (
            <Link
              key={t.href}
              href={t.href}
              className="group block touch-manipulation active:scale-[0.99]"
            >
              <Card className="h-full transition-colors group-hover:border-foreground/20 group-hover:bg-muted/30">
                <CardHeader className="pb-3">
                  <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-lg bg-muted text-foreground">
                    <Icon className="h-4 w-4" />
                  </div>
                  <CardTitle>{t.title}</CardTitle>
                  <CardDescription>{t.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <span className="text-xs font-medium text-muted-foreground group-hover:text-foreground">
                    进入 →
                  </span>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
