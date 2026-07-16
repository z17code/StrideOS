"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
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

type StatusFilter = "all" | "available" | "used" | "expired" | "invalid";
type ExpiryPreset = 7 | 30 | 90 | null;

function inviteKind(c: Invite): StatusFilter {
  if (c.usedAt) return c.usedByUserId ? "used" : "invalid";
  if (c.expiresAt && new Date(c.expiresAt) < new Date()) return "expired";
  return "available";
}

function inviteStatusLabel(c: Invite): { label: string; className: string } {
  const kind = inviteKind(c);
  if (kind === "used") return { label: "已使用", className: "text-muted-foreground" };
  if (kind === "invalid") return { label: "已失效", className: "text-muted-foreground" };
  if (kind === "expired") return { label: "已过期", className: "text-warning" };
  return { label: "可用", className: "text-success" };
}

async function copyText(text: string): Promise<boolean> {
  try {
    if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // fallthrough
  }
  try {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "");
    ta.style.position = "fixed";
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
  const [filter, setFilter] = useState<StatusFilter>("all");
  const [expiry, setExpiry] = useState<ExpiryPreset>(30);

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

  const filtered = useMemo(() => {
    if (filter === "all") return codes;
    return codes.filter((c) => inviteKind(c) === filter);
  }, [codes, filter]);

  async function createCodes(count: number) {
    setLoading(true);
    setError(null);
    setCreated(null);
    try {
      const body: Record<string, unknown> = { count };
      if (expiry == null) {
        body.expiresInDays = null;
      } else {
        body.expiresInDays = expiry;
      }
      const res = await fetch("/api/v1/admin/invite-codes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
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

  async function copyCreatedAll() {
    if (!created?.length) return;
    const ok = await copyText(created.join("\n"));
    if (!ok) {
      setError("复制失败，请手动选择");
      return;
    }
    setCopiedId("created-all");
  }

  async function copyAvailableAll() {
    const available = codes
      .filter((c) => inviteKind(c) === "available")
      .map((c) => c.code);
    if (available.length === 0) {
      setError("当前没有可用邀请码");
      return;
    }
    const ok = await copyText(available.join("\n"));
    if (!ok) {
      setError("复制失败，请手动选择");
      return;
    }
    setCopiedId("available-all");
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
            可选过期策略；删除后永久不可用
          </p>
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <div className="space-y-1">
            <Label htmlFor="invite-expiry">有效期</Label>
            <select
              id="invite-expiry"
              className="flex h-9 rounded-md border border-input bg-background px-3 text-sm"
              value={expiry == null ? "never" : String(expiry)}
              onChange={(e) => {
                const v = e.target.value;
                setExpiry(v === "never" ? null : (Number(v) as ExpiryPreset));
              }}
            >
              <option value="7">7 天</option>
              <option value="30">30 天</option>
              <option value="90">90 天</option>
              <option value="never">不过期</option>
            </select>
          </div>
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

      <div className="flex flex-wrap items-center gap-2">
        <Label htmlFor="invite-filter">筛选</Label>
        <select
          id="invite-filter"
          className="flex h-9 rounded-md border border-input bg-background px-3 text-sm"
          value={filter}
          onChange={(e) => setFilter(e.target.value as StatusFilter)}
        >
          <option value="all">全部</option>
          <option value="available">可用</option>
          <option value="used">已使用</option>
          <option value="expired">已过期</option>
          <option value="invalid">已失效</option>
        </select>
        <Button
          size="sm"
          variant="outline"
          className="touch-manipulation"
          onClick={() => void copyAvailableAll()}
        >
          {copiedId === "available-all" ? "已复制可用" : "复制全部可用"}
        </Button>
      </div>

      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}

      {created && (
        <Card>
          <CardHeader className="flex flex-row items-start justify-between gap-2 space-y-0">
            <div>
              <CardTitle className="text-base">新生成的邀请码</CardTitle>
              <CardDescription>请妥善保管并分发给受邀用户</CardDescription>
            </div>
            <Button
              size="sm"
              variant="outline"
              className="touch-manipulation"
              onClick={() => void copyCreatedAll()}
            >
              {copiedId === "created-all" ? (
                <>
                  <Check className="mr-1 h-4 w-4" /> 已复制全部
                </>
              ) : (
                <>
                  <ClipboardCopy className="mr-1 h-4 w-4" /> 复制全部
                </>
              )}
            </Button>
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
                {filtered.map((c) => {
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
                {filtered.length === 0 && (
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
