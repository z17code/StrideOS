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

type RateRow = {
  id: string;
  bucket: string;
  hits: number;
  windowStart: string;
  lockedUntil: string | null;
  updatedAt: string;
  isLocked: boolean;
};

function fmt(iso: string | null) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("zh-CN", { hour12: false });
  } catch {
    return iso;
  }
}

export default function AdminSecurityPage() {
  const [rows, setRows] = useState<RateRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [unlockName, setUnlockName] = useState("");
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    const res = await fetch("/api/v1/admin/rate-limits");
    const data = await res.json();
    if (!res.ok) {
      setError(data?.error?.message ?? "加载失败");
      return;
    }
    setRows(data.rateLimits);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function clearById(id: string) {
    setBusyId(id);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch(`/api/v1/admin/rate-limits/${id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error?.message ?? "清除失败");
        return;
      }
      setMessage("已清除该限流记录");
      await load();
    } finally {
      setBusyId(null);
    }
  }

  async function unlockUsername() {
    const username = unlockName.trim();
    if (!username) return;
    setBusyId("username");
    setError(null);
    setMessage(null);
    try {
      const res = await fetch("/api/v1/admin/rate-limits", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error?.message ?? "解锁失败");
        return;
      }
      setMessage(
        data.deleted
          ? `已解除用户名「${username}」相关登录锁定`
          : `未找到「${username}」的锁定记录`,
      );
      setUnlockName("");
      await load();
    } finally {
      setBusyId(null);
    }
  }

  const locked = rows.filter((r) => r.isLocked);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">安全 / 限流</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          查看登录/注册限流桶，解除误伤锁定（IP 桶为哈希，用户名可直接解锁）
        </p>
      </div>

      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}
      {message && <p className="text-sm text-success">{message}</p>}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">按用户名解锁登录</CardTitle>
          <CardDescription>
            清除该用户名对应的登录限流桶（常见：密码输错被锁）
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap items-end gap-2">
          <div className="space-y-1">
            <Label htmlFor="unlock-user">用户名</Label>
            <Input
              id="unlock-user"
              value={unlockName}
              onChange={(e) => setUnlockName(e.target.value)}
              className="h-9 w-48"
              placeholder="目标用户名"
            />
          </div>
          <Button
            size="sm"
            disabled={busyId === "username" || !unlockName.trim()}
            onClick={() => void unlockUsername()}
          >
            解锁
          </Button>
          <Button size="sm" variant="outline" onClick={() => void load()}>
            刷新列表
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            当前锁定中（{locked.length}）
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-border bg-muted/50 text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">Bucket</th>
                  <th className="px-4 py-3 font-medium">Hits</th>
                  <th className="px-4 py-3 font-medium">锁定至</th>
                  <th className="px-4 py-3 font-medium">操作</th>
                </tr>
              </thead>
              <tbody>
                {locked.map((r) => (
                  <tr key={r.id} className="border-b border-border last:border-0">
                    <td className="px-4 py-3 font-mono text-xs break-all">
                      {r.bucket}
                    </td>
                    <td className="px-4 py-3 tabular-nums">{r.hits}</td>
                    <td className="px-4 py-3 text-xs">{fmt(r.lockedUntil)}</td>
                    <td className="px-4 py-3">
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={busyId === r.id}
                        onClick={() => void clearById(r.id)}
                      >
                        清除
                      </Button>
                    </td>
                  </tr>
                ))}
                {locked.length === 0 && (
                  <tr>
                    <td
                      colSpan={4}
                      className="px-4 py-8 text-center text-muted-foreground"
                    >
                      当前无锁定
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">全部限流桶（{rows.length}）</CardTitle>
          <CardDescription>含未锁定的近期计数窗口</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-border bg-muted/50 text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">Bucket</th>
                  <th className="px-4 py-3 font-medium">Hits</th>
                  <th className="px-4 py-3 font-medium">状态</th>
                  <th className="px-4 py-3 font-medium">更新</th>
                  <th className="px-4 py-3 font-medium">操作</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-b border-border last:border-0">
                    <td className="px-4 py-3 font-mono text-xs break-all">
                      {r.bucket}
                    </td>
                    <td className="px-4 py-3 tabular-nums">{r.hits}</td>
                    <td className="px-4 py-3">
                      <span
                        className={
                          r.isLocked ? "text-destructive" : "text-muted-foreground"
                        }
                      >
                        {r.isLocked ? "锁定中" : "计数中"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {fmt(r.updatedAt)}
                    </td>
                    <td className="px-4 py-3">
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={busyId === r.id}
                        onClick={() => void clearById(r.id)}
                      >
                        清除
                      </Button>
                    </td>
                  </tr>
                ))}
                {rows.length === 0 && (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-4 py-8 text-center text-muted-foreground"
                    >
                      暂无限流记录
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

