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
import { formatPaceMinPerKm } from "@/lib/datetime";
import { convertPacePower, type PacePowerResult } from "@/lib/tools/power";

function fieldsToPace(m: string, s: string): number | null {
  const mm = m === "" ? 0 : Number(m);
  const ss = s === "" ? 0 : Number(s);
  if (![mm, ss].every((n) => Number.isFinite(n) && n >= 0)) return null;
  if (ss >= 60) return null;
  const total = mm * 60 + ss;
  return total > 0 ? total / 60 : null;
}

export default function PowerPage() {
  const [weight, setWeight] = useState("");
  const [paceM, setPaceM] = useState("");
  const [paceS, setPaceS] = useState("");
  const [power, setPower] = useState("");
  const [result, setResult] = useState<PacePowerResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  function onCalc(e?: React.FormEvent) {
    e?.preventDefault();
    setError(null);
    try {
      const pace = fieldsToPace(paceM, paceS);
      setResult(
        convertPacePower({
          weightKg: Number(weight),
          paceMinPerKm: pace,
          powerW: power === "" ? null : Number(power),
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
        <h1 className="page-title mt-1">配速 ↔ 功率</h1>
        <p className="page-subtitle">平路粗换算，不能替代功率计</p>
      </div>

      {result && (
        <Card>
          <CardContent className="grid grid-cols-2 gap-4 pt-6 text-center">
            <div>
              <div className="text-xs text-muted-foreground">配速</div>
              <div className="mt-1 text-2xl font-semibold tabular-nums">
                {formatPaceMinPerKm(result.paceMinPerKm)}
              </div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">功率</div>
              <div className="mt-1 text-2xl font-semibold tabular-nums">{result.powerW}</div>
              <div className="text-[10px] text-muted-foreground">W</div>
            </div>
            <div className="col-span-2 text-sm text-muted-foreground">
              相对功率 <span className="font-medium text-foreground tabular-nums">{result.wPerKg}</span> W/kg
            </div>
            <p className="col-span-2 text-xs text-muted-foreground">{result.note}</p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">输入</CardTitle>
          <CardDescription>体重必填；配速与功率填一项即可互算</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onCalc} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="pw-w">体重（kg）</Label>
              <Input id="pw-w" type="number" inputMode="decimal" value={weight} onChange={(e) => setWeight(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>配速（分&apos;秒 /km）</Label>
              <div className="grid grid-cols-2 gap-2">
                <Input type="number" value={paceM} onChange={(e) => setPaceM(e.target.value)} placeholder="分" />
                <Input type="number" value={paceS} onChange={(e) => setPaceS(e.target.value)} placeholder="秒" />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="pw-p">功率（W）</Label>
              <Input id="pw-p" type="number" inputMode="numeric" value={power} onChange={(e) => setPower(e.target.value)} placeholder="或填功率" />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" className="w-full touch-manipulation">换算</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
