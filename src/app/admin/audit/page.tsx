"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
} from "@/components/ui/card";

type AuditLog = {
  id: string;
  adminId: string | null;
  adminUsername: string;
  action: string;
  targetType: string | null;
  targetId: string | null;
  summary: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
};

function fmt(iso: string) {
  try {
    return new Date(iso).toLocaleString("zh-CN", { hour12: false });
  } catch {
    return iso;
  }
}

export default function AdminAuditPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    const res = await fetch("/api/v1/admin/audit-logs?limit=100");
    const data = await res.json();
    if (!res.ok) {
      setError(data?.error?.message ?? "加载失败");
      return;
    }
    setLogs(data.logs);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">操作审计</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            管理员写操作只读记录（最近 100 条）
          </p>
        </div>
        <Button size="sm" variant="outline" onClick={() => void load()}>
          刷新
        </Button>
      </div>

      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-border bg-muted/50 text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">时间</th>
                  <th className="px-4 py-3 font-medium">管理员</th>
                  <th className="px-4 py-3 font-medium">动作</th>
                  <th className="px-4 py-3 font-medium">说明</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr
                    key={log.id}
                    className="border-b border-border last:border-0 align-top"
                  >
                    <td className="px-4 py-3 text-xs whitespace-nowrap text-muted-foreground">
                      {fmt(log.createdAt)}
                    </td>
                    <td className="px-4 py-3">{log.adminUsername}</td>
                    <td className="px-4 py-3 font-mono text-xs">{log.action}</td>
                    <td className="px-4 py-3">
                      <div>{log.summary ?? "—"}</div>
                      {(log.targetType || log.targetId) && (
                        <div className="mt-0.5 text-xs text-muted-foreground font-mono break-all">
                          {[log.targetType, log.targetId].filter(Boolean).join(" · ")}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
                {logs.length === 0 && (
                  <tr>
                    <td
                      colSpan={4}
                      className="px-4 py-8 text-center text-muted-foreground"
                    >
                      暂无审计记录
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
