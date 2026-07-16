"use client";

import { useMemo, useState } from "react";
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
  BMI_RANGES,
  computeBmi,
  type BmiCategory,
  type BmiResult,
} from "@/lib/tools/bmi";
import { cn } from "@/lib/utils";

const CATEGORY_CLASS: Record<BmiCategory, string> = {
  underweight: "text-blue-500 dark:text-blue-400",
  normal: "text-emerald-600 dark:text-emerald-400",
  overweight: "text-orange-500 dark:text-orange-400",
  obese: "text-red-500 dark:text-red-400",
};

export default function BmiCalculatorPage() {
  const [height, setHeight] = useState("");
  const [weight, setWeight] = useState("");
  const [result, setResult] = useState<BmiResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  function calculate(e?: React.FormEvent) {
    e?.preventDefault();
    setError(null);
    const h = Number(height);
    const w = Number(weight);
    if (!Number.isFinite(h) || h <= 0) {
      setError("请输入有效身高（厘米）");
      setResult(null);
      return;
    }
    if (!Number.isFinite(w) || w <= 0) {
      setError("请输入有效体重（公斤）");
      setResult(null);
      return;
    }
    try {
      setResult(computeBmi(h, w));
    } catch (err) {
      setError(err instanceof Error ? err.message : "计算失败");
      setResult(null);
    }
  }

  const ranges = useMemo(() => BMI_RANGES, []);

  return (
    <div className="page-shell max-w-lg">
      <div>
        <Link
          href="/tools"
          className="text-xs text-muted-foreground hover:text-foreground"
        >
          ← 工具
        </Link>
        <h1 className="page-title mt-1">BMI 计算器</h1>
        <p className="page-subtitle">根据身高与体重计算身体质量指数</p>
      </div>

      {result && (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-xs text-muted-foreground">BMI 值</div>
              <div className="mt-1 text-5xl font-semibold tabular-nums tracking-tight">
                {result.bmi.toFixed(1)}
              </div>
              <div className="mt-3 flex flex-wrap items-center justify-center gap-x-6 gap-y-1 text-sm">
                <span>
                  身体状况：
                  <span className={cn("font-medium", CATEGORY_CLASS[result.category])}>
                    {result.categoryLabel}
                  </span>
                </span>
                <span className="text-muted-foreground">
                  标准体重：
                  <span className="font-medium text-foreground">
                    {result.idealWeightKg.toFixed(1)} kg
                  </span>
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">输入</CardTitle>
          <CardDescription>身高单位厘米，体重单位公斤</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={calculate} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="bmi-height">身高（厘米）</Label>
              <Input
                id="bmi-height"
                type="number"
                inputMode="decimal"
                min={50}
                max={250}
                step={0.1}
                value={height}
                onChange={(e) => setHeight(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bmi-weight">体重（公斤）</Label>
              <Input
                id="bmi-weight"
                type="number"
                inputMode="decimal"
                min={10}
                max={300}
                step={0.1}
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
              />
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <Button type="submit" className="w-full touch-manipulation">
              开始计算
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">参考标准</CardTitle>
          <CardDescription>中国成人常用 BMI 区间</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-y border-border bg-muted/40 text-left">
                <th className="px-4 py-2.5 font-medium">体重类型</th>
                <th className="px-4 py-2.5 font-medium">BMI 值</th>
              </tr>
            </thead>
            <tbody>
              {ranges.map((row) => (
                <tr
                  key={row.category}
                  className={cn(
                    "border-b border-border/60 last:border-0",
                    result?.category === row.category && "bg-muted/30",
                  )}
                >
                  <td
                    className={cn(
                      "px-4 py-2.5",
                      CATEGORY_CLASS[row.category],
                      result?.category === row.category && "font-medium",
                    )}
                  >
                    {row.label}
                  </td>
                  <td className="px-4 py-2.5 tabular-nums text-muted-foreground">
                    {row.display}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}

