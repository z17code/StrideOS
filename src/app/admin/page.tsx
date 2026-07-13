import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import Link from "next/link";

export default function AdminHomePage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">管理后台</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          邀请制运维：用户、邀请码与密码重置
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Link href="/admin/users">
          <Card className="transition-colors hover:bg-muted/40">
            <CardHeader>
              <CardTitle>用户管理</CardTitle>
              <CardDescription>查看、停用账号并生成重置令牌</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">进入 →</p>
            </CardContent>
          </Card>
        </Link>
        <Link href="/admin/invites">
          <Card className="transition-colors hover:bg-muted/40">
            <CardHeader>
              <CardTitle>邀请码</CardTitle>
              <CardDescription>创建与撤销注册邀请码</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">进入 →</p>
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  );
}
