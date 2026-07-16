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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatPaceMinPerKm } from "@/lib/datetime";
import {
  celsiusToFahrenheit,
  fahrenheitToCelsius,
  kmToMiles,
  milesToKm,
  paceMinPerKmToMinPerMile,
  paceMinPerMileToMinPerKm,
  round,
} from "@/lib/tools/units";

function fieldsToPace(m: string, s: string): number | null {
  const mm = m === "" ? 0 : Number(m);
  const ss = s === "" ? 0 : Number(s);
  if (![mm, ss].every((n) => Number.isFinite(n) && n >= 0)) return null;
  if (ss >= 60) return null;
  const total = mm * 60 + ss;
  return total > 0 ? total / 60 : null;
}

function paceToFields(min: number): { m: string; s: string } {
  const total = Math.round(min * 60);
  return { m: String(Math.floor(total / 60)), s: String(total % 60) };
}

export default function UnitsPage() {
  const [km, setKm] = useState("");
  const [mi, setMi] = useState("");
  const [paceKmM, setPaceKmM] = useState("");
  const [paceKmS, setPaceKmS] = useState("");
  const [paceMiM, setPaceMiM] = useState("");
  const [paceMiS, setPaceMiS] = useState("");
  const [c, setC] = useState("");
  const [f, setF] = useState("");

  const kmVal = Number(km);
  const miFromKm = Number.isFinite(kmVal) && kmVal > 0 ? round(kmToMiles(kmVal), 3) : null;
  const miVal = Number(mi);
  const kmFromMi = Number.isFinite(miVal) && miVal > 0 ? round(milesToKm(miVal), 3) : null;

  const paceKm = fieldsToPace(paceKmM, paceKmS);
  const paceMiFromKm = paceKm != null ? paceMinPerKmToMinPerMile(paceKm) : null;
  const paceMi = fieldsToPace(paceMiM, paceMiS);
  const paceKmFromMi = paceMi != null ? paceMinPerMileToMinPerKm(paceMi) : null;

  const cVal = Number(c);
  const fFromC = Number.isFinite(cVal) ? round(celsiusToFahrenheit(cVal), 1) : null;
  const fVal = Number(f);
  const cFromF = Number.isFinite(fVal) ? round(fahrenheitToCelsius(fVal), 1) : null;

  const paceMiFields = useMemo(
    () => (paceMiFromKm != null ? paceToFields(paceMiFromKm) : null),
    [paceMiFromKm],
  );
  const paceKmFields = useMemo(
    () => (paceKmFromMi != null ? paceToFields(paceKmFromMi) : null),
    [paceKmFromMi],
  );

  return (
    <div className="page-shell max-w-lg">
      <div>
        <Link href="/tools" className="text-xs text-muted-foreground hover:text-foreground">
          ← 工具
        </Link>
        <h1 className="page-title mt-1">单位换算</h1>
        <p className="page-subtitle">公里 / 英里 · 配速 · 温度</p>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">距离</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>公里 → 英里</Label>
            <Input type="number" value={km} onChange={(e) => setKm(e.target.value)} placeholder="km" />
            <p className="text-sm tabular-nums text-muted-foreground">
              {miFromKm != null ? `${miFromKm} mi` : "—"}
            </p>
          </div>
          <div className="space-y-2">
            <Label>英里 → 公里</Label>
            <Input type="number" value={mi} onChange={(e) => setMi(e.target.value)} placeholder="mi" />
            <p className="text-sm tabular-nums text-muted-foreground">
              {kmFromMi != null ? `${kmFromMi} km` : "—"}
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">配速</CardTitle>
          <CardDescription>min/km ↔ min/mi</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>min/km</Label>
            <div className="grid grid-cols-2 gap-2">
              <Input type="number" value={paceKmM} onChange={(e) => setPaceKmM(e.target.value)} placeholder="分" />
              <Input type="number" value={paceKmS} onChange={(e) => setPaceKmS(e.target.value)} placeholder="秒" />
            </div>
            <p className="text-sm text-muted-foreground">
              →{" "}
              {paceMiFields
                ? `${paceMiFields.m}:${paceMiFields.s.padStart(2, "0")} /mi（${formatPaceMinPerKm(paceMiFromKm!)} 等价显示为 km 格式参考）`
                : "—"}
            </p>
          </div>
          <div className="space-y-2">
            <Label>min/mi</Label>
            <div className="grid grid-cols-2 gap-2">
              <Input type="number" value={paceMiM} onChange={(e) => setPaceMiM(e.target.value)} placeholder="分" />
              <Input type="number" value={paceMiS} onChange={(e) => setPaceMiS(e.target.value)} placeholder="秒" />
            </div>
            <p className="text-sm text-muted-foreground">
              → {paceKmFields ? `${formatPaceMinPerKm(paceKmFromMi!)} /km` : "—"}
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">温度</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>℃ → ℉</Label>
            <Input type="number" value={c} onChange={(e) => setC(e.target.value)} />
            <p className="text-sm tabular-nums text-muted-foreground">
              {fFromC != null ? `${fFromC} ℉` : "—"}
            </p>
          </div>
          <div className="space-y-2">
            <Label>℉ → ℃</Label>
            <Input type="number" value={f} onChange={(e) => setF(e.target.value)} />
            <p className="text-sm tabular-nums text-muted-foreground">
              {cFromF != null ? `${cFromF} ℃` : "—"}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
