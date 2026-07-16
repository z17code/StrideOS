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

export default function AdminInvitesPage() {
  const [codes, setCodes] = useState<Invite[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<string[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    if (!copiedId) return;
    const t = setTimeout(() => setCopiedId(null), 2000);
    return () => clearTimeout(t);
  }, [copiedId]);

  function maskCode(code: string) {
    return "•".repeat(Math.min(code.length, 8));
  }

  async function copyCode(code: string, id?: string) {
    await navigator.clipboard.writeText(code);
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

  async function revoke(id: string) {
    setError(null);
    const res = await fetch(`/api/v1/admin/invite-codes/${id}`, {
      method: "DELETE",
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data?.error?.message ?? "撤销失败");
      return;
    }
    await load();
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">邀请码</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            默认 30 天有效，使用后不可撤销
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            disabled={loading}
            onClick={() => void createCodes(1)}
          >
            生成 1 个
          </Button>
          <Button disabled={loading} onClick={() => void createCodes(5)}>
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
            <ul className="space-y-1 text-sm">
              {created.map((c, i) => (
                <li key={c} className="flex items-center gap-2">
                  <span className="font-mono">{maskCode(c)}</span>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7"
                    onClick={() => void copyCode(c, `new-${i}`)}
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
                  const used = Boolean(c.usedAt || c.usedByUserId);
                  const expired =
                    c.expiresAt && new Date(c.expiresAt) < new Date();
                  return (
                    <tr
                      key={c.id}
                      className="border-b border-border last:border-0"
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-medium">
                            {maskCode(c.code)}
                          </span>
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7"
                            onClick={() => void copyCode(c.code, c.id)}
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
                        {used ? (
                          <span className="text-muted-foreground">已使用</span>
                        ) : expired ? (
                          <span className="text-warning">已过期</span>
                        ) : (
                          <span className="text-success">可用</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {c.expiresAt
                          ? new Date(c.expiresAt).toLocaleDateString("zh-CN")
                          : "永久"}
                      </td>
                      <td className="px-4 py-3">
                        {!used && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => void revoke(c.id)}
                          >
                            撤销
                          </Button>
                        )}
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
    </div>
  );
}
