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
import { adjustPaceForGrade, type GradePaceResult } from "@/lib/tools/grade";

function fieldsToPace(m: string, s: string): number | null {
  const mm = m === "" ? 0 : Number(m);
  const ss = s === "" ? 0 : Number(s);
  if (![mm, ss].every((n) => Number.isFinite(n) && n >= 0)) return null;
  if (ss >= 60) return null;
  const total = mm * 60 + ss;
  return total > 0 ? total / 60 : null;
}

export default function GradePage() {
  const [paceM, setPaceM] = useState("5");
  const [paceS, setPaceS] = useState("30");
  const [grade, setGrade] = useState("5");
  const [distance, setDistance] = useState("");
  const [result, setResult] = useState<GradePaceResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  function onCalc(e?: React.FormEvent) {
    e?.preventDefault();
    setError(null);
    const pace = fieldsToPace(paceM, paceS);
    if (pace == null) {
      setError("请输入平路配速");
      setResult(null);
      return;
    }
    try {
      setResult(
        adjustPaceForGrade({
          flatPaceMinPerKm: pace,
          gradePercent: Number(grade),
          distanceKm: distance === "" ? undefined : Number(distance),
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
        <h1 className="page-title mt-1">坡度配速修正</h1>
        <p className="page-subtitle">上坡减速 / 下坡部分回补的经验估算</p>
      </div>

      {result && (
        <Card>
          <CardContent className="space-y-3 pt-6 text-center">
            <div>
              <div className="text-xs text-muted-foreground">修正后配速</div>
              <div className="mt-1 text-4xl font-semibold tabular-nums">
                {formatPaceMinPerKm(result.adjustedPaceMinPerKm)}
              </div>
              <div className="text-xs text-muted-foreground">min/km</div>
            </div>
            <div className="text-sm text-muted-foreground">
              平路 {formatPaceMinPerKm(result.flatPaceMinPerKm)} · 变化{" "}
              <span className="font-medium text-foreground">
                {result.deltaSecPerKm > 0 ? "+" : ""}
                {result.deltaSecPerKm} 秒/km
              </span>
            </div>
            {result.estimatedTimeSec != null && (
              <div className="text-sm">
                预计用时{" "}
                <span className="font-medium tabular-nums">
                  {formatDurationSec(result.estimatedTimeSec)}
                </span>
              </div>
            )}
            <p className="text-xs text-muted-foreground">{result.note}</p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">输入</CardTitle>
          <CardDescription>坡度填百分比，上坡为正、下坡为负</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onCalc} className="space-y-4">
            <div className="space-y-2">
              <Label>平路配速（分&apos;秒）</Label>
              <div className="grid grid-cols-2 gap-2">
                <Input type="number" value={paceM} onChange={(e) => setPaceM(e.target.value)} />
                <Input type="number" value={paceS} onChange={(e) => setPaceS(e.target.value)} />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="grade">坡度 %</Label>
              <Input id="grade" type="number" step={0.5} value={grade} onChange={(e) => setGrade(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="gdist">路段距离 km（可选）</Label>
              <Input id="gdist" type="number" step={0.1} value={distance} onChange={(e) => setDistance(e.target.value)} />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" className="w-full touch-manipulation">计算</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
