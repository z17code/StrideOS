"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
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
import { workoutTypeOptions } from "@/lib/validators/activity";
import { WORKOUT_LABEL } from "@/lib/plans/types";

const WORKOUT_TYPES = workoutTypeOptions;

function cn(...classes: (string | false | null | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}

interface ActivityData {
  id: string;
  date: string;
  workoutType: string;
  distanceKm: number | null;
  durationMin: number | null;
  actualRpe: number | null;
  avgHeartRate: number | null;
  painLevel: number | null;
  notes: string | null;
  shoeId: string | null;
  planWorkoutId: string | null;
  mutationId: string | null;
  createdAt: string;
}

const EMPTY_FORM = {
  date: new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Shanghai' }),
  workoutType: "easy" as string,
  distanceKm: "" as string | number,
  durationMin: "" as string | number,
  actualRpe: "" as string | number,
  avgHeartRate: "" as string | number,
  painLevel: "" as string | number,
  notes: "",
  mutationId: "",
};

/* ── create form ──────────────────────────────────────── */

function CreateForm({
  onCreated,
}: {
  onCreated: () => void;
}) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCustomType, setShowCustomType] = useState(false);
  const router = useRouter();

  function set<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function numField(
    e: React.ChangeEvent<HTMLInputElement>,
  ): string | number {
    const v = e.target.value;
    if (v === "") return "";
    return Number(v);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const body: Record<string, unknown> = {
      date: form.date,
      workoutType: form.workoutType,
    };
    if (form.distanceKm !== "") body.distanceKm = Number(form.distanceKm);
    if (form.durationMin !== "") body.durationMin = Number(form.durationMin);
    if (form.actualRpe !== "") body.actualRpe = Number(form.actualRpe);
    if (form.avgHeartRate !== "")
      body.avgHeartRate = Number(form.avgHeartRate);
    if (form.painLevel !== "") body.painLevel = Number(form.painLevel);
    if (form.notes) body.notes = form.notes;
    if (form.mutationId) body.mutationId = form.mutationId;

    try {
      const res = await fetch("/api/v1/activities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error?.message ?? "保存失败");
        return;
      }
      setForm(EMPTY_FORM);
      onCreated();
      router.refresh();
    } catch {
      setError("网络错误");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">记录训练</CardTitle>
        <CardDescription>添加新的训练记录</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={submit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">日期</Label>
              <Input
                type="date"
                value={form.date}
                onChange={(e) => set("date", e.target.value)}
                required
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">类型</Label>
              <select
                value={showCustomType ? "__custom__" : form.workoutType}
                onChange={(e) => {
                  if (e.target.value === "__custom__") {
                    setShowCustomType(true);
                  } else {
                    setShowCustomType(false);
                    set("workoutType", e.target.value);
                  }
                }}
                className="flex h-10 w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {WORKOUT_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {WORKOUT_LABEL[t as keyof typeof WORKOUT_LABEL] ?? t}
                  </option>
                ))}
                <option value="__custom__">自定义…</option>
              </select>
              {showCustomType && (
                <Input
                  type="text"
                  placeholder="输入自定义类型名称"
                  value={form.workoutType === "__custom__" ? "" : (form.workoutType as string)}
                  onChange={(e) => set("workoutType", e.target.value)}
                  className="mt-1"
                  maxLength={40}
                />
              )}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">距离 (km)</Label>
              <Input
                type="number"
                step="0.1"
                min="0"
                max="200"
                placeholder="0"
                value={form.distanceKm}
                onChange={(e) => set("distanceKm", numField(e))}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">时长 (min)</Label>
              <Input
                type="number"
                min="0"
                max="1440"
                placeholder="0"
                value={form.durationMin}
                onChange={(e) => set("durationMin", numField(e))}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">心率 (bpm)</Label>
              <Input
                type="number"
                min="30"
                max="250"
                placeholder="—"
                value={form.avgHeartRate}
                onChange={(e) => set("avgHeartRate", numField(e))}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">RPE (1-10)</Label>
              <Input
                type="number"
                min="1"
                max="10"
                placeholder="—"
                value={form.actualRpe}
                onChange={(e) => set("actualRpe", numField(e))}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">疼痛 (0-10)</Label>
              <Input
                type="number"
                min="0"
                max="10"
                placeholder="—"
                value={form.painLevel}
                onChange={(e) => set("painLevel", numField(e))}
              />
            </div>
          </div>

          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">备注</Label>
            <Textarea
              value={form.notes}
              onChange={(e) => set("notes", e.target.value)}
              placeholder="路线、感受、配速…"
              rows={2}
              className="resize-none text-sm"
            />
          </div>

          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">
              幂等 ID（可选）
            </Label>
            <Input
              value={form.mutationId}
              onChange={(e) => set("mutationId", e.target.value)}
              placeholder="防止重复提交，如 strava_abc123"
            />
          </div>

          {error && (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          )}

          <Button type="submit" disabled={saving} className="w-full">
            {saving ? "保存中…" : "保存"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

/* ── activity list ────────────────────────────────────── */

function ActivityList({ items, onChanged }: { items: ActivityData[]; onChanged: () => void }) {
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const router = useRouter();

  async function remove(id: string) {
    setDeletingId(id);
    try {
      const res = await fetch(`/api/v1/activities/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json();
        alert(data?.error?.message ?? "删除失败");
        return;
      }
      onChanged();
      router.refresh();
    } catch {
      alert("网络错误");
    } finally {
      setDeletingId(null);
    }
  }

  if (items.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">训练记录</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">暂无记录</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">训练记录</CardTitle>
        <CardDescription>共 {items.length} 条</CardDescription>
      </CardHeader>
      <CardContent>
        <ul className="space-y-2">
          {items.map((a) => (
            <li
              key={a.id}
              className="rounded-md border border-border p-3"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="space-y-1 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">
                      {WORKOUT_LABEL[a.workoutType as keyof typeof WORKOUT_LABEL] ??
                        a.workoutType}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {a.date}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground tabular-nums">
                    {a.distanceKm != null ? `${a.distanceKm} km` : "—"}
                    {a.durationMin != null
                      ? ` · ${a.durationMin} min`
                      : ""}
                    {a.actualRpe != null ? ` · RPE ${a.actualRpe}` : ""}
                    {a.avgHeartRate != null
                      ? ` · ${a.avgHeartRate} bpm`
                      : ""}
                    {a.painLevel != null ? ` · 疼痛 ${a.painLevel}` : ""}
                  </p>
                  {a.notes && (
                    <p className="text-xs text-muted-foreground">{a.notes}</p>
                  )}
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => remove(a.id)}
                  disabled={deletingId === a.id}
                  className="shrink-0 text-destructive hover:text-destructive"
                >
                  {deletingId === a.id ? "…" : "删除"}
                </Button>
              </div>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

/* ── main page ────────────────────────────────────────── */

export default function ActivityPage() {
  const [activities, setActivities] = useState<ActivityData[]>([]);
  const [loading, setLoading] = useState(true);
  const loaded = useRef(false);

  const loadData = useCallback(async () => {
    if (loaded.current) return;
    loaded.current = true;
    setLoading(true);
    try {
      const res = await fetch("/api/v1/activities?limit=50");
      if (res.ok) {
        const data = await res.json();
        setActivities(data.activities ?? []);
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  function handleCreated() {
    loaded.current = false;
    loadData();
  }

  if (loading) {
    return (
      <div className="page-shell">
        <div>
          <h1 className="page-title">记录</h1>
          <div className="skeleton mt-2 h-4 w-28" />
        </div>
        <div className="skeleton h-56 w-full rounded-xl" />
        <div className="skeleton h-40 w-full rounded-xl" />
      </div>
    );
  }

  return (
    <div className="page-shell">
      <div>
        <h1 className="page-title">记录</h1>
        <p className="page-subtitle">
          手动添加训练记录
        </p>
      </div>
      <CreateForm onCreated={handleCreated} />
      <ActivityList items={activities} onChanged={handleCreated} />
    </div>
  );
}
