"use client";

import { useCallback, useEffect, useState } from "react";
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
import { Loader2, Shield, ShieldCheck, ShieldOff } from "lucide-react";

type Status = { enabled: boolean; enabledAt: string | null };

export function TotpSection() {
  const [status, setStatus] = useState<Status | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [setup, setSetup] = useState<{
    secret: string;
    qrDataUrl: string;
  } | null>(null);
  const [code, setCode] = useState("");
  const [backupCodes, setBackupCodes] = useState<string[] | null>(null);
  const [disableOpen, setDisableOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/v1/me/totp");
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error?.message ?? "无法加载二次验证状态");
        return;
      }
      setStatus({
        enabled: Boolean(data.enabled),
        enabledAt: data.enabledAt ?? null,
      });
    } catch {
      setError("网络错误，请稍后重试");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function startSetup() {
    setBusy(true);
    setError(null);
    setBackupCodes(null);
    try {
      const res = await fetch("/api/v1/me/totp/setup", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error?.message ?? "无法开始绑定");
        return;
      }
      setSetup({ secret: data.secret, qrDataUrl: data.qrDataUrl });
      setCode("");
    } catch {
      setError("网络错误，请稍后重试");
    } finally {
      setBusy(false);
    }
  }

  async function confirmSetup(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/v1/me/totp/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error?.message ?? "验证失败");
        return;
      }
      setBackupCodes(data.backupCodes as string[]);
      setSetup(null);
      setCode("");
      setStatus({ enabled: true, enabledAt: new Date().toISOString() });
    } catch {
      setError("网络错误，请稍后重试");
    } finally {
      setBusy(false);
    }
  }

  async function disable(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/v1/me/totp/disable", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error?.message ?? "关闭失败");
        return;
      }
      setStatus({ enabled: false, enabledAt: null });
      setDisableOpen(false);
      setCode("");
      setBackupCodes(null);
      setSetup(null);
    } catch {
      setError("网络错误，请稍后重试");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-4 w-4" aria-hidden />
          二次验证（验证器）
        </CardTitle>
        <CardDescription>
          使用 Google Authenticator、Microsoft Authenticator 等 App
          生成动态验证码，提升账号安全
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            加载中…
          </p>
        ) : status?.enabled ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3.5 py-2.5 text-sm text-emerald-700 dark:text-emerald-300">
              <ShieldCheck className="h-4 w-4 shrink-0" />
              已开启二次验证
              {status.enabledAt && (
                <span className="text-xs opacity-80">
                  · {new Date(status.enabledAt).toLocaleString("zh-CN")}
                </span>
              )}
            </div>
            {!disableOpen ? (
              <Button
                type="button"
                variant="outline"
                className="touch-manipulation"
                onClick={() => {
                  setDisableOpen(true);
                  setCode("");
                  setError(null);
                }}
              >
                <ShieldOff className="mr-2 h-4 w-4" />
                关闭二次验证
              </Button>
            ) : (
              <form onSubmit={disable} className="space-y-3 rounded-xl border border-border/70 p-3">
                <p className="text-sm text-muted-foreground">
                  输入验证器中的 6 位验证码，或未使用的备份码
                </p>
                <div className="space-y-2">
                  <Label htmlFor="totp-disable-code">验证码 / 备份码</Label>
                  <Input
                    id="totp-disable-code"
                    inputMode="text"
                    autoComplete="one-time-code"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    required
                    placeholder="123456 或 ABCD-EF12"
                  />
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button type="submit" disabled={busy} className="touch-manipulation">
                    {busy ? "处理中…" : "确认关闭"}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    disabled={busy}
                    onClick={() => {
                      setDisableOpen(false);
                      setCode("");
                    }}
                  >
                    取消
                  </Button>
                </div>
              </form>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              未开启。绑定后，登录时需额外输入验证码。
            </p>
            {!setup ? (
              <Button
                type="button"
                onClick={() => void startSetup()}
                disabled={busy}
                className="touch-manipulation"
              >
                {busy ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    准备中…
                  </>
                ) : (
                  "开启二次验证"
                )}
              </Button>
            ) : (
              <form onSubmit={confirmSetup} className="space-y-4">
                <div className="flex flex-col items-center gap-3 sm:flex-row sm:items-start">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={setup.qrDataUrl}
                    alt="二次验证绑定二维码"
                    width={180}
                    height={180}
                    className="rounded-lg border border-border bg-white p-2"
                  />
                  <div className="space-y-2 text-sm">
                    <p>用验证器 App 扫描二维码，或手动输入密钥：</p>
                    <code className="block break-all rounded-lg bg-muted px-2.5 py-2 text-xs select-all">
                      {setup.secret}
                    </code>
                    <p className="text-xs text-muted-foreground">
                      输入 App 中显示的 6 位数字以完成绑定
                    </p>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="totp-confirm-code">6 位验证码</Label>
                  <Input
                    id="totp-confirm-code"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    required
                    maxLength={8}
                    placeholder="123456"
                  />
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button type="submit" disabled={busy} className="touch-manipulation">
                    {busy ? "验证中…" : "确认开启"}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    disabled={busy}
                    onClick={() => {
                      setSetup(null);
                      setCode("");
                    }}
                  >
                    取消
                  </Button>
                </div>
              </form>
            )}
          </div>
        )}

        {backupCodes && backupCodes.length > 0 && (
          <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-3 space-y-2">
            <p className="text-sm font-medium text-amber-900 dark:text-amber-200">
              请立即保存备份码（仅显示一次）
            </p>
            <p className="text-xs text-muted-foreground">
              手机丢失时可使用备份码登录或关闭二次验证。每个备份码只能用一次。
            </p>
            <ul className="grid grid-cols-2 gap-1.5 font-mono text-sm">
              {backupCodes.map((c) => (
                <li
                  key={c}
                  className="rounded-md bg-background/80 px-2 py-1 select-all"
                >
                  {c}
                </li>
              ))}
            </ul>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="touch-manipulation"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(backupCodes.join("\n"));
                } catch {
                  // ignore
                }
              }}
            >
              复制全部备份码
            </Button>
          </div>
        )}

        {error && (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
