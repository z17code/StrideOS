/**
 * Pure race-performance prediction helpers (client-safe, no DB).
 * Anchors on the user's best available recent race via Daniels VDOT,
 * then rates each entered distance against the VDOT-equivalent time.
 */

import {
  computeVdot,
  equivalentRaceTimes,
} from "@/lib/strategy/engine";

export type PredictDistanceKey = "3k" | "5k" | "10k" | "half" | "full";

export const PREDICT_DISTANCES: Array<{
  key: PredictDistanceKey;
  label: string;
  km: number;
}> = [
  { key: "3k", label: "3 公里", km: 3 },
  { key: "5k", label: "5 公里", km: 5 },
  { key: "10k", label: "10 公里", km: 10 },
  { key: "half", label: "半马", km: 21.0975 },
  { key: "full", label: "全马", km: 42.195 },
];

/** Performance rating vs VDOT-equivalent time. */
export type PerformanceLevel = "excellent" | "good" | "average" | "poor";

export const PERFORMANCE_LABELS: Record<PerformanceLevel, string> = {
  excellent: "优秀",
  good: "良好",
  average: "一般",
  poor: "较差",
};

export interface DistanceInput {
  key: PredictDistanceKey;
  timeSec: number | null;
}

export interface DistanceAssessment {
  key: PredictDistanceKey;
  label: string;
  km: number;
  /** User-entered time; null if not provided. */
  actualSec: number | null;
  /** VDOT-equivalent predicted time from the anchor performance. */
  predictedSec: number;
  /** How the actual compares to predicted (null if no actual). */
  level: PerformanceLevel | null;
  /** (actual - predicted) / predicted; negative = faster than predicted. */
  deltaRatio: number | null;
}

export interface PredictResult {
  /** Distance used as VDOT anchor (best / highest VDOT among entries). */
  anchorKey: PredictDistanceKey;
  anchorLabel: string;
  vdot: number;
  assessments: DistanceAssessment[];
}

function rateDelta(deltaRatio: number): PerformanceLevel {
  // Negative delta = faster than predicted.
  if (deltaRatio <= -0.02) return "excellent";
  if (deltaRatio <= 0.02) return "good";
  if (deltaRatio <= 0.06) return "average";
  return "poor";
}

/**
 * Pick the entry that implies the highest VDOT as the "true fitness" anchor.
 * Falls back to the first non-null entry if VDOT computation fails.
 */
export function pickAnchor(
  inputs: DistanceInput[],
): { key: PredictDistanceKey; timeSec: number; vdot: number } | null {
  let best: { key: PredictDistanceKey; timeSec: number; vdot: number } | null =
    null;

  for (const input of inputs) {
    if (input.timeSec == null || input.timeSec <= 0) continue;
    const meta = PREDICT_DISTANCES.find((d) => d.key === input.key);
    if (!meta) continue;
    try {
      const vdot = computeVdot(meta.km, input.timeSec);
      if (!best || vdot > best.vdot) {
        best = { key: input.key, timeSec: input.timeSec, vdot };
      }
    } catch {
      // skip invalid
    }
  }

  return best;
}

/**
 * Predict equivalent times for all standard distances and rate each
 * user-entered performance against the VDOT-equivalent.
 */
export function assessPerformances(inputs: DistanceInput[]): PredictResult | null {
  const anchor = pickAnchor(inputs);
  if (!anchor) return null;

  const eq = equivalentRaceTimes(anchor.vdot);
  // 3k is not in the strategy engine table; invert VDOT for 3 km.
  const predicted3k = equivalentTimeForKm(anchor.vdot, 3);

  const predictedByKey: Record<PredictDistanceKey, number> = {
    "3k": predicted3k,
    "5k": eq["5k"],
    "10k": eq["10k"],
    half: eq.half,
    full: eq.full,
  };

  const assessments: DistanceAssessment[] = PREDICT_DISTANCES.map((d) => {
    const actual =
      inputs.find((i) => i.key === d.key)?.timeSec ?? null;
    const predictedSec = predictedByKey[d.key];
    let level: PerformanceLevel | null = null;
    let deltaRatio: number | null = null;
    if (actual != null && actual > 0 && predictedSec > 0) {
      deltaRatio = (actual - predictedSec) / predictedSec;
      level = rateDelta(deltaRatio);
    }
    return {
      key: d.key,
      label: d.label,
      km: d.km,
      actualSec: actual,
      predictedSec,
      level,
      deltaRatio,
    };
  });

  const anchorMeta = PREDICT_DISTANCES.find((d) => d.key === anchor.key)!;

  return {
    anchorKey: anchor.key,
    anchorLabel: anchorMeta.label,
    vdot: anchor.vdot,
    assessments,
  };
}

/** Binary-search equivalent time for an arbitrary distance at a given VDOT. */
function equivalentTimeForKm(vdot: number, distanceKm: number): number {
  let lowSec = distanceKm * 2 * 60;
  let highSec = distanceKm * 15 * 60;
  for (let i = 0; i < 80; i++) {
    const midSec = (lowSec + highSec) / 2;
    const candidate = computeVdot(distanceKm, midSec);
    if (candidate > vdot) {
      lowSec = midSec;
    } else {
      highSec = midSec;
    }
  }
  return Math.round((lowSec + highSec) / 2);
}
