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
import {
  TurnstileWidget,
  resetTurnstile,
} from "@/components/security/turnstile-widget";
import { registerSchema } from "@/lib/validators/auth";
import {
  firstFlattenMessage,
  firstZodMessage,
} from "@/lib/validators/format";

export default function RegisterPage() {
  const router = useRouter();
  const [inviteCode, setInviteCode] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);

  const turnstileRequired = Boolean(
    process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY?.trim(),
  );

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError("两次输入的密码不一致");
      return;
    }

    const local = registerSchema.safeParse({ inviteCode, username, password });
    if (!local.success) {
      setError(firstZodMessage(local.error));
      return;
    }

    if (turnstileRequired && !turnstileToken) {
      setError("请完成人机验证");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/v1/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          inviteCode,
          username,
          password,
          turnstileToken: turnstileToken ?? undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        const fromDetails = firstFlattenMessage(data?.error?.details);
        setError(fromDetails ?? data?.error?.message ?? "注册失败");
        resetTurnstile();
        setTurnstileToken(null);
        return;
      }
      router.replace("/");
      router.refresh();
    } catch {
      setError("网络错误，请稍后重试");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-dvh items-center justify-center px-4 py-10 safe-pt safe-pb safe-px">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-semibold tracking-tight">StrideOS</h1>
          <p className="mt-1 text-sm text-muted-foreground">邀请制注册</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>注册</CardTitle>
            <CardDescription>需要有效邀请码才能创建账号</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={onSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="inviteCode">邀请码</Label>
                <Input
                  id="inviteCode"
                  autoComplete="off"
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="username">用户名</Label>
                <Input
                  id="username"
                  autoComplete="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  minLength={3}
                />
                <p className="text-xs text-muted-foreground">
                  3–32 个字符，支持中英文、数字和下划线
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">密码</Label>
                <Input
                  id="password"
                  type="password"
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
                />
                <p className="text-xs text-muted-foreground">
                  至少 8 个字符，须同时包含字母和数字
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">确认密码</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={8}
                />
              </div>
              <TurnstileWidget onToken={setTurnstileToken} />
              {error && (
                <p className="text-sm text-destructive" role="alert">
                  {error}
                </p>
              )}
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "注册中…" : "创建账号"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <p className="text-center text-sm text-muted-foreground">
          已有账号？{" "}
          <Link href="/login" className="font-medium text-foreground underline-offset-4 hover:underline">
            去登录
          </Link>
        </p>
      </div>
    </div>
  );
}
