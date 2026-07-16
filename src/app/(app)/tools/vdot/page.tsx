import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { VDOT_GUIDE } from "@/lib/tools/vdot-guide";
import { requireOnboardedUser } from "@/lib/auth/onboarding-gate";

export const dynamic = "force-dynamic";

export default async function VdotGuidePage() {
  await requireOnboardedUser();
  return (
    <div className="page-shell max-w-lg">
      <div>
        <Link href="/tools" className="text-xs text-muted-foreground hover:text-foreground">
          ← 工具
        </Link>
        <h1 className="page-title mt-1">{VDOT_GUIDE.title}</h1>
        <p className="page-subtitle">成绩预测与训练配速的共同基础</p>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">是什么</CardTitle>
          <CardDescription>概念介绍</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm leading-relaxed text-muted-foreground">
          {VDOT_GUIDE.paragraphs.map((p) => (
            <p key={p}>{p}</p>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">要点</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
            {VDOT_GUIDE.tips.map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="flex flex-wrap gap-3 py-4 text-sm">
          <Link href="/tools/paces" className="underline hover:text-foreground">
            训练配速表
          </Link>
          <Link href="/tools/predict" className="underline hover:text-foreground">
            成绩预测
          </Link>
          <Link href="/tools/race" className="underline hover:text-foreground">
            比赛策略
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
