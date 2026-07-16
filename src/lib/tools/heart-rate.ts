/**
 * Heart-rate zone calculators (client-safe). Educational estimates only.
 */

export type HrZoneKey = "z1" | "z2" | "z3" | "z4" | "z5";

export interface HrZone {
  key: HrZoneKey;
  label: string;
  /** Inclusive lower bpm */
  minBpm: number;
  /** Inclusive upper bpm */
  maxBpm: number;
  purpose: string;
}

/** Karvonen / reserve method: zone % of (HRmax - HRrest) + HRrest */
const KARVONEN: Array<{
  key: HrZoneKey;
  label: string;
  low: number;
  high: number;
  purpose: string;
}> = [
  { key: "z1", label: "Z1 恢复", low: 0.5, high: 0.6, purpose: "热身、恢复跑" },
  { key: "z2", label: "Z2 有氧", low: 0.6, high: 0.7, purpose: "轻松跑、基础耐力" },
  { key: "z3", label: "Z3 节奏", low: 0.7, high: 0.8, purpose: "马拉松配速区" },
  { key: "z4", label: "Z4 阈值", low: 0.8, high: 0.9, purpose: "乳酸阈、tempo" },
  { key: "z5", label: "Z5 高强度", low: 0.9, high: 1.0, purpose: "间歇、冲刺" },
];

/** % of HRmax method (no resting HR) */
const PCT_MAX: Array<{
  key: HrZoneKey;
  label: string;
  low: number;
  high: number;
  purpose: string;
}> = [
  { key: "z1", label: "Z1 恢复", low: 0.5, high: 0.6, purpose: "热身、恢复跑" },
  { key: "z2", label: "Z2 有氧", low: 0.6, high: 0.7, purpose: "轻松跑、基础耐力" },
  { key: "z3", label: "Z3 节奏", low: 0.7, high: 0.8, purpose: "马拉松配速区" },
  { key: "z4", label: "Z4 阈值", low: 0.8, high: 0.9, purpose: "乳酸阈、tempo" },
  { key: "z5", label: "Z5 高强度", low: 0.9, high: 1.0, purpose: "间歇、冲刺" },
];

export function estimateHrMax(age: number): number {
  if (!Number.isFinite(age) || age < 10 || age > 100) {
    throw new Error("年龄须在 10–100 之间");
  }
  // Tanaka: 208 − 0.7 × age (common field estimate)
  return Math.round(208 - 0.7 * age);
}

export function computeHrZones(opts: {
  age?: number | null;
  hrMax?: number | null;
  hrRest?: number | null;
}): { hrMax: number; method: "karvonen" | "pct_max"; zones: HrZone[] } {
  let hrMax = opts.hrMax ?? null;
  if (hrMax == null) {
    if (opts.age == null) throw new Error("请填写年龄或实测最大心率");
    hrMax = estimateHrMax(opts.age);
  }
  if (!Number.isFinite(hrMax) || hrMax < 120 || hrMax > 230) {
    throw new Error("最大心率不合理");
  }

  const hrRest = opts.hrRest;
  if (hrRest != null && Number.isFinite(hrRest) && hrRest > 0) {
    if (hrRest >= hrMax - 20) throw new Error("静息心率须明显低于最大心率");
    const reserve = hrMax - hrRest;
    const zones: HrZone[] = KARVONEN.map((z) => ({
      key: z.key,
      label: z.label,
      minBpm: Math.round(hrRest + reserve * z.low),
      maxBpm: Math.round(hrRest + reserve * z.high),
      purpose: z.purpose,
    }));
    // ensure z5 max is hrMax
    zones[zones.length - 1]!.maxBpm = hrMax;
    return { hrMax, method: "karvonen", zones };
  }

  const zones: HrZone[] = PCT_MAX.map((z) => ({
    key: z.key,
    label: z.label,
    minBpm: Math.round(hrMax! * z.low),
    maxBpm: Math.round(hrMax! * z.high),
    purpose: z.purpose,
  }));
  zones[zones.length - 1]!.maxBpm = hrMax;
  return { hrMax, method: "pct_max", zones };
}
