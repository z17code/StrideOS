"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Eye, EyeOff, Loader2, Lock, User } from "lucide-react";
import { AuthStage } from "@/components/auth/auth-stage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

async function readApiError(res: Response): Promise<string> {
  const text = await res.text();
  if (!text) {
    return res.status >= 500 ? "服务暂时不可用，请稍后重试" : "登录失败";
  }
  try {
    const data = JSON.parse(text) as {
      error?: { message?: string; code?: string };
    };
    return data?.error?.message ?? "登录失败";
  } catch {
    if (res.status === 504 || res.status === 408) {
      return "请求超时，请稍后再试";
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
  const [showPassword, setShowPassword] = useState(false);
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
    <AuthStage>
      <div className="auth-login-panel relative overflow-hidden rounded-2xl border border-white/10 bg-zinc-950/70 p-6 shadow-[0_24px_80px_-24px_rgba(0,0,0,0.8)] backdrop-blur-xl sm:p-7">
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-emerald-400/60 to-transparent"
          aria-hidden
        />

        <div className="mb-6 space-y-1">
          <p className="text-xs font-medium uppercase tracking-[0.22em] text-emerald-400/90">
            Sign in
          </p>
          <h2 className="text-2xl font-semibold tracking-tight text-zinc-50">
            登录训练驾驶舱
          </h2>
          <p className="text-sm text-zinc-400">使用用户名与密码进入</p>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="username" className="text-zinc-300">
              用户名
            </Label>
            <div className="relative">
              <User
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500"
                aria-hidden
              />
              <Input
                id="username"
                autoComplete="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                placeholder="输入用户名"
                className="h-11 border-white/10 bg-white/[0.04] pl-10 text-zinc-50 placeholder:text-zinc-600 shadow-none focus-visible:ring-emerald-400/50"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="password" className="text-zinc-300">
              密码
            </Label>
            <div className="relative">
              <Lock
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500"
                aria-hidden
              />
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="输入密码"
                className="h-11 border-white/10 bg-white/[0.04] pl-10 pr-11 text-zinc-50 placeholder:text-zinc-600 shadow-none focus-visible:ring-emerald-400/50"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md text-zinc-500 transition-colors hover:bg-white/5 hover:text-zinc-300 touch-manipulation"
                aria-label={showPassword ? "隐藏密码" : "显示密码"}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>

          {error && (
            <div
              className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300"
              role="alert"
            >
              {error}
            </div>
          )}

          <Button
            type="submit"
            disabled={loading}
            className={cn(
              "h-11 w-full gap-2 rounded-xl bg-zinc-50 text-zinc-950 hover:bg-white",
              "shadow-[0_0_0_1px_rgba(255,255,255,0.08),0_12px_40px_-12px_rgba(16,185,129,0.45)]",
            )}
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                登录中…
              </>
            ) : (
              <>
                进入驾驶舱
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </Button>
        </form>

        <div className="mt-6 space-y-3 border-t border-white/10 pt-5 text-center text-sm">
          <p className="text-zinc-400">
            有邀请码？{" "}
            <Link
              href="/register"
              className="font-medium text-zinc-100 underline-offset-4 transition-colors hover:text-emerald-300 hover:underline"
            >
              注册账号
            </Link>
          </p>
          <p>
            <Link
              href="/reset-password"
              className="text-zinc-500 underline-offset-4 transition-colors hover:text-zinc-300 hover:underline"
            >
              使用重置令牌修改密码
            </Link>
          </p>
        </div>
      </div>
    </AuthStage>
  );
}
