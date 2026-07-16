/**
 * Training pace table from a recent race (client-safe).
 * Wraps Daniels VDOT helpers from strategy engine.
 */

import {
  computeVdot,
  equivalentRaceTimes,
  vdotToTrainingPaces,
  type TrainingPaceKey,
  type TrainingPaces,
} from "@/lib/strategy/engine";

export type PaceRaceKey = "5k" | "10k" | "half" | "full" | "custom";

export const PACE_RACE_PRESETS: Array<{
  key: PaceRaceKey;
  label: string;
  km: number | null;
}> = [
  { key: "5k", label: "5 公里", km: 5 },
  { key: "10k", label: "10 公里", km: 10 },
  { key: "half", label: "半马", km: 21.0975 },
  { key: "full", label: "全马", km: 42.195 },
  { key: "custom", label: "自定义", km: null },
];

export const TRAINING_PACE_LABELS: Record<TrainingPaceKey, string> = {
  easy: "轻松跑 E",
  marathon: "马拉松配速 M",
  threshold: "乳酸阈 T",
  interval: "间歇 I",
  repetition: "重复跑 R",
};

export const TRAINING_PACE_HINTS: Record<TrainingPaceKey, string> = {
  easy: "日常有氧、恢复日",
  marathon: "目标马配附近",
  threshold: "持续 20–40 分钟质量课",
  interval: "3–5 分钟间歇",
  repetition: "短冲刺、上坡跑",
};

export interface TrainingPaceTable {
  vdot: number;
  distanceKm: number;
  timeSec: number;
  paces: TrainingPaces;
  equivalents: Record<string, number>;
}

export function buildTrainingPaceTable(
  distanceKm: number,
  timeSec: number,
): TrainingPaceTable {
  if (!Number.isFinite(distanceKm) || distanceKm <= 0) {
    throw new Error("距离须大于 0");
  }
  if (!Number.isFinite(timeSec) || timeSec <= 0) {
    throw new Error("成绩须大于 0");
  }
  const vdot = computeVdot(distanceKm, timeSec);
  return {
    vdot,
    distanceKm,
    timeSec,
    paces: vdotToTrainingPaces(vdot),
    equivalents: equivalentRaceTimes(vdot) as unknown as Record<string, number>,
  };
}
