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
import type { StrengthExercise } from "@/lib/validators/strength";
import { STRENGTH_TEMPLATES } from "@/lib/strength/service";

interface Template {
  id: string;
  name: string;
  description: string;
  durationMin: number;
}

interface SessionData {
  id: string;
  date: string;
  templateId: string | null;
  templateName: string;
  completed: boolean;
  notes: string | null;
  exercises: StrengthExercise[] | null;
  durationMin: number | null;
  createdAt: string;
}

const EMPTY_EXERCISE: StrengthExercise = {
  name: "",
  sets: 3,
  reps: 10,
  weightKg: null,
  durationSec: null,
  note: "",
};

export default function StrengthPage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [sessions, setSessions] = useState<SessionData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    date: new Date().toISOString().slice(0, 10),
    templateId: "core",
    customName: "",
    durationMin: "",
    notes: "",
  });
  const [exercises, setExercises] = useState<StrengthExercise[]>([]);

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
    } catch (e) {
      setError(e instanceof Error ? e.message : "加载失败");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isCustom = form.templateId === "__custom__";

  function addExercise() {
    setExercises((prev) => [...prev, { ...EMPTY_EXERCISE }]);
  }

  function removeExercise(index: number) {
    setExercises((prev) => prev.filter((_, i) => i !== index));
  }

  function updateExercise(
    index: number,
    field: keyof StrengthExercise,
    value: string | number | null,
  ) {
    setExercises((prev) =>
      prev.map((ex, i) => {
        if (i !== index) return ex;
        const next: StrengthExercise = { ...ex };
        if (value === null) {
          delete (next as Record<string, unknown>)[field];
        } else {
          (next as Record<string, unknown>)[field] = value;
        }
        return next;
      }),
    );
  }

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const body: Record<string, unknown> = {
        date: form.date,
        completed: true,
      };

      if (isCustom) {
        body.templateId = null;
        body.notes = form.customName || null;
        if (form.durationMin) body.durationMin = Number(form.durationMin);
        const validExercises = exercises.filter((ex) => ex.name.trim());
        if (validExercises.length > 0) body.exercises = validExercises;
      } else {
        body.templateId = form.templateId;
        body.notes = form.notes || null;
      }

      const res = await fetch("/api/v1/strength", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const b = await res.json().catch(() => null);
        throw new Error(b?.error?.message ?? "保存失败");
      }
      setForm({
        date: new Date().toISOString().slice(0, 10),
        templateId: "core",
        customName: "",
        durationMin: "",
        notes: "",
      });
      setExercises([]);
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
            记录核心、髋部等辅助训练或自定义训练
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
        <p
          className="rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive"
          role="alert"
        >
          {error}
        </p>
      )}

      <Card>
        <CardHeader>
          <CardTitle>记录一次力量训练</CardTitle>
          <CardDescription>选择模板或创建自定义训练</CardDescription>
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
                  : STRENGTH_TEMPLATES
                ).map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
                <option value="__custom__">自定义…</option>
              </select>
            </div>

            {isCustom ? (
              <>
                <div className="sm:col-span-2 space-y-1">
                  <Label htmlFor="customName">训练名称</Label>
                  <Input
                    id="customName"
                    type="text"
                    value={form.customName}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, customName: e.target.value }))
                    }
                    placeholder="例如：上肢力量"
                    maxLength={60}
                  />
                </div>
                <div className="sm:col-span-2 space-y-1">
                  <Label>动作列表</Label>
                  {exercises.map((ex, i) => (
                    <div
                      key={i}
                      className="flex flex-wrap items-end gap-2 rounded-md border border-border p-2"
                    >
                      <div className="flex-1 min-w-[120px] space-y-1">
                        <Label className="text-xs text-muted-foreground">
                          动作名称
                        </Label>
                        <Input
                          type="text"
                          value={ex.name}
                          onChange={(e) =>
                            updateExercise(i, "name", e.target.value)
                          }
                          placeholder="例如：俯卧撑"
                          maxLength={60}
                        />
                      </div>
                      <div className="w-16 space-y-1">
                        <Label className="text-xs text-muted-foreground">
                          组数
                        </Label>
                        <Input
                          type="number"
                          min={1}
                          max={20}
                          value={ex.sets ?? ""}
                          onChange={(e) =>
                            updateExercise(
                              i,
                              "sets",
                              e.target.value ? Number(e.target.value) : null,
                            )
                          }
                        />
                      </div>
                      <div className="w-16 space-y-1">
                        <Label className="text-xs text-muted-foreground">
                          次数
                        </Label>
                        <Input
                          type="number"
                          min={1}
                          max={100}
                          value={ex.reps ?? ""}
                          onChange={(e) =>
                            updateExercise(
                              i,
                              "reps",
                              e.target.value ? Number(e.target.value) : null,
                            )
                          }
                        />
                      </div>
                      <div className="w-20 space-y-1">
                        <Label className="text-xs text-muted-foreground">
                          重量 (kg)
                        </Label>
                        <Input
                          type="number"
                          min={0}
                          max={500}
                          step={0.5}
                          value={ex.weightKg ?? ""}
                          onChange={(e) =>
                            updateExercise(
                              i,
                              "weightKg",
                              e.target.value ? Number(e.target.value) : null,
                            )
                          }
                        />
                      </div>
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        className="h-9 w-9 text-destructive"
                        onClick={() => removeExercise(i)}
                      >
                        ✕
                      </Button>
                    </div>
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addExercise}
                  >
                    + 添加动作
                  </Button>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="durationMin">预计时长 (分钟)</Label>
                  <Input
                    id="durationMin"
                    type="number"
                    min={1}
                    max={300}
                    value={form.durationMin}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        durationMin: e.target.value,
                      }))
                    }
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="customNotes">备注</Label>
                  <Input
                    id="customNotes"
                    type="text"
                    value={form.notes}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, notes: e.target.value }))
                    }
                    placeholder="可选"
                    maxLength={1000}
                  />
                </div>
              </>
            ) : (
              <>
                {templates.length > 0 && (
                  <div className="sm:col-span-2 text-xs text-muted-foreground">
                    {templates.find((t) => t.id === form.templateId)
                      ?.description}
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
              </>
            )}

            <div className={isCustom ? "sm:col-span-2" : ""}>
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
                  <div className="min-w-0">
                    <div className="font-medium">{s.templateName}</div>
                    <div className="mt-0.5 text-xs text-muted-foreground">
                      {s.date}
                      {s.completed ? " · 已完成" : " · 未完成"}
                      {s.notes ? ` · ${s.notes}` : ""}
                      {s.durationMin ? ` · ${s.durationMin} 分钟` : ""}
                    </div>
                    {s.exercises && s.exercises.length > 0 && (
                      <div className="mt-1 text-xs text-muted-foreground">
                        {s.exercises
                          .map(
                            (ex) =>
                              `${ex.name}${ex.sets ? ` ${ex.sets}×${ex.reps ?? "?"}` : ""}${ex.weightKg ? ` @ ${ex.weightKg}kg` : ""}`,
                          )
                          .join(" · ")}
                      </div>
                    )}
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
