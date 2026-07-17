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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { WORKOUT_LABEL } from "@/lib/plans/types";

function cn(...classes: (string | false | null | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}

interface CheckinData {
  id: string;
  date: string;
  fatigueLevel: number;
  painLevel: number;
  notes: string | null;
  createdAt: string;
}

interface ActivityData {
  id: string;
  date: string;
  workoutType: string;
  distanceKm: number | null;
  durationMin: number | null;
  actualRpe: number | null;
  painLevel: number | null;
  notes: string | null;
}

interface ProposalRecord {
  id: string;
  planVersionFrom: string;
  planVersionTo: string | null;
  changesSnapshot: unknown;
  reason: string;
  status: string;
  createdAt: string;
  confirmedAt: string | null;
}

/* ── fatigue/pain sliders ─────────────────────────────── */

function FatigueSlider({
  value,
  onChange,
}: {
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="space-y-1">
      <Label className="text-xs text-muted-foreground">
        疲劳 {value}/5
      </Label>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => onChange(n)}
            className={cn(
              "h-9 flex-1 rounded-lg border text-xs font-medium touch-manipulation transition-colors active:scale-95",
              n <= value
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border hover:bg-muted",
            )}
          >
            {n}
          </button>
        ))}
      </div>
    </div>
  );
}

function PainSlider({
  value,
  onChange,
}: {
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="space-y-1">
      <Label className="text-xs text-muted-foreground">
        疼痛 {value}/10
      </Label>
      <div className="grid grid-cols-6 gap-1">
        {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => onChange(n)}
            className={cn(
              "h-8 rounded-lg border text-xs touch-manipulation transition-colors active:scale-95",
              n <= value
                ? n >= 7
                  ? "border-destructive bg-destructive text-white"
                  : n >= 4
                    ? "border-orange-400 bg-orange-400 text-white"
                    : "border-primary bg-primary text-primary-foreground"
                : "border-border hover:bg-muted",
            )}
          >
            {n}
          </button>
        ))}
      </div>
    </div>
  );
}

/* ── check-in section ─────────────────────────────────── */

function CheckinSection({
  initial,
  onSaved,
}: {
  initial: CheckinData | null;
  onSaved: (c: CheckinData) => void;
}) {
  const [fatigue, setFatigue] = useState(initial?.fatigueLevel ?? 3);
  const [pain, setPain] = useState(initial?.painLevel ?? 0);
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/v1/check-ins", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Shanghai' }),
          fatigueLevel: fatigue,
          painLevel: pain,
          notes: notes || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error?.message ?? "保存失败");
        return;
      }
      onSaved(data.checkin);
      router.refresh();
    } catch {
      setError("网络错误");
    } finally {
      setSaving(false);
    }
  };

  const isEdit = !!initial;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">
          {isEdit ? "今日打卡" : "打卡"}
        </CardTitle>
        <CardDescription>
          疲劳 1–5 · 疼痛 0–10
          {isEdit && " · 更新今日状态"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <FatigueSlider value={fatigue} onChange={setFatigue} />
          <PainSlider value={pain} onChange={setPain} />
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">备注</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="可选：身体感受、睡眠质量等…"
              rows={2}
              className="resize-none text-sm"
            />
          </div>
          {error && (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          )}
          <Button type="submit" disabled={saving} className="w-full">
            {saving ? "保存中…" : isEdit ? "更新打卡" : "提交打卡"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

/* ── adjustments section ──────────────────────────────── */

interface ChangeRecord {
  type: string;
  description: string;
  severity: string;
}

function AdjustmentsSection({
  proposals,
  onAction,
}: {
  proposals: ProposalRecord[];
  onAction: () => void;
}) {
  const [proposing, setProposing] = useState(false);
  const [proposeError, setProposeError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const router = useRouter();

  async function propose() {
    setProposing(true);
    setProposeError(null);
    try {
      const res = await fetch("/api/v1/adjustments/propose", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: "daily_checkin" }),
      });
      const data = await res.json();
      if (data.error) {
        setProposeError(data.error.message);
        return;
      }
      onAction();
      router.refresh();
    } catch {
      setProposeError("网络错误");
    } finally {
      setProposing(false);
    }
  }

  async function confirm(id: string) {
    setBusyId(id);
    try {
      const res = await fetch(`/api/v1/adjustments/${id}/confirm`, {
        method: "PUT",
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data?.error?.message ?? "操作失败");
        return;
      }
      onAction();
      router.refresh();
    } catch {
      alert("网络错误");
    } finally {
      setBusyId(null);
    }
  }

  async function reject(id: string) {
    setBusyId(id);
    try {
      const res = await fetch(`/api/v1/adjustments/${id}/reject`, {
        method: "PUT",
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data?.error?.message ?? "操作失败");
        return;
      }
      onAction();
      router.refresh();
    } catch {
      alert("网络错误");
    } finally {
      setBusyId(null);
    }
  }

  const pending = proposals.filter((p) => p.status === "pending");
  const confirmed = proposals.filter((p) => p.status === "confirmed");

  const severityColor = (s: string) =>
    s === "critical"
      ? "text-destructive"
      : s === "warning"
        ? "text-orange-500"
        : "text-muted-foreground";

  const severityIcon = (s: string) =>
    s === "critical" ? "●" : s === "warning" ? "▲" : "○";

  function extractChanges(snapshot: unknown): ChangeRecord[] {
    if (!snapshot || typeof snapshot !== "object") return [];
    const obj = snapshot as Record<string, unknown>;
    if (Array.isArray(obj.proposals)) return obj.proposals as ChangeRecord[];
    return [];
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">调课建议</CardTitle>
        <CardDescription>
          {pending.length > 0
            ? `${pending.length} 条待处理`
            : "暂无待处理提案"}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {!proposing && proposals.length === 0 && (
          <Button
            type="button"
            variant="outline"
            onClick={propose}
            className="w-full"
          >
            智能调课分析
          </Button>
        )}
        {proposeError && (
          <p className="text-sm text-destructive">{proposeError}</p>
        )}
        {proposing && (
          <p className="text-sm text-muted-foreground text-center">
            分析中…
          </p>
        )}

        {pending.map((p) => {
          const changes = extractChanges(p.changesSnapshot);
          return (
            <div
              key={p.id}
              className="rounded-md border border-border p-3 space-y-2"
            >
              <p className="text-xs text-muted-foreground">
                原因：{p.reason}
              </p>
              <ul className="space-y-1">
                {changes.map((ch, i) => (
                  <li
                    key={i}
                    className="text-sm flex items-start gap-2"
                  >
                    <span
                      className={cn(
                        "mt-0.5 shrink-0 text-xs",
                        severityColor(ch.severity),
                      )}
                    >
                      {severityIcon(ch.severity)}
                    </span>
                    <span>{ch.description}</span>
                  </li>
                ))}
              </ul>
              <div className="flex gap-2 pt-1">
                <Button
                  size="sm"
                  onClick={() => confirm(p.id)}
                  disabled={busyId === p.id}
                  className="flex-1"
                >
                  {busyId === p.id ? "处理中…" : "确认"}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => reject(p.id)}
                  disabled={busyId === p.id}
                  className="flex-1"
                >
                  忽略
                </Button>
              </div>
            </div>
          );
        })}

        {confirmed.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">已确认</p>
            {confirmed.map((p) => (
              <div
                key={p.id}
                className="rounded-md bg-muted/50 p-2 text-xs text-muted-foreground"
              >
                {p.reason} · {p.confirmedAt?.slice(0, 10)}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/* ── today's activities section ───────────────────────── */

function TodayActivities({ activities }: { activities: ActivityData[] }) {
  if (activities.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">今日训练</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted-foreground">
              暂无记录 — 去添加今日训练
            </p>
            <a
              href="/activity"
              className="inline-flex h-9 items-center justify-center rounded-lg border border-border bg-card px-3 text-sm font-medium touch-manipulation active:opacity-80"
            >
              去记录
            </a>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">今日训练</CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="space-y-2">
          {activities.map((a) => (
            <li
              key={a.id}
              className="rounded-lg border border-border/80 bg-muted/20 p-3 space-y-1"
            >
              <div className="flex items-center justify-between">
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
                {a.painLevel != null ? ` · 疼痛 ${a.painLevel}` : ""}
              </p>
              {a.notes && (
                <p className="text-xs text-muted-foreground">{a.notes}</p>
              )}
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

/* ── main page ────────────────────────────────────────── */

export default function TodayPage() {
  const [checkin, setCheckin] = useState<CheckinData | null>(null);
  const [activities, setActivities] = useState<ActivityData[]>([]);
  const [proposals, setProposals] = useState<ProposalRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const loaded = useRef(false);

  const loadData = useCallback(async () => {
    if (loaded.current) return;
    loaded.current = true;
    setLoading(true);
    try {
      const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Shanghai' });
      const [checkinRes, actRes, adjRes] = await Promise.all([
        fetch(`/api/v1/check-ins?date=${today}`),
        fetch("/api/v1/activities?limit=5"),
        fetch("/api/v1/adjustments"),
      ]);

      if (checkinRes.ok) {
        const cd = await checkinRes.json();
        if (cd.checkin) setCheckin(cd.checkin);
      }
      if (actRes.ok) {
        const ad = await actRes.json();
        setActivities(ad.activities ?? []);
      }
      if (adjRes.ok) {
        const pd = await adjRes.json();
        setProposals(pd.adjustments ?? []);
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

  function handleCheckinSaved(c: CheckinData) {
    setCheckin(c);
  }

  function handleAdjustmentAction() {
    fetch("/api/v1/adjustments")
      .then((r) => r.json())
      .then((d) => setProposals(d.adjustments ?? []))
      .catch(() => {});
  }

  const todayFormatted = new Date().toLocaleDateString("zh-CN", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  if (loading) {
    return (
      <div className="page-shell">
        <div className="page-header">
          <p className="page-eyebrow">TODAY</p>
          <h1 className="page-title">今日</h1>
          <div className="skeleton mt-2 h-4 w-40" />
        </div>
        <div className="grid gap-5 lg:grid-cols-2">
          <div className="skeleton h-48 w-full rounded-2xl" />
          <div className="skeleton h-48 w-full rounded-2xl" />
        </div>
        <div className="skeleton h-24 w-full rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="page-shell">
      <div className="page-header">
        <p className="page-eyebrow">TODAY</p>
        <h1 className="page-title">今日</h1>
        <p className="page-subtitle">{todayFormatted}</p>
      </div>

      <div className="grid gap-5 lg:grid-cols-2 lg:items-start">
        <CheckinSection initial={checkin} onSaved={handleCheckinSaved} />
        <TodayActivities activities={activities} />
      </div>
      <AdjustmentsSection
        proposals={proposals}
        onAction={handleAdjustmentAction}
      />
    </div>
  );
}

