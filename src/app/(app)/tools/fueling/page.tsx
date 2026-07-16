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
import {
  estimateFueling,
  type FuelingResult,
  type WeatherHint,
} from "@/lib/tools/fueling";

const WEATHER: Array<{ value: WeatherHint; label: string }> = [
  { value: "cool", label: "凉爽" },
  { value: "mild", label: "适中" },
  { value: "hot", label: "炎热" },
];

export default function FuelingPage() {
  const [distance, setDistance] = useState("");
  const [hours, setHours] = useState("");
  const [minutes, setMinutes] = useState("");
  const [weather, setWeather] = useState<WeatherHint>("mild");
  const [weight, setWeight] = useState("");
  const [result, setResult] = useState<FuelingResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  function onCalc(e?: React.FormEvent) {
    e?.preventDefault();
    setError(null);
    const h = hours === "" ? 0 : Number(hours);
    const m = minutes === "" ? 0 : Number(minutes);
    const durationMin = h * 60 + m;
    try {
      setResult(
        estimateFueling({
          distanceKm: Number(distance),
          durationMin,
          weather,
          weightKg: weight === "" ? null : Number(weight),
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
        <h1 className="page-title mt-1">长跑补给估算</h1>
        <p className="page-subtitle">水分 · 碳水 · 能量胶次数粗估</p>
      </div>

      {result && (
        <Card>
          <CardContent className="grid grid-cols-2 gap-4 pt-6 text-center">
            <div>
              <div className="text-xs text-muted-foreground">建议补水</div>
              <div className="mt-1 text-2xl font-semibold tabular-nums">{result.waterMl}</div>
              <div className="text-[10px] text-muted-foreground">ml 全程</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">能量胶</div>
              <div className="mt-1 text-2xl font-semibold tabular-nums">{result.gelCount}</div>
              <div className="text-[10px] text-muted-foreground">约 {result.gelCount} 支</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">碳水</div>
              <div className="mt-1 text-lg font-semibold tabular-nums">
                {result.carbGramsLow}–{result.carbGramsHigh}
              </div>
              <div className="text-[10px] text-muted-foreground">克</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">钠（粗估）</div>
              <div className="mt-1 text-lg font-semibold tabular-nums">{result.sodiumMg}</div>
              <div className="text-[10px] text-muted-foreground">mg</div>
            </div>
          </CardContent>
        </Card>
      )}

      {result && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">提示</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
              {result.notes.map((n) => (
                <li key={n}>{n}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">输入</CardTitle>
          <CardDescription>非医疗建议，请结合个人肠胃调整</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onCalc} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="dist">距离（km）</Label>
              <Input id="dist" type="number" inputMode="decimal" min={1} step={0.1} value={distance} onChange={(e) => setDistance(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>预计用时</Label>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Input type="number" inputMode="numeric" min={0} value={hours} onChange={(e) => setHours(e.target.value)} placeholder="小时" />
                  <span className="mt-0.5 block text-center text-[10px] text-muted-foreground">时</span>
                </div>
                <div>
                  <Input type="number" inputMode="numeric" min={0} max={59} value={minutes} onChange={(e) => setMinutes(e.target.value)} placeholder="分钟" />
                  <span className="mt-0.5 block text-center text-[10px] text-muted-foreground">分</span>
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <Label>天气</Label>
              <div className="flex gap-2">
                {WEATHER.map((w) => (
                  <Button key={w.value} type="button" size="sm" variant={weather === w.value ? "default" : "outline"} className="flex-1 touch-manipulation" onClick={() => setWeather(w.value)}>
                    {w.label}
                  </Button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="wt">体重 kg（可选）</Label>
              <Input id="wt" type="number" inputMode="decimal" value={weight} onChange={(e) => setWeight(e.target.value)} />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" className="w-full touch-manipulation">估算补给</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
