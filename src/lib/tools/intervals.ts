/**
 * Interval / repeat session designer (client-safe).
 */

export type IntervalPaceKey =
  | "easy"
  | "threshold"
  | "interval"
  | "repetition"
  | "custom";

export interface IntervalBlock {
  /** Number of work reps */
  reps: number;
  /** Work distance in meters (preferred) or null if time-based */
  workMeters: number | null;
  /** Work duration seconds (if not distance-based) */
  workSec: number | null;
  /** Recovery between reps in seconds */
  recoverySec: number;
  /** Work pace min/km (decimal minutes) */
  workPaceMinPerKm: number;
}

export interface IntervalSessionInput {
  warmupMin: number;
  cooldownMin: number;
  blocks: IntervalBlock[];
  /** Recovery jog pace for distance estimate (default easy-ish 6:00) */
  recoveryPaceMinPerKm?: number;
}

export interface IntervalSessionResult {
  totalWorkSec: number;
  totalRecoverySec: number;
  totalWarmCoolSec: number;
  totalDurationSec: number;
  totalWorkKm: number;
  totalRecoveryKm: number;
  totalDistanceKm: number;
  blockSummaries: Array<{
    reps: number;
    workLabel: string;
    workSecPerRep: number;
    recoverySec: number;
    blockWorkKm: number;
    blockDurationSec: number;
  }>;
}

function assertPositive(n: number, name: string) {
  if (!Number.isFinite(n) || n <= 0) throw new Error(`${name}须大于 0`);
}

export function designIntervalSession(
  input: IntervalSessionInput,
): IntervalSessionResult {
  const warmupMin = Math.max(0, input.warmupMin || 0);
  const cooldownMin = Math.max(0, input.cooldownMin || 0);
  const recoveryPace = input.recoveryPaceMinPerKm ?? 6;

  if (!input.blocks.length) throw new Error("请至少添加一组间歇");

  let totalWorkSec = 0;
  let totalRecoverySec = 0;
  let totalWorkKm = 0;
  let totalRecoveryKm = 0;
  const blockSummaries: IntervalSessionResult["blockSummaries"] = [];

  for (const b of input.blocks) {
    assertPositive(b.reps, "组数");
    if (b.workPaceMinPerKm <= 0) throw new Error("配速须大于 0");
    if (b.recoverySec < 0) throw new Error("恢复时间不能为负");

    let workSecPerRep: number;
    let workKmPerRep: number;
    let workLabel: string;

    if (b.workMeters != null && b.workMeters > 0) {
      workKmPerRep = b.workMeters / 1000;
      workSecPerRep = Math.round(workKmPerRep * b.workPaceMinPerKm * 60);
      workLabel = `${b.workMeters} m`;
    } else if (b.workSec != null && b.workSec > 0) {
      workSecPerRep = Math.round(b.workSec);
      workKmPerRep = workSecPerRep / 60 / b.workPaceMinPerKm;
      workLabel = `${workSecPerRep} 秒`;
    } else {
      throw new Error("请填写间歇距离或时间");
    }

    const blockWorkKm = workKmPerRep * b.reps;
    const blockWorkSec = workSecPerRep * b.reps;
    const blockRecoverySec = b.recoverySec * Math.max(0, b.reps - 1);
    const blockRecoveryKm =
      recoveryPace > 0 ? (blockRecoverySec / 60 / recoveryPace) : 0;

    totalWorkSec += blockWorkSec;
    totalRecoverySec += blockRecoverySec;
    totalWorkKm += blockWorkKm;
    totalRecoveryKm += blockRecoveryKm;

    blockSummaries.push({
      reps: b.reps,
      workLabel,
      workSecPerRep,
      recoverySec: b.recoverySec,
      blockWorkKm: Math.round(blockWorkKm * 100) / 100,
      blockDurationSec: blockWorkSec + blockRecoverySec,
    });
  }

  const totalWarmCoolSec = Math.round((warmupMin + cooldownMin) * 60);
  // Warm/cool distance at easy pace ~6:00
  const warmCoolKm = (warmupMin + cooldownMin) / 6;

  return {
    totalWorkSec,
    totalRecoverySec,
    totalWarmCoolSec,
    totalDurationSec: totalWorkSec + totalRecoverySec + totalWarmCoolSec,
    totalWorkKm: Math.round(totalWorkKm * 100) / 100,
    totalRecoveryKm: Math.round(totalRecoveryKm * 100) / 100,
    totalDistanceKm: Math.round((totalWorkKm + totalRecoveryKm + warmCoolKm) * 100) / 100,
    blockSummaries,
  };
}
