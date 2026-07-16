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
import { assessShoeLife, DEFAULT_SHOE_LIFE_KM } from "@/lib/tools/shoe-life";
import { cn } from "@/lib/utils";

interface ShoeData {
  id: string;
  brand: string;
  model: string;
  purchaseDate: string | null;
  totalKm: number;
  lastUsedAt: string | null;
  isRetired: boolean;
  createdAt: string;
}

const EMPTY = {
  brand: "",
  model: "",
  purchaseDate: "",
  totalKm: "" as string | number,
};

function formatKm(n: number) {
  return `${n.toFixed(1)} km`;
}

export default function ShoesPage() {
  const [shoes, setShoes] = useState<ShoeData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [showRetired, setShowRetired] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/v1/shoes");
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error?.message ?? "加载失败");
      }
      const data = await res.json();
      setShoes(data.shoes ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "加载失败");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const body: Record<string, unknown> = {
      brand: form.brand.trim(),
      model: form.model.trim(),
    };
    if (form.purchaseDate) body.purchaseDate = form.purchaseDate;
    if (form.totalKm !== "") body.totalKm = Number(form.totalKm);

    try {
      const res = await fetch("/api/v1/shoes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const b = await res.json().catch(() => null);
        throw new Error(b?.error?.message ?? "创建失败");
      }
      setForm(EMPTY);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "创建失败");
    } finally {
      setSaving(false);
    }
  }

  async function retire(id: string) {
    setError(null);
    try {
      const res = await fetch(`/api/v1/shoes/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isRetired: true }),
      });
      if (!res.ok) {
        const b = await res.json().catch(() => null);
        throw new Error(b?.error?.message ?? "退役失败");
      }
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "退役失败");
    }
  }

  async function remove(id: string) {
    if (!confirm("确认删除这双跑鞋？关联的训练记录鞋引用将置空。")) return;
    setError(null);
    try {
      const res = await fetch(`/api/v1/shoes/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const b = await res.json().catch(() => null);
        throw new Error(b?.error?.message ?? "删除失败");
      }
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "删除失败");
    }
  }

  const visible = shoes.filter((s) => showRetired || !s.isRetired);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">跑鞋管理</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            记录跑鞋、累计里程与寿命进度（默认 700 km）
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
          <CardTitle>添加跑鞋</CardTitle>
          <CardDescription>品牌 + 型号，可选购入日期与初始里程</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={create} className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label htmlFor="brand">品牌</Label>
              <Input
                id="brand"
                required
                value={form.brand}
                onChange={(e) =>
                  setForm((f) => ({ ...f, brand: e.target.value }))
                }
                placeholder="Nike"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="model">型号</Label>
              <Input
                id="model"
                required
                value={form.model}
                onChange={(e) =>
                  setForm((f) => ({ ...f, model: e.target.value }))
                }
                placeholder="Pegasus 41"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="purchaseDate">购入日期</Label>
              <Input
                id="purchaseDate"
                type="date"
                value={form.purchaseDate}
                onChange={(e) =>
                  setForm((f) => ({ ...f, purchaseDate: e.target.value }))
                }
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="totalKm">初始里程 (km)</Label>
              <Input
                id="totalKm"
                type="number"
                min={0}
                step={0.1}
                value={form.totalKm}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    totalKm: e.target.value === "" ? "" : Number(e.target.value),
                  }))
                }
                placeholder="0"
              />
            </div>
            <div className="sm:col-span-2">
              <Button type="submit" disabled={saving}>
                {saving ? "保存中…" : "添加"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium">我的跑鞋</h2>
        <label className="flex items-center gap-2 text-xs text-muted-foreground">
          <input
            type="checkbox"
            checked={showRetired}
            onChange={(e) => setShowRetired(e.target.checked)}
          />
          显示已退役
        </label>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">加载中…</p>
      ) : visible.length === 0 ? (
        <p className="text-sm text-muted-foreground">暂无跑鞋</p>
      ) : (
        <ul className="space-y-3">
          {visible.map((s) => (
            <li key={s.id}>
              <Card className={s.isRetired ? "opacity-60" : undefined}>
                <CardContent className="flex items-center justify-between gap-3 p-4">
                  <div>
                    <div className="font-medium">
                      {s.brand} {s.model}
                      {s.isRetired && (
                        <span className="ml-2 text-xs text-muted-foreground">
                          已退役
                        </span>
                      )}
                    </div>
                    {(() => {
                      const life = assessShoeLife({
                        totalKm: s.totalKm,
                        lifeKm: DEFAULT_SHOE_LIFE_KM,
                      });
                      return (
                        <div className="mt-1.5 space-y-1">
                          <div className="text-xs text-muted-foreground">
                            {formatKm(s.totalKm)} / {life.lifeKm} km
                            {s.purchaseDate ? ` · 购于 ${s.purchaseDate}` : ""}
                            {!s.isRetired && (
                              <span
                                className={cn(
                                  "ml-2",
                                  life.status === "retire" && "text-destructive",
                                  life.status === "warn" && "text-orange-500",
                                  life.status === "fresh" &&
                                    "text-emerald-600 dark:text-emerald-400",
                                )}
                              >
                                {life.statusLabel}
                                {life.remainingKm > 0
                                  ? ` · 约剩 ${life.remainingKm} km`
                                  : ""}
                              </span>
                            )}
                          </div>
                          {!s.isRetired && (
                            <div className="h-1.5 max-w-[220px] overflow-hidden rounded-full bg-muted">
                              <div
                                className={cn(
                                  "h-full rounded-full",
                                  life.status === "retire" && "bg-destructive",
                                  life.status === "warn" && "bg-orange-500",
                                  life.status === "ok" && "bg-foreground/70",
                                  life.status === "fresh" &&
                                    "bg-emerald-500/80",
                                )}
                                style={{ width: `${Math.min(100, life.percentUsed)}%` }}
                              />
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                  <div className="flex shrink-0 gap-2">
                    {!s.isRetired && (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => void retire(s.id)}
                      >
                        退役
                      </Button>
                    )}
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => void remove(s.id)}
                    >
                      删除
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
