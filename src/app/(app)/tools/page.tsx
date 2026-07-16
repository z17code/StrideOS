import Link from "next/link";
import {
  Activity,
  BookOpen,
  Calculator,
  CalendarCheck,
  ClipboardList,
  Dumbbell,
  Flag,
  Footprints,
  Gauge,
  HeartPulse,
  Mountain,
  NotebookPen,
  Scale,
  Timer,
  Utensils,
  Zap,
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

type ToolItem = {
  href: string;
  title: string;
  description: string;
  icon: LucideIcon;
};

const GROUPS: Array<{ title: string; items: ToolItem[] }> = [
  {
    title: "成绩与配速",
    items: [
      {
        href: "/tools/predict",
        title: "成绩预测",
        description: "近期成绩 · 各距离表现 · 等价成绩",
        icon: Activity,
      },
      {
        href: "/tools/paces",
        title: "训练配速表",
        description: "E / M / T / I / R 区间（VDOT）",
        icon: Timer,
      },
      {
        href: "/tools/pace",
        title: "配速计算器",
        description: "里程 + 用时 / 配速 / 圈速互算",
        icon: Calculator,
      },
      {
        href: "/tools/splits",
        title: "分段配速表",
        description: "目标成绩 → 每公里 / 负分割",
        icon: Gauge,
      },
      {
        href: "/tools/race",
        title: "比赛策略",
        description: "VDOT · 训练配速 · 负分割分段",
        icon: Flag,
      },
      {
        href: "/tools/intervals",
        title: "间歇课设计",
        description: "组数 × 距离 × 配速 → 总负荷",
        icon: Zap,
      },
      {
        href: "/tools/vdot",
        title: "VDOT 说明",
        description: "训练配速与成绩预测的原理",
        icon: BookOpen,
      },
    ],
  },
  {
    title: "身体与恢复",
    items: [
      {
        href: "/tools/bmi",
        title: "BMI 计算器",
        description: "身高体重 · 中国成人区间",
        icon: Scale,
      },
      {
        href: "/tools/heart-rate",
        title: "心率区间",
        description: "Z1–Z5 · 储备心率 / 最大心率",
        icon: HeartPulse,
      },
      {
        href: "/tools/recovery",
        title: "热身放松拉伸",
        description: "课前课后可勾选清单",
        icon: ClipboardList,
      },
      {
        href: "/tools/fueling",
        title: "长跑补给估算",
        description: "补水 · 碳水 · 能量胶粗估",
        icon: Utensils,
      },
      {
        href: "/tools/strength",
        title: "力量训练",
        description: "核心 / 髋 / 小腿 / 自定义",
        icon: Dumbbell,
      },
    ],
  },
  {
    title: "计划与装备",
    items: [
      {
        href: "/tools/load",
        title: "周负荷一览",
        description: "近 4 周计划 vs 实际（只读）",
        icon: CalendarCheck,
      },
      {
        href: "/tools/race-day",
        title: "比赛倒计时清单",
        description: "赛前 4 周到比赛日勾选",
        icon: ClipboardList,
      },
      {
        href: "/tools/notes",
        title: "训练备注模板",
        description: "复制到活动记录备注",
        icon: NotebookPen,
      },
      {
        href: "/tools/shoes",
        title: "跑鞋管理",
        description: "里程 · 寿命进度 · 退役提醒",
        icon: Footprints,
      },
    ],
  },
  {
    title: "换算与修正",
    items: [
      {
        href: "/tools/units",
        title: "单位换算",
        description: "公里/英里 · 配速 · 温度",
        icon: Calculator,
      },
      {
        href: "/tools/grade",
        title: "坡度配速修正",
        description: "上坡减速经验估算",
        icon: Mountain,
      },
      {
        href: "/tools/power",
        title: "配速 ↔ 功率",
        description: "平路粗换算（参考）",
        icon: Zap,
      },
    ],
  },
];

export default async function ToolsPage() {
  await requireOnboardedUser();
  return (
    <div className="page-shell">
      <div>
        <h1 className="page-title">工具</h1>
        <p className="page-subtitle">
          计算器与清单以本地/静态为主，不额外占用数据库空间
        </p>
      </div>

      {GROUPS.map((group) => (
        <section key={group.title} className="space-y-3">
          <h2 className="text-sm font-medium text-muted-foreground">{group.title}</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {group.items.map((t) => {
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
        </section>
      ))}
    </div>
  );
}
