"use client";

import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface Version {
  id: string;
  versionNumber: number;
  label: string | null;
  isActive: boolean;
  startsOn: string;
  endsOn: string;
  createdReason: string;
}

export function VersionHistoryList({ versions }: { versions: Version[] }) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function refresh() {
    window.location.reload();
  }

  async function handleRename(v: Version) {
    setEditingId(v.id);
    setEditLabel(v.label ?? "");
  }

  async function confirmRename(v: Version) {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/v1/plans/${v.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label: editLabel.trim() || "" }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error?.message ?? "重命名失败");
        return;
      }
      setEditingId(null);
      await refresh();
    } catch {
      setError("网络错误");
    } finally {
      setLoading(false);
    }
  }

  async function handleActivate(v: Version) {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/v1/plans/${v.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error?.message ?? "切换失败");
        return;
      }
      await refresh();
    } catch {
      setError("网络错误");
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(v: Version) {
    if (!confirm(`确定删除版本 v${v.versionNumber}？${v.isActive ? "（当前活跃版本，删除后将自动切换）" : ""}`))
      return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/v1/plans/${v.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error?.message ?? "删除失败");
        return;
      }
      await refresh();
    } catch {
      setError("网络错误");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      {error && (
        <p className="mb-3 text-sm text-destructive" role="alert">
          {error}
        </p>
      )}
      <ul className="space-y-2">
        {versions.map((v) => (
          <li
            key={v.id}
            className={`flex items-center gap-2 rounded-md border p-3 text-sm ${
              v.isActive
                ? "border-primary/50 bg-primary/5"
                : "border-border"
            }`}
          >
            <Link
              href={`/plan/history/${v.id}`}
              className="flex-1 underline-offset-4 hover:underline"
            >
              <span className="font-medium">v{v.versionNumber}</span>
              {v.label && (
                <span className="ml-1 text-muted-foreground">
                  · {v.label}
                </span>
              )}
              {v.isActive && (
                <span className="ml-2 text-xs text-primary">（当前）</span>
              )}
              <div className="text-xs text-muted-foreground mt-0.5">
                {v.startsOn} → {v.endsOn} · {v.createdReason}
              </div>
            </Link>
            <div className="flex shrink-0 gap-1">
              {editingId === v.id ? (
                <>
                  <Input
                    type="text"
                    value={editLabel}
                    onChange={(e) => setEditLabel(e.target.value)}
                    className="h-8 w-24 text-xs"
                    placeholder="版本名称"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === "Enter") void confirmRename(v);
                      if (e.key === "Escape") setEditingId(null);
                    }}
                  />
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => void confirmRename(v)}
                    disabled={loading}
                  >
                    确认
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => setEditingId(null)}
                    disabled={loading}
                  >
                    取消
                  </Button>
                </>
              ) : (
                <>
                  {!v.isActive && (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => void handleActivate(v)}
                      disabled={loading}
                    >
                      切换
                    </Button>
                  )}
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => void handleRename(v)}
                    disabled={loading || v.isActive}
                  >
                    重命名
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="text-destructive hover:text-destructive"
                    onClick={() => void handleDelete(v)}
                    disabled={loading}
                  >
                    删除
                  </Button>
                </>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
