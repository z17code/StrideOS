/**
 * Even / negative-split pace tables for a target race time (client-safe).
 */

export type SplitDistanceKey = "5k" | "10k" | "half" | "full" | "custom";

export const SPLIT_DISTANCES: Array<{
  key: SplitDistanceKey;
  label: string;
  km: number | null;
}> = [
  { key: "5k", label: "5 公里", km: 5 },
  { key: "10k", label: "10 公里", km: 10 },
  { key: "half", label: "半马", km: 21.0975 },
  { key: "full", label: "全马", km: 42.195 },
  { key: "custom", label: "自定义", km: null },
];

export type SplitMode = "even" | "negative";

export interface SplitRow {
  /** 1-based km index (or last partial) */
  kmIndex: number;
  /** Distance of this split in km */
  splitKm: number;
  /** Cumulative distance */
  cumulativeKm: number;
  paceMinPerKm: number;
  splitSec: number;
  cumulativeSec: number;
}

export interface SplitTable {
  distanceKm: number;
  targetTimeSec: number;
  averagePaceMinPerKm: number;
  mode: SplitMode;
  rows: SplitRow[];
}

/**
 * Build per-km (or last partial) splits.
 * Negative mode: first half ~+2% slower, second half ~-2% faster vs average,
 * with final segment absorbing remainder so totals match exactly.
 */
export function buildSplitTable(
  distanceKm: number,
  targetTimeSec: number,
  mode: SplitMode = "even",
): SplitTable {
  if (!Number.isFinite(distanceKm) || distanceKm <= 0) {
    throw new Error("距离须大于 0");
  }
  if (!Number.isFinite(targetTimeSec) || targetTimeSec <= 0) {
    throw new Error("目标时间须大于 0");
  }

  const avgPaceSec = targetTimeSec / distanceKm;
  const fullKms = Math.floor(distanceKm);
  const remainder = distanceKm - fullKms;
  const segmentLengths: number[] = [];
  for (let i = 0; i < fullKms; i++) segmentLengths.push(1);
  if (remainder > 0.001) segmentLengths.push(remainder);

  const n = segmentLengths.length;
  const mid = Math.floor(n / 2);
  const rows: SplitRow[] = [];
  let cumulativeKm = 0;
  let cumulativeSec = 0;

  for (let i = 0; i < n; i++) {
    const splitKm = segmentLengths[i]!;
    const isLast = i === n - 1;
    let paceSec: number;
    if (mode === "even") {
      paceSec = avgPaceSec;
    } else {
      // first half slightly slower, second half slightly faster
      const factor = i < mid ? 1.02 : 0.98;
      paceSec = avgPaceSec * factor;
    }

    let splitSec: number;
    if (isLast) {
      splitSec = targetTimeSec - cumulativeSec;
    } else {
      splitSec = Math.round(splitKm * paceSec);
    }

    cumulativeKm = Math.round((cumulativeKm + splitKm) * 1000) / 1000;
    cumulativeSec += splitSec;
    rows.push({
      kmIndex: i + 1,
      splitKm,
      cumulativeKm,
      paceMinPerKm: splitKm > 0 ? splitSec / splitKm / 60 : 0,
      splitSec,
      cumulativeSec,
    });
  }

  return {
    distanceKm,
    targetTimeSec,
    averagePaceMinPerKm: targetTimeSec / distanceKm / 60,
    mode,
    rows,
  };
}

/** Every N km summary rows (for half/full race cards). */
export function summarizeEveryN(table: SplitTable, everyKm: number): SplitRow[] {
  if (everyKm <= 0) return table.rows;
  const out: SplitRow[] = [];
  for (const row of table.rows) {
    if (
      Math.abs(row.cumulativeKm % everyKm) < 0.05 ||
      row.kmIndex === table.rows.length
    ) {
      out.push(row);
    }
  }
  return out;
}
