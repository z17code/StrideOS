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
import {
  Loader2,
  Pencil,
  Plus,
  Shield,
  ShieldCheck,
  ShieldOff,
  Trash2,
} from "lucide-react";

type Authenticator = {
  id: string;
  name: string;
  createdAt: string;
  lastUsedAt: string | null;
};

type Status = {
  enabled: boolean;
  enabledAt: string | null;
  authenticators: Authenticator[];
  maxAuthenticators: number;
};

export function TotpSection() {
  const [status, setStatus] = useState<Status | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [setup, setSetup] = useState<{
    secret: string;
    qrDataUrl: string;
    name: string;
  } | null>(null);
  const [deviceName, setDeviceName] = useState("");
  const [code, setCode] = useState("");
  const [backupCodes, setBackupCodes] = useState<string[] | null>(null);
  const [disableOpen, setDisableOpen] = useState(false);
  const [renameId, setRenameId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [removeId, setRemoveId] = useState<string | null>(null);

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
        authenticators: Array.isArray(data.authenticators)
          ? data.authenticators
          : [],
        maxAuthenticators: Number(data.maxAuthenticators) || 5,
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

  async function startSetup(addAnother = false) {
    setBusy(true);
    setError(null);
    setBackupCodes(null);
    setRemoveId(null);
    setRenameId(null);
    try {
      const name =
        deviceName.trim() ||
        (addAnother || status?.enabled ? "新验证器" : "默认验证器");
      const res = await fetch("/api/v1/me/totp/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error?.message ?? "无法开始绑定");
        return;
      }
      setSetup({
        secret: data.secret,
        qrDataUrl: data.qrDataUrl,
        name: data.name ?? name,
      });
      setDeviceName(data.name ?? name);
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
        body: JSON.stringify({
          code,
          name: deviceName.trim() || setup?.name,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error?.message ?? "验证失败");
        return;
      }
      if (Array.isArray(data.backupCodes) && data.backupCodes.length > 0) {
        setBackupCodes(data.backupCodes as string[]);
      }
      setSetup(null);
      setCode("");
      setDeviceName("");
      await load();
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
      setDisableOpen(false);
      setCode("");
      setBackupCodes(null);
      setSetup(null);
      await load();
    } catch {
      setError("网络错误，请稍后重试");
    } finally {
      setBusy(false);
    }
  }

  async function rename(e: React.FormEvent) {
    e.preventDefault();
    if (!renameId) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/v1/me/totp/authenticators/${renameId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: renameValue }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error?.message ?? "重命名失败");
        return;
      }
      setRenameId(null);
      setRenameValue("");
      await load();
    } catch {
      setError("网络错误，请稍后重试");
    } finally {
      setBusy(false);
    }
  }

  async function removeOne(e: React.FormEvent) {
    e.preventDefault();
    if (!removeId) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/v1/me/totp/authenticators/${removeId}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error?.message ?? "移除失败");
        return;
      }
      setRemoveId(null);
      setCode("");
      await load();
    } catch {
      setError("网络错误，请稍后重试");
    } finally {
      setBusy(false);
    }
  }

  const devices = status?.authenticators ?? [];
  const atLimit =
    devices.length >= (status?.maxAuthenticators ?? 5);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-4 w-4" aria-hidden />
          二次验证（验证器）
        </CardTitle>
        <CardDescription>
          可绑定多个验证器 App（如 Google / Microsoft Authenticator），并支持改名
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            加载中…
          </p>
        ) : (
          <>
            {status?.enabled ? (
              <div className="flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3.5 py-2.5 text-sm text-emerald-700 dark:text-emerald-300">
                <ShieldCheck className="h-4 w-4 shrink-0" />
                已开启 · {devices.length} 个验证器
                {status.enabledAt && (
                  <span className="text-xs opacity-80">
                    · 自 {new Date(status.enabledAt).toLocaleDateString("zh-CN")}
                  </span>
                )}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                未开启。绑定后，登录时需额外输入验证码。
              </p>
            )}

            {devices.length > 0 && (
              <ul className="space-y-2">
                {devices.map((d) => (
                  <li
                    key={d.id}
                    className="rounded-xl border border-border/70 px-3 py-2.5"
                  >
                    {renameId === d.id ? (
                      <form
                        onSubmit={rename}
                        className="flex flex-wrap items-end gap-2"
                      >
                        <div className="min-w-[10rem] flex-1 space-y-1">
                          <Label htmlFor={`rename-${d.id}`}>名称</Label>
                          <Input
                            id={`rename-${d.id}`}
                            value={renameValue}
                            onChange={(e) => setRenameValue(e.target.value)}
                            maxLength={24}
                            required
                            autoFocus
                          />
                        </div>
                        <Button
                          type="submit"
                          size="sm"
                          disabled={busy}
                          className="touch-manipulation"
                        >
                          保存
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          disabled={busy}
                          onClick={() => {
                            setRenameId(null);
                            setRenameValue("");
                          }}
                        >
                          取消
                        </Button>
                      </form>
                    ) : removeId === d.id ? (
                      <form onSubmit={removeOne} className="space-y-2">
                        <p className="text-sm text-muted-foreground">
                          移除「{d.name}」
                          {devices.length <= 1
                            ? "将关闭二次验证。请输入验证码或备份码确认。"
                            : "。请输入验证码或备份码确认。"}
                        </p>
                        <Input
                          inputMode="text"
                          autoComplete="one-time-code"
                          value={code}
                          onChange={(e) => setCode(e.target.value)}
                          required
                          placeholder="123456 或备份码"
                        />
                        <div className="flex flex-wrap gap-2">
                          <Button
                            type="submit"
                            size="sm"
                            variant="destructive"
                            disabled={busy}
                            className="touch-manipulation"
                          >
                            确认移除
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            disabled={busy}
                            onClick={() => {
                              setRemoveId(null);
                              setCode("");
                            }}
                          >
                            取消
                          </Button>
                        </div>
                      </form>
                    ) : (
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">
                            {d.name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            绑定于{" "}
                            {new Date(d.createdAt).toLocaleString("zh-CN")}
                            {d.lastUsedAt
                              ? ` · 最近使用 ${new Date(d.lastUsedAt).toLocaleString("zh-CN")}`
                              : ""}
                          </p>
                        </div>
                        <div className="flex shrink-0 gap-1">
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0 touch-manipulation"
                            aria-label="改名"
                            disabled={busy || !!setup}
                            onClick={() => {
                              setRenameId(d.id);
                              setRenameValue(d.name);
                              setRemoveId(null);
                              setError(null);
                            }}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0 text-destructive touch-manipulation"
                            aria-label="移除"
                            disabled={busy || !!setup}
                            onClick={() => {
                              setRemoveId(d.id);
                              setCode("");
                              setRenameId(null);
                              setError(null);
                            }}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}

            {setup ? (
              <form onSubmit={confirmSetup} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="totp-device-name">验证器名称</Label>
                  <Input
                    id="totp-device-name"
                    value={deviceName}
                    onChange={(e) => setDeviceName(e.target.value)}
                    maxLength={24}
                    placeholder="例如：手机 / 平板"
                  />
                </div>
                <div className="flex flex-col items-center gap-3 sm:flex-row sm:items-start">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={setup.qrDataUrl}
                    alt="二次验证绑定二维码"
                    width={180}
                    height={180}
                    className="rounded-md border border-border bg-white p-2"
                  />
                  <div className="space-y-2 text-sm">
                    <p>用验证器 App 扫描二维码，或手动输入密钥：</p>
                    <code className="block break-all rounded-md bg-muted px-2.5 py-2 text-xs select-all">
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
                  <Button
                    type="submit"
                    disabled={busy}
                    className="touch-manipulation"
                  >
                    {busy ? "验证中…" : "确认绑定"}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    disabled={busy}
                    onClick={() => {
                      setSetup(null);
                      setCode("");
                      setDeviceName("");
                    }}
                  >
                    取消
                  </Button>
                </div>
              </form>
            ) : (
              <div className="flex flex-wrap gap-2">
                {!status?.enabled ? (
                  <Button
                    type="button"
                    onClick={() => void startSetup(false)}
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
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => void startSetup(true)}
                    disabled={busy || atLimit}
                    className="touch-manipulation"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    {atLimit
                      ? `已达上限（${status.maxAuthenticators}）`
                      : "添加验证器"}
                  </Button>
                )}

                {status?.enabled && !disableOpen && (
                  <Button
                    type="button"
                    variant="outline"
                    className="touch-manipulation"
                    onClick={() => {
                      setDisableOpen(true);
                      setCode("");
                      setError(null);
                      setRemoveId(null);
                      setRenameId(null);
                    }}
                  >
                    <ShieldOff className="mr-2 h-4 w-4" />
                    关闭全部二次验证
                  </Button>
                )}
              </div>
            )}

            {disableOpen && (
              <form
                onSubmit={disable}
                className="space-y-3 rounded-xl border border-border/70 p-3"
              >
                <p className="text-sm text-muted-foreground">
                  将移除全部验证器并关闭二次验证。请输入验证码或备份码确认。
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
                  <Button
                    type="submit"
                    disabled={busy}
                    className="touch-manipulation"
                  >
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
          </>
        )}

        {backupCodes && backupCodes.length > 0 && (
          <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-3 space-y-2">
            <p className="text-sm font-medium text-amber-900 dark:text-amber-200">
              请立即保存备份码（仅显示一次）
            </p>
            <p className="text-xs text-muted-foreground">
              手机丢失时可使用备份码登录或关闭二次验证。每个备份码只能用一次。首次开启时发放，之后添加验证器不会再生成。
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
