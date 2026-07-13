"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface Template {
  id: string;
  name: string;
  description: string;
  durationMin: number;
}

interface SessionData {
  id: string;
  date: string;
  templateId: string;
  templateName: string;
  completed: boolean;
  notes: string | null;
  createdAt: string;
}

export default function StrengthPage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [sessions, setSessions] = useState<SessionData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    date: new Date().toISOString().slice(0, 10),
    templateId: "core",
    notes: "",
  });

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [tRes, sRes] = await Promise.all([
        fetch("/api/v1/strength?templates=1"),
        fetch("/api/v1/strength"),
      ]);
      if (!tRes.ok || !sRes.ok) {
        throw new Error("加载失败");
      }
      const tData = await tRes.json();
      const sData = await sRes.json();
      setTemplates(tData.templates ?? []);
      setSessions(sData.sessions ?? []);
      if ((tData.templates ?? []).length > 0 && !form.templateId) {
        setForm((f) => ({ ...f, templateId: tData.templates[0].id }));
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "加载失败");
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/v1/strength", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: form.date,
          templateId: form.templateId,
          notes: form.notes || null,
          completed: true,
        }),
      });
      if (!res.ok) {
        const b = await res.json().catch(() => null);
        throw new Error(b?.error?.message ?? "保存失败");
      }
      setForm((f) => ({ ...f, notes: "" }));
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "保存失败");
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: string) {
    if (!confirm("确认删除这条力量记录？")) return;
    setError(null);
    try {
      const res = await fetch(`/api/v1/strength/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const b = await res.json().catch(() => null);
        throw new Error(b?.error?.message ?? "删除失败");
      }
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "删除失败");
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">力量训练</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            记录核心、髋部等辅助训练
          </p>
        </div>
        <Link
          href="/tools"
          className="text-sm text-muted-foreground hover:underline"
        >
          ← 工具
        </Link>
      </div>

      {error && (
        <p className="rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}

      <Card>
        <CardHeader>
          <CardTitle>记录一次力量训练</CardTitle>
          <CardDescription>选择模板并标记完成</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={create} className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label htmlFor="date">日期</Label>
              <Input
                id="date"
                type="date"
                required
                value={form.date}
                onChange={(e) =>
                  setForm((f) => ({ ...f, date: e.target.value }))
                }
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="templateId">模板</Label>
              <select
                id="templateId"
                className="flex h-10 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                value={form.templateId}
                onChange={(e) =>
                  setForm((f) => ({ ...f, templateId: e.target.value }))
                }
              >
                {(templates.length
                  ? templates
                  : [
                      { id: "core", name: "核心稳定" },
                      { id: "hips", name: "髋部力量" },
                      { id: "calves", name: "小腿与足部" },
                      { id: "balance", name: "平衡与本体感觉" },
                      { id: "mobility", name: "活动度拉伸" },
                    ]
                ).map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>
            {templates.length > 0 && (
              <div className="sm:col-span-2 text-xs text-muted-foreground">
                {templates.find((t) => t.id === form.templateId)?.description}
                {templates.find((t) => t.id === form.templateId)
                  ? ` · 约 ${templates.find((t) => t.id === form.templateId)!.durationMin} 分钟`
                  : ""}
              </div>
            )}
            <div className="space-y-1 sm:col-span-2">
              <Label htmlFor="notes">备注</Label>
              <Textarea
                id="notes"
                value={form.notes}
                onChange={(e) =>
                  setForm((f) => ({ ...f, notes: e.target.value }))
                }
                rows={2}
                placeholder="可选"
              />
            </div>
            <div className="sm:col-span-2">
              <Button type="submit" disabled={saving}>
                {saving ? "保存中…" : "记录完成"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <h2 className="text-sm font-medium">最近记录</h2>
      {loading ? (
        <p className="text-sm text-muted-foreground">加载中…</p>
      ) : sessions.length === 0 ? (
        <p className="text-sm text-muted-foreground">暂无记录</p>
      ) : (
        <ul className="space-y-3">
          {sessions.map((s) => (
            <li key={s.id}>
              <Card>
                <CardContent className="flex items-center justify-between gap-3 p-4">
                  <div>
                    <div className="font-medium">{s.templateName}</div>
                    <div className="mt-0.5 text-xs text-muted-foreground">
                      {s.date}
                      {s.completed ? " · 已完成" : " · 未完成"}
                      {s.notes ? ` · ${s.notes}` : ""}
                    </div>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => void remove(s.id)}
                  >
                    删除
                  </Button>
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
