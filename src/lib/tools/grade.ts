/**
 * Grade / elevation pace adjustment (simple rule-of-thumb, client-safe).
 * Rough model: +1% grade ≈ +15–20s/km; downhill partial recovery.
 */

export interface GradePaceInput {
  /** Flat pace in decimal min/km */
  flatPaceMinPerKm: number;
  /** Grade percent, e.g. 5 for +5%, -3 for downhill */
  gradePercent: number;
  distanceKm?: number;
}

export interface GradePaceResult {
  flatPaceMinPerKm: number;
  adjustedPaceMinPerKm: number;
  deltaSecPerKm: number;
  estimatedTimeSec: number | null;
  note: string;
}

/** Seconds per km added per +1% grade (ascent). */
const ASCENT_SEC_PER_PCT = 18;
/** Downhill recovery factor (partial). */
const DESCENT_FACTOR = 0.45;

export function adjustPaceForGrade(input: GradePaceInput): GradePaceResult {
  const { flatPaceMinPerKm, gradePercent } = input;
  if (!Number.isFinite(flatPaceMinPerKm) || flatPaceMinPerKm <= 0) {
    throw new Error("平路配速须大于 0");
  }
  if (!Number.isFinite(gradePercent) || gradePercent < -30 || gradePercent > 40) {
    throw new Error("坡度应在 -30%～40% 之间");
  }

  let deltaSec: number;
  if (gradePercent >= 0) {
    deltaSec = gradePercent * ASCENT_SEC_PER_PCT;
  } else {
    deltaSec = gradePercent * ASCENT_SEC_PER_PCT * DESCENT_FACTOR;
  }

  const adjusted = flatPaceMinPerKm + deltaSec / 60;
  const distanceKm = input.distanceKm;
  const estimatedTimeSec =
    distanceKm != null && distanceKm > 0
      ? Math.round(adjusted * 60 * distanceKm)
      : null;

  return {
    flatPaceMinPerKm,
    adjustedPaceMinPerKm: Math.round(adjusted * 100) / 100,
    deltaSecPerKm: Math.round(deltaSec),
    estimatedTimeSec,
    note: "经验公式，非 GPS 实测；越野与海拔另有影响。",
  };
}
