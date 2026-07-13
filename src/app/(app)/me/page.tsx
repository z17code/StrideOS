import Link from "next/link";
import { requireOnboardedUser } from "@/lib/auth/onboarding-gate";
import { LogoutButton } from "@/components/layout/logout-button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const dynamic = "force-dynamic";

export default async function MePage() {
  const { user, profile } = await requireOnboardedUser();

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">我的</h1>
        <p className="mt-1 text-sm text-muted-foreground">账号与偏好设置</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>账号信息</CardTitle>
          <CardDescription>
            首版不支持自助修改密码，请联系管理员重置
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">用户名</span>
            <span className="font-medium">{user.username}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">近 6 周跑量</span>
            <span className="font-medium tabular-nums">
              {profile.weeklyDistance ?? "—"} km
            </span>
          </div>
          <div className="flex gap-2">
            <Link
              href="/onboarding"
              className="text-sm underline-offset-4 hover:underline"
            >
              重新填写入门信息
            </Link>
          </div>
          <LogoutButton className="w-full sm:w-auto" />
        </CardContent>
      </Card>
    </div>
  );
}
