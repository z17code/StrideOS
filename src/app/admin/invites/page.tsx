"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ClipboardCopy, Check } from "lucide-react";

type Invite = {
  id: string;
  code: string;
  usedByUserId: string | null;
  usedAt: string | null;
  expiresAt: string | null;
  createdAt: string;
};

function inviteStatusLabel(c: Invite): {
  label: string;
  className: string;
} {
  if (c.usedByUserId) {
    return { label: "已使用", className: "text-muted-foreground" };
  }
  if (c.usedAt) {
    return { label: "已失效", className: "text-muted-foreground" };
  }
  if (c.expiresAt && new Date(c.expiresAt) < new Date()) {
    return { label: "已过期", className: "text-warning" };
  }
  return { label: "可用", className: "text-success" };
}

/** Clipboard helper that works on mobile (secure context + textarea fallback). */
async function copyText(text: string): Promise<boolean> {
  try {
    if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // fall through to execCommand
  }

  try {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "");
    ta.style.position = "fixed";
    ta.style.top = "0";
    ta.style.left = "0";
    ta.style.width = "1px";
    ta.style.height = "1px";
    ta.style.padding = "0";
    ta.style.border = "none";
    ta.style.outline = "none";
    ta.style.boxShadow = "none";
    ta.style.background = "transparent";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    ta.setSelectionRange(0, text.length);
    const ok = document.execCommand("copy");
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}

export default function AdminInvitesPage() {
  const [codes, setCodes] = useState<Invite[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<string[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [clearing, setClearing] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    if (!copiedId) return;
    const t = setTimeout(() => setCopiedId(null), 2000);
    return () => clearTimeout(t);
  }, [copiedId]);

  async function copyCode(code: string, id?: string) {
    const ok = await copyText(code);
    if (!ok) {
      setError("复制失败，请长按邀请码手动选择复制");
      return;
    }
    if (id) setCopiedId(id);
  }

  const load = useCallback(async () => {
    setError(null);
    const res = await fetch("/api/v1/admin/invite-codes");
    const data = await res.json();
    if (!res.ok) {
      setError(data?.error?.message ?? "加载失败");
      return;
    }
    setCodes(data.inviteCodes);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function createCodes(count: number) {
    setLoading(true);
    setError(null);
    setCreated(null);
    try {
      const res = await fetch("/api/v1/admin/invite-codes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ count, expiresInDays: 30 }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error?.message ?? "创建失败");
        return;
      }
      setCreated(data.inviteCodes.map((c: Invite) => c.code));
      await load();
    } finally {
      setLoading(false);
    }
  }

  async function deleteInvite(id: string) {
    if (!window.confirm("确定删除该邀请码？将从列表中移除且永久不可再使用。")) {
      return;
    }
    setError(null);
    setBusyId(id);
    try {
      const res = await fetch(`/api/v1/admin/invite-codes/${id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error?.message ?? "删除失败");
        return;
      }
      await load();
    } finally {
      setBusyId(null);
    }
  }

  async function clearAll() {
    if (codes.length === 0) return;
    if (
      !window.confirm(
        `确定清空全部 ${codes.length} 个邀请码？此操作不可恢复，所有码将永久不可用。`,
      )
    ) {
      return;
    }
    setError(null);
    setClearing(true);
    try {
      const res = await fetch("/api/v1/admin/invite-codes", {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error?.message ?? "清空失败");
        return;
      }
      setCreated(null);
      await load();
    } finally {
      setClearing(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">邀请码</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            默认 30 天有效；可删除任意码或一键清空，删除后永久不可用
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            disabled={loading}
            className="touch-manipulation"
            onClick={() => void createCodes(1)}
          >
            生成 1 个
          </Button>
          <Button
            disabled={loading}
            className="touch-manipulation"
            onClick={() => void createCodes(5)}
          >
            生成 5 个
          </Button>
        </div>
      </div>

      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}

      {created && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">新生成的邀请码</CardTitle>
            <CardDescription>请妥善保管并分发给受邀用户</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm">
              {created.map((c, i) => (
                <li key={c} className="flex items-center gap-2">
                  <span className="select-all font-mono font-medium tracking-wide">
                    {c}
                  </span>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="h-9 w-9 touch-manipulation active:scale-95"
                    onClick={() => void copyCode(c, `new-${i}`)}
                    aria-label="复制邀请码"
                  >
                    {copiedId === `new-${i}` ? (
                      <Check className="h-4 w-4 text-success" />
                    ) : (
                      <ClipboardCopy className="h-4 w-4" />
                    )}
                  </Button>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-border bg-muted/50 text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">邀请码</th>
                  <th className="px-4 py-3 font-medium">状态</th>
                  <th className="px-4 py-3 font-medium">过期</th>
                  <th className="px-4 py-3 font-medium">操作</th>
                </tr>
              </thead>
              <tbody>
                {codes.map((c) => {
                  const status = inviteStatusLabel(c);
                  return (
                    <tr
                      key={c.id}
                      className="border-b border-border last:border-0"
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="select-all font-mono font-medium tracking-wide">
                            {c.code}
                          </span>
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            className="h-9 w-9 shrink-0 touch-manipulation active:scale-95"
                            onClick={() => void copyCode(c.code, c.id)}
                            aria-label="复制邀请码"
                          >
                            {copiedId === c.id ? (
                              <Check className="h-4 w-4 text-success" />
                            ) : (
                              <ClipboardCopy className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={status.className}>{status.label}</span>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {c.expiresAt
                          ? new Date(c.expiresAt).toLocaleDateString("zh-CN")
                          : "永久"}
                      </td>
                      <td className="px-4 py-3">
                        <Button
                          size="sm"
                          variant="outline"
                          className="touch-manipulation"
                          disabled={busyId === c.id || clearing}
                          onClick={() => void deleteInvite(c.id)}
                        >
                          删除
                        </Button>
                      </td>
                    </tr>
                  );
                })}
                {codes.length === 0 && (
                  <tr>
                    <td
                      colSpan={4}
                      className="px-4 py-8 text-center text-muted-foreground"
                    >
                      暂无邀请码
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {codes.length > 0 && (
        <div className="flex justify-end pb-4">
          <Button
            variant="destructive"
            className="touch-manipulation"
            disabled={clearing || busyId != null}
            onClick={() => void clearAll()}
          >
            {clearing ? "清空中…" : `一键清空全部（${codes.length}）`}
          </Button>
        </div>
      )}
    </div>
  );
}
