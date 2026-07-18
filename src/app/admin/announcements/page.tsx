"use client";

import { useCallback, useEffect, useState } from "react";
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

type Announcement = {
  id: string;
  title: string;
  body: string;
  isPublished: boolean;
  priority: number;
  startsAt: string | null;
  endsAt: string | null;
  updatedAt: string;
  createdAt: string;
};

type FormState = {
  title: string;
  body: string;
  isPublished: boolean;
  priority: string;
  startsAt: string;
  endsAt: string;
};

const emptyForm: FormState = {
  title: "",
  body: "",
  isPublished: true,
  priority: "0",
  startsAt: "",
  endsAt: "",
};

function toLocalInput(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function fromLocalInput(value: string): string | null {
  if (!value.trim()) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

function statusLabel(item: Announcement): string {
  if (!item.isPublished) return "草稿";
  const now = Date.now();
  if (item.startsAt && new Date(item.startsAt).getTime() > now) return "未开始";
  if (item.endsAt && new Date(item.endsAt).getTime() < now) return "已过期";
  return "展示中";
}

export default function AdminAnnouncementsPage() {
  const [items, setItems] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/v1/admin/announcements");
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error?.message ?? "加载失败");
        return;
      }
      setItems(data.announcements ?? []);
    } catch {
      setError("网络错误");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  function startEdit(item: Announcement) {
    setEditingId(item.id);
    setForm({
      title: item.title,
      body: item.body,
      isPublished: item.isPublished,
      priority: String(item.priority),
      startsAt: toLocalInput(item.startsAt),
      endsAt: toLocalInput(item.endsAt),
    });
    setMessage(null);
  }

  function resetForm() {
    setEditingId(null);
    setForm(emptyForm);
    setMessage(null);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    setError(null);

    const payload = {
      title: form.title.trim(),
      body: form.body.trim(),
      isPublished: form.isPublished,
      priority: Number(form.priority) || 0,
      startsAt: fromLocalInput(form.startsAt),
      endsAt: fromLocalInput(form.endsAt),
    };

    try {
      const res = await fetch(
        editingId
          ? `/api/v1/admin/announcements/${editingId}`
          : "/api/v1/admin/announcements",
        {
          method: editingId ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error?.message ?? "保存失败");
        return;
      }
      setMessage(editingId ? "已更新" : "已创建");
      resetForm();
      await load();
    } catch {
      setError("网络错误");
    } finally {
      setSaving(false);
    }
  }

  async function togglePublish(item: Announcement) {
    setError(null);
    try {
      const res = await fetch(`/api/v1/admin/announcements/${item.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isPublished: !item.isPublished }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error?.message ?? "操作失败");
        return;
      }
      await load();
    } catch {
      setError("网络错误");
    }
  }

  async function remove(item: Announcement) {
    if (!window.confirm(`确定删除公告「${item.title}」？`)) return;
    setError(null);
    try {
      const res = await fetch(`/api/v1/admin/announcements/${item.id}`, {
        method: "DELETE",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data?.error?.message ?? "删除失败");
        return;
      }
      if (editingId === item.id) resetForm();
      await load();
    } catch {
      setError("网络错误");
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="page-eyebrow">ADMIN</p>
        <h1 className="page-title">公告</h1>
        <p className="page-subtitle">
          发布后，登录用户会在主站顶部看到有效公告。可设优先级与展示时间窗。
        </p>
      </div>

      {error ? (
        <div className="rounded-2xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      ) : null}
      {message ? (
        <div className="rounded-2xl border border-primary/25 bg-primary-soft px-4 py-3 text-sm text-foreground">
          {message}
        </div>
      ) : null}

      <Card className="surface-interactive">
        <CardHeader>
          <CardTitle>{editingId ? "编辑公告" : "新建公告"}</CardTitle>
          <CardDescription>
            标题与正文对用户可见。未发布仅管理端可见。
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={onSubmit}>
            <div className="space-y-2">
              <Label htmlFor="ann-title">标题</Label>
              <Input
                id="ann-title"
                value={form.title}
                onChange={(e) =>
                  setForm((f) => ({ ...f, title: e.target.value }))
                }
                maxLength={120}
                required
                placeholder="例如：系统维护通知"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ann-body">内容</Label>
              <Textarea
                id="ann-body"
                value={form.body}
                onChange={(e) =>
                  setForm((f) => ({ ...f, body: e.target.value }))
                }
                maxLength={4000}
                required
                rows={5}
                placeholder="公告正文，支持多行"
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="ann-priority">优先级</Label>
                <Input
                  id="ann-priority"
                  type="number"
                  value={form.priority}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, priority: e.target.value }))
                  }
                />
                <p className="text-xs text-muted-foreground">数字越大越靠前</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="ann-starts">开始时间（可选）</Label>
                <Input
                  id="ann-starts"
                  type="datetime-local"
                  value={form.startsAt}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, startsAt: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ann-ends">结束时间（可选）</Label>
                <Input
                  id="ann-ends"
                  type="datetime-local"
                  value={form.endsAt}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, endsAt: e.target.value }))
                  }
                />
              </div>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-border"
                checked={form.isPublished}
                onChange={(e) =>
                  setForm((f) => ({ ...f, isPublished: e.target.checked }))
                }
              />
              立即发布
            </label>
            <div className="flex flex-wrap gap-2">
              <Button type="submit" disabled={saving}>
                {saving ? "保存中…" : editingId ? "保存修改" : "创建公告"}
              </Button>
              {editingId ? (
                <Button type="button" variant="outline" onClick={resetForm}>
                  取消编辑
                </Button>
              ) : null}
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>全部公告</CardTitle>
          <CardDescription>
            {loading ? "加载中…" : `共 ${items.length} 条`}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {!loading && items.length === 0 ? (
            <p className="text-sm text-muted-foreground">还没有公告。</p>
          ) : null}
          {items.map((item) => (
            <div
              key={item.id}
              className="rounded-2xl border border-border/80 bg-muted/30 p-4 transition-[transform,box-shadow] duration-200 ease-[var(--ease-out)] hover:shadow-[var(--shadow-card)]"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-semibold tracking-tight">{item.title}</h3>
                    <span className="rounded-full bg-primary-soft px-2 py-0.5 text-[11px] font-medium text-primary">
                      {statusLabel(item)}
                    </span>
                    <span className="text-[11px] text-muted-foreground">
                      优先级 {item.priority}
                    </span>
                  </div>
                  <p className="whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
                    {item.body}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    更新于 {new Date(item.updatedAt).toLocaleString("zh-CN")}
                  </p>
                </div>
                <div className="flex shrink-0 flex-wrap gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => startEdit(item)}
                  >
                    编辑
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    onClick={() => void togglePublish(item)}
                  >
                    {item.isPublished ? "下线" : "发布"}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="destructive"
                    onClick={() => void remove(item)}
                  >
                    删除
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
