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
import { computeHrZones } from "@/lib/tools/heart-rate";

export default function HeartRatePage() {
  const [age, setAge] = useState("");
  const [hrMax, setHrMax] = useState("");
  const [hrRest, setHrRest] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ReturnType<typeof computeHrZones> | null>(null);

  function onCalc(e?: React.FormEvent) {
    e?.preventDefault();
    setError(null);
    try {
      const r = computeHrZones({
        age: age === "" ? null : Number(age),
        hrMax: hrMax === "" ? null : Number(hrMax),
        hrRest: hrRest === "" ? null : Number(hrRest),
      });
      setResult(r);
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
        <h1 className="page-title mt-1">心率区间</h1>
        <p className="page-subtitle">按年龄或实测最大心率估算 Z1–Z5（仅供参考）</p>
      </div>

      {result && (
        <Card>
          <CardContent className="pt-6">
            <div className="mb-4 text-center text-sm text-muted-foreground">
              最大心率 <span className="font-medium text-foreground tabular-nums">{result.hrMax}</span>
              {" · "}
              {result.method === "karvonen" ? "储备心率法" : "最大心率百分比"}
            </div>
            <ul className="space-y-3">
              {result.zones.map((z) => (
                <li
                  key={z.key}
                  className="flex items-start justify-between gap-3 border-b border-border/60 pb-3 last:border-0"
                >
                  <div>
                    <div className="text-sm font-medium">{z.label}</div>
                    <div className="text-xs text-muted-foreground">{z.purpose}</div>
                  </div>
                  <div className="shrink-0 text-sm tabular-nums">
                    {z.minBpm}–{z.maxBpm}
                    <span className="text-[10px] text-muted-foreground"> bpm</span>
                  </div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">输入</CardTitle>
          <CardDescription>填写年龄或实测 HRmax；可选静息心率更准</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onCalc} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="age">年龄</Label>
                <Input id="age" type="number" inputMode="numeric" min={10} max={100} value={age} onChange={(e) => setAge(e.target.value)} placeholder="可选" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="hrMax">最大心率</Label>
                <Input id="hrMax" type="number" inputMode="numeric" min={120} max={230} value={hrMax} onChange={(e) => setHrMax(e.target.value)} placeholder="可选" />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="hrRest">静息心率（可选）</Label>
              <Input id="hrRest" type="number" inputMode="numeric" min={30} max={120} value={hrRest} onChange={(e) => setHrRest(e.target.value)} placeholder="起床后静坐测量" />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" className="w-full touch-manipulation">开始计算</Button>
          </form>
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground">
        估算公式非实验室检测。用药、疾病或异常心率请遵医嘱，勿盲目按区间硬练。
      </p>
    </div>
  );
}
