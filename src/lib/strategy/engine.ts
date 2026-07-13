export type StrategyDistanceType = "10k" | "half" | "full";
export type EquivalentDistance = "5k" | "10k" | "half" | "full";
export type TrainingPaceKey =
  | "easy"
  | "marathon"
  | "threshold"
  | "interval"
  | "repetition";

export interface PaceRange {
  /** Faster bound in decimal minutes per kilometre. */
  minPerKm: number;
  /** Slower bound in decimal minutes per kilometre. */
  maxPerKm: number;
}

export type TrainingPaces = Record<TrainingPaceKey, PaceRange>;
export type EquivalentRaceTimes = Record<EquivalentDistance, number>;

export interface StrategySegment {
  label: string;
  distanceKm: number;
  paceMinPerKm: number;
  durationSec: number;
}

export interface RaceStrategy {
  distanceType: StrategyDistanceType;
  distanceKm: number;
  targetTimeSec: number;
  averagePaceMinPerKm: number;
  vdot: number;
  trainingPaces: TrainingPaces;
  equivalentTimes: EquivalentRaceTimes;
  segments: StrategySegment[];
}

const RACE_DISTANCES_KM: Record<EquivalentDistance, number> = {
  "5k": 5,
  "10k": 10,
  half: 21.0975,
  full: 42.195,
};

const STRATEGY_DISTANCES_KM: Record<StrategyDistanceType, number> = {
  "10k": 10,
  half: 21.0975,
  full: 42.195,
};

const INTENSITY_RANGES: Record<TrainingPaceKey, [number, number]> = {
  easy: [0.7, 0.81],
  marathon: [0.75, 0.84],
  threshold: [0.88, 0.9],
  interval: [0.95, 1],
  repetition: [1.05, 1.1],
};

function round(n: number, digits = 2) {
  const factor = 10 ** digits;
  return Math.round(n * factor) / factor;
}

function assertPositiveFinite(value: number, name: string) {
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(`${name} must be a positive finite number`);
  }
}

/** Daniels-Gilbert fraction of VO2max sustainable for `timeMin`. */
function sustainableFraction(timeMin: number): number {
  return (
    0.8 +
    0.1894393 * Math.exp(-0.012778 * timeMin) +
    0.2989558 * Math.exp(-0.1932605 * timeMin)
  );
}

/**
 * Estimate Daniels VDOT from a race performance.
 * `distanceKm` is kilometres and `timeSec` is elapsed seconds.
 */
export function computeVdot(distanceKm: number, timeSec: number): number {
  assertPositiveFinite(distanceKm, "distanceKm");
  assertPositiveFinite(timeSec, "timeSec");

  const timeMin = timeSec / 60;
  const velocityMPerMin = (distanceKm * 1_000) / timeMin;
  const oxygenCost =
    -4.6 +
    0.182252 * velocityMPerMin +
    0.000104 * velocityMPerMin * velocityMPerMin;
  const vdot = oxygenCost / sustainableFraction(timeMin);
  return round(vdot, 1);
}

/** Invert Daniels' velocity/oxygen-cost equation for a positive velocity. */
function velocityForOxygenCost(oxygenCost: number): number {
  const a = 0.000104;
  const b = 0.182252;
  const c = -4.6 - oxygenCost;
  const discriminant = b * b - 4 * a * c;
  return (-b + Math.sqrt(discriminant)) / (2 * a);
}

function paceForIntensity(vdot: number, intensity: number): number {
  const velocityMPerMin = velocityForOxygenCost(vdot * intensity);
  return 1_000 / velocityMPerMin;
}

/** Training pace ranges in decimal minutes per kilometre. */
export function vdotToTrainingPaces(vdot: number): TrainingPaces {
  assertPositiveFinite(vdot, "vdot");

  return Object.fromEntries(
    Object.entries(INTENSITY_RANGES).map(([key, [low, high]]) => {
      const faster = paceForIntensity(vdot, high);
      const slower = paceForIntensity(vdot, low);
      return [
        key,
        {
          minPerKm: round(faster, 2),
          maxPerKm: round(slower, 2),
        },
      ];
    }),
  ) as TrainingPaces;
}

function equivalentTimeForDistance(vdot: number, distanceKm: number): number {
  // Wide practical bounds: 2 min/km to 15 min/km.
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

/** Predict equivalent race performances for the same VDOT. */
export function equivalentRaceTimes(vdot: number): EquivalentRaceTimes {
  assertPositiveFinite(vdot, "vdot");
  return Object.fromEntries(
    Object.entries(RACE_DISTANCES_KM).map(([key, distanceKm]) => [
      key,
      equivalentTimeForDistance(vdot, distanceKm),
    ]),
  ) as EquivalentRaceTimes;
}

type SegmentDefinition = {
  label: string;
  distanceKm: number;
  offsetSecPerKm: number;
};

function segmentDefinitions(
  distanceType: StrategyDistanceType,
): SegmentDefinition[] {
  switch (distanceType) {
    case "10k":
      return [
        { label: "前 5 km", distanceKm: 5, offsetSecPerKm: 5 },
        { label: "后 5 km", distanceKm: 5, offsetSecPerKm: -5 },
      ];
    case "half":
      return [
        { label: "前 5 km", distanceKm: 5, offsetSecPerKm: 4 },
        { label: "5–16.1 km", distanceKm: 11.0975, offsetSecPerKm: 0 },
        { label: "最后 5 km", distanceKm: 5, offsetSecPerKm: -4 },
      ];
    case "full":
      return [
        { label: "前 5 km", distanceKm: 5, offsetSecPerKm: 6 },
        { label: "5–30 km", distanceKm: 25, offsetSecPerKm: 0 },
        { label: "30–40 km", distanceKm: 10, offsetSecPerKm: -4 },
        { label: "最后 2.2 km", distanceKm: 2.195, offsetSecPerKm: -10 },
      ];
  }
}

/**
 * Build a negative-split strategy whose rounded segment durations add exactly
 * to `targetTimeSec`. The final segment absorbs any rounding/offset remainder.
 */
export function negativeSplitStrategy(
  distanceType: StrategyDistanceType,
  targetTimeSec: number,
): StrategySegment[] {
  assertPositiveFinite(targetTimeSec, "targetTimeSec");
  const distanceKm = STRATEGY_DISTANCES_KM[distanceType];
  const averagePaceSecPerKm = targetTimeSec / distanceKm;
  const defs = segmentDefinitions(distanceType);
  const segments: StrategySegment[] = [];
  let elapsedSec = 0;

  for (let i = 0; i < defs.length; i++) {
    const def = defs[i]!;
    const isLast = i === defs.length - 1;
    const durationSec = isLast
      ? targetTimeSec - elapsedSec
      : Math.round(
          def.distanceKm *
            (averagePaceSecPerKm + def.offsetSecPerKm),
        );
    elapsedSec += durationSec;
    segments.push({
      label: def.label,
      distanceKm: def.distanceKm,
      paceMinPerKm: round(durationSec / def.distanceKm / 60, 3),
      durationSec,
    });
  }

  return segments;
}

export function buildRaceStrategy(
  distanceType: StrategyDistanceType,
  targetTimeSec: number,
): RaceStrategy {
  const distanceKm = STRATEGY_DISTANCES_KM[distanceType];
  const vdot = computeVdot(distanceKm, targetTimeSec);
  return {
    distanceType,
    distanceKm,
    targetTimeSec,
    averagePaceMinPerKm: round(targetTimeSec / distanceKm / 60, 3),
    vdot,
    trainingPaces: vdotToTrainingPaces(vdot),
    equivalentTimes: equivalentRaceTimes(vdot),
    segments: negativeSplitStrategy(distanceType, targetTimeSec),
  };
}
