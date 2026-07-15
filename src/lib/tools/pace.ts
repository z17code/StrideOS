/**
 * Pace calculator: given distance + any one of (time, pace, lap),
 * compute the remaining fields. Pure, client-safe.
 */

export type PaceRaceType = "full" | "half" | "10k" | "5k" | "3k" | "custom";

export const PACE_RACE_OPTIONS: Array<{
  value: PaceRaceType;
  label: string;
  km: number | null;
}> = [
  { value: "full", label: "马拉松", km: 42.195 },
  { value: "half", label: "半马", km: 21.0975 },
  { value: "10k", label: "10 公里", km: 10 },
  { value: "5k", label: "5 公里", km: 5 },
  { value: "3k", label: "3 公里", km: 3 },
  { value: "custom", label: "自定义", km: null },
];

export const DEFAULT_LAP_METERS = 400;

export type PaceInputField = "distance" | "time" | "pace" | "lap";

export interface PaceInputs {
  /** kilometres */
  distanceKm: number | null;
  /** total race time in seconds */
  timeSec: number | null;
  /** decimal minutes per kilometre */
  paceMinPerKm: number | null;
  /** seconds per lap (default lap = 400 m) */
  lapSec: number | null;
  /** lap length in metres (default 400) */
  lapMeters?: number;
}

export interface PaceResult {
  distanceKm: number;
  timeSec: number;
  /** decimal minutes per km */
  paceMinPerKm: number;
  /** seconds per lap */
  lapSec: number;
  lapMeters: number;
}

function assertPositive(n: number, name: string) {
  if (!Number.isFinite(n) || n <= 0) {
    throw new Error(`${name} must be a positive number`);
  }
}

/**
 * Given distance + exactly one of (time, pace, lap), fill the rest.
 * If more than one of time/pace/lap is provided, `priority` decides which
 * drives the calculation (the last-edited field in the UI).
 */
export function computePace(
  inputs: PaceInputs,
  priority: PaceInputField = "time",
): PaceResult {
  const lapMeters = inputs.lapMeters ?? DEFAULT_LAP_METERS;
  assertPositive(lapMeters, "lapMeters");

  const distanceKm = inputs.distanceKm;
  if (distanceKm == null) {
    throw new Error("distanceKm is required");
  }
  assertPositive(distanceKm, "distanceKm");

  const hasTime = inputs.timeSec != null && inputs.timeSec > 0;
  const hasPace = inputs.paceMinPerKm != null && inputs.paceMinPerKm > 0;
  const hasLap = inputs.lapSec != null && inputs.lapSec > 0;

  let timeSec: number;
  let paceMinPerKm: number;
  let lapSec: number;

  const drive: PaceInputField =
    priority === "distance"
      ? hasTime
        ? "time"
        : hasPace
          ? "pace"
          : hasLap
            ? "lap"
            : "time"
      : priority;

  if (drive === "time" && hasTime) {
    timeSec = inputs.timeSec!;
    paceMinPerKm = timeSec / 60 / distanceKm;
    lapSec = (paceMinPerKm * 60 * lapMeters) / 1000;
  } else if (drive === "pace" && hasPace) {
    paceMinPerKm = inputs.paceMinPerKm!;
    timeSec = paceMinPerKm * 60 * distanceKm;
    lapSec = (paceMinPerKm * 60 * lapMeters) / 1000;
  } else if (drive === "lap" && hasLap) {
    lapSec = inputs.lapSec!;
    paceMinPerKm = (lapSec / lapMeters) * 1000 / 60;
    timeSec = paceMinPerKm * 60 * distanceKm;
  } else if (hasTime) {
    timeSec = inputs.timeSec!;
    paceMinPerKm = timeSec / 60 / distanceKm;
    lapSec = (paceMinPerKm * 60 * lapMeters) / 1000;
  } else if (hasPace) {
    paceMinPerKm = inputs.paceMinPerKm!;
    timeSec = paceMinPerKm * 60 * distanceKm;
    lapSec = (paceMinPerKm * 60 * lapMeters) / 1000;
  } else if (hasLap) {
    lapSec = inputs.lapSec!;
    paceMinPerKm = (lapSec / lapMeters) * 1000 / 60;
    timeSec = paceMinPerKm * 60 * distanceKm;
  } else {
    throw new Error("Provide time, pace, or lap");
  }

  return {
    distanceKm,
    timeSec: Math.round(timeSec),
    paceMinPerKm: Math.round(paceMinPerKm * 1000) / 1000,
    lapSec: Math.round(lapSec),
    lapMeters,
  };
}

/** Convert decimal minutes/km → total seconds for a distance. */
export function timeFromPace(distanceKm: number, paceMinPerKm: number): number {
  return Math.round(paceMinPerKm * 60 * distanceKm);
}

/** Convert total seconds → decimal minutes/km. */
export function paceFromTime(distanceKm: number, timeSec: number): number {
  return timeSec / 60 / distanceKm;
}

/** Pace (decimal min/km) → lap seconds for a given lap length. */
export function lapFromPace(paceMinPerKm: number, lapMeters = DEFAULT_LAP_METERS): number {
  return Math.round((paceMinPerKm * 60 * lapMeters) / 1000);
}

/** Lap seconds → pace (decimal min/km). */
export function paceFromLap(lapSec: number, lapMeters = DEFAULT_LAP_METERS): number {
  return (lapSec / lapMeters) * 1000 / 60;
}
