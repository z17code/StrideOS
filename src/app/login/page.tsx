"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

async function readApiError(res: Response): Promise<string> {
  const text = await res.text();
  if (!text) {
    return res.status >= 500
      ? "服务暂时不可用，请稍后重试"
      : "登录失败";
  }
  try {
    const data = JSON.parse(text) as {
      error?: { message?: string; code?: string };
    };
    return data?.error?.message ?? "登录失败";
  } catch {
    if (res.status === 504 || res.status === 408) {
      return "请求超时，数据库可能正在唤醒，请再试一次";
    }
    if (res.status >= 500) {
      return "服务暂时不可用，请稍后重试";
    }
    return "登录失败";
  }
}

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/v1/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      if (!res.ok) {
        setError(await readApiError(res));
        return;
      }
      let data: { user?: { role?: string } };
      try {
        data = JSON.parse(await res.text()) as { user?: { role?: string } };
      } catch {
        setError("登录响应异常，请稍后重试");
        return;
      }
      if (data.user?.role === "admin") {
        router.replace("/admin");
      } else {
        router.replace("/");
      }
      router.refresh();
    } catch {
      setError("无法连接服务器，请检查网络后重试");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-dvh items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-semibold tracking-tight">StrideOS</h1>
          <p className="mt-1 text-sm text-muted-foreground">长跑智能教练</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>登录</CardTitle>
            <CardDescription>使用用户名与密码进入训练驾驶舱</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={onSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username">用户名</Label>
                <Input
                  id="username"
                  autoComplete="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">密码</Label>
                <Input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
              {error && (
                <p className="text-sm text-destructive" role="alert">
                  {error}
                </p>
              )}
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "登录中…" : "登录"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <p className="text-center text-sm text-muted-foreground">
          有邀请码？{" "}
          <Link href="/register" className="font-medium text-foreground underline-offset-4 hover:underline">
            注册账号
          </Link>
        </p>
        <p className="text-center text-sm text-muted-foreground">
          <Link href="/reset-password" className="underline-offset-4 hover:underline">
            使用重置令牌修改密码
          </Link>
        </p>
      </div>
    </div>
  );
}
