"use client";

import { useState } from "react";
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
import { formatDurationSec, formatPaceMinPerKm } from "@/lib/datetime";
import {
  designIntervalSession,
  type IntervalSessionResult,
} from "@/lib/tools/intervals";

function fieldsToPace(m: string, s: string): number | null {
  const mm = m === "" ? 0 : Number(m);
  const ss = s === "" ? 0 : Number(s);
  if (![mm, ss].every((n) => Number.isFinite(n) && n >= 0)) return null;
  if (ss >= 60) return null;
  const total = mm * 60 + ss;
  return total > 0 ? total / 60 : null;
}

export default function IntervalsPage() {
  const [warmup, setWarmup] = useState("15");
  const [cooldown, setCooldown] = useState("10");
  const [reps, setReps] = useState("6");
  const [meters, setMeters] = useState("1000");
  const [recMin, setRecMin] = useState("2");
  const [recSec, setRecSec] = useState("0");
  const [paceM, setPaceM] = useState("4");
  const [paceS, setPaceS] = useState("0");
  const [result, setResult] = useState<IntervalSessionResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  function onCalc(e?: React.FormEvent) {
    e?.preventDefault();
    setError(null);
    const pace = fieldsToPace(paceM, paceS);
    if (pace == null) {
      setError("请输入有效间歇配速");
      setResult(null);
      return;
    }
    const recoverySec = (Number(recMin) || 0) * 60 + (Number(recSec) || 0);
    try {
      setResult(
        designIntervalSession({
          warmupMin: Number(warmup) || 0,
          cooldownMin: Number(cooldown) || 0,
          blocks: [
            {
              reps: Number(reps),
              workMeters: Number(meters),
              workSec: null,
              recoverySec,
              workPaceMinPerKm: pace,
            },
          ],
        }),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "计算失败");
      setResult(null);
    }
  }

  return (
    <div className="page-shell max-w-lg">
      <div>
        <Link href="/tools" className="text-xs text-muted-foreground hover:text-foreground">
          ← 工具
        </Link>
        <h1 className="page-title mt-1">间歇课设计</h1>
        <p className="page-subtitle">组数 × 距离 × 配速 → 总时间与总里程</p>
      </div>

      {result && (
        <Card>
          <CardContent className="grid grid-cols-2 gap-4 pt-6 text-center">
            <div>
              <div className="text-xs text-muted-foreground">总时长</div>
              <div className="mt-1 text-2xl font-semibold tabular-nums">
                {formatDurationSec(result.totalDurationSec)}
              </div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">总距离</div>
              <div className="mt-1 text-2xl font-semibold tabular-nums">{result.totalDistanceKm}</div>
              <div className="text-[10px] text-muted-foreground">km（含热身放松估）</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">主课距离</div>
              <div className="mt-1 text-lg font-semibold tabular-nums">{result.totalWorkKm} km</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">主课用时</div>
              <div className="mt-1 text-lg font-semibold tabular-nums">
                {formatDurationSec(result.totalWorkSec + result.totalRecoverySec)}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">课表参数</CardTitle>
          <CardDescription>默认一组结构；热身/放松按轻松跑估里程</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onCalc} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>热身（分）</Label>
                <Input type="number" inputMode="numeric" value={warmup} onChange={(e) => setWarmup(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>放松（分）</Label>
                <Input type="number" inputMode="numeric" value={cooldown} onChange={(e) => setCooldown(e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>组数</Label>
                <Input type="number" inputMode="numeric" min={1} value={reps} onChange={(e) => setReps(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>每次距离（米）</Label>
                <Input type="number" inputMode="numeric" min={50} step={50} value={meters} onChange={(e) => setMeters(e.target.value)} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>间歇配速（分&apos;秒 /km）</Label>
              <div className="grid grid-cols-2 gap-2">
                <Input type="number" inputMode="numeric" min={0} value={paceM} onChange={(e) => setPaceM(e.target.value)} placeholder="分" />
                <Input type="number" inputMode="numeric" min={0} max={59} value={paceS} onChange={(e) => setPaceS(e.target.value)} placeholder="秒" />
              </div>
              {fieldsToPace(paceM, paceS) != null && (
                <p className="text-xs text-muted-foreground">
                  = {formatPaceMinPerKm(fieldsToPace(paceM, paceS)!)} /km
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label>组间恢复</Label>
              <div className="grid grid-cols-2 gap-2">
                <Input type="number" inputMode="numeric" min={0} value={recMin} onChange={(e) => setRecMin(e.target.value)} placeholder="分" />
                <Input type="number" inputMode="numeric" min={0} max={59} value={recSec} onChange={(e) => setRecSec(e.target.value)} placeholder="秒" />
              </div>
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" className="w-full touch-manipulation">计算课表</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
