import {
  addDays,
  dayOfWeek,
  daysBetween,
  isValidDateOnly,
  startOfMondayWeek,
  toEpochDay,
} from "@/lib/datetime";
import {
  ALGORITHM_VERSION,
  DISTANCE_KM,
  type DistanceType,
  type GeneratedPlan,
  type PlanEngineInput,
  type PlanPhase,
  type PlanWarning,
  type PlannedWeek,
  type PlannedWorkout,
  type PlannedWorkoutType,
  PlanEngineError,
} from "./types";

// ─── Constants ───────────────────────────────────────────

const TAPER_WEEKS: Record<DistanceType, number> = {
  "10k": 1,
  half: 2,
  full: 3,
};

const LONG_CAP_KM: Record<DistanceType, number> = {
  "10k": 18,
  half: 22,
  full: 32,
};

const LOAD_GROWTH = 0.08; // 8% ≤ 10%
const RECOVERY_FACTOR = 0.8; // -20% within 15–25%
const EASY_PACE_MIN_PER_KM = 6.5; // fallback when no benchmark

const QUALITY_TYPES = new Set<PlannedWorkoutType>([
  "threshold",
  "intervals",
  "specific",
]);

// ─── Public API ──────────────────────────────────────────

export function generatePlan(raw: PlanEngineInput): GeneratedPlan {
  const input = normalizeInput(raw);
  const warnings: PlanWarning[] = [];

  const totalWeeks = computeTotalWeeks(input.generationDate, input.raceDate);
  if (totalWeeks < 8 || totalWeeks > 24) {
    throw new PlanEngineError(
      "PLAN_WINDOW_INVALID",
      `比赛日距今 ${totalWeeks} 周，仅支持 8–24 周计划`,
      { totalWeeks, min: 8, max: 24 },
    );
  }

  const completionMode = isInsufficientBase(input);
  if (completionMode) {
    warnings.push({
      code: "INSUFFICIENT_BASE",
      message: "当前基础跑量不足，已生成完赛/基础优先方案，建议延后目标成绩或延长准备期",
    });
    warnings.push({
      code: "COMPLETION_MODE",
      message: "完赛模式：降低质量课密度，优先建立有氧基础",
    });
    warnings.push({
      code: "DELAY_RECOMMENDED",
      message: "建议将目标成绩延后一个训练周期后再冲击",
    });
  }

  if (input.painLevel >= 3) {
    warnings.push({
      code: "PAIN_REDUCED_QUALITY",
      message: "当前疼痛评分偏高，已减少质量课",
    });
  }

  const startsOn = startOfMondayWeek(input.generationDate);
  // Ensure race week is included: end is Sunday of race week
  const raceWeekStart = startOfMondayWeek(input.raceDate);
  const endsOn = addDays(raceWeekStart, 6);

  const phases = allocatePhases(totalWeeks, input.distanceType);
  const weeklyTargets = buildWeeklyTargets(
    totalWeeks,
    phases,
    input,
    completionMode,
    warnings,
  );

  const pace = resolvePace(input, warnings);

  const weeks: PlannedWeek[] = [];
  const workouts: PlannedWorkout[] = [];
  let prevQualityEpoch: number | null = null;

  for (let w = 1; w <= totalWeeks; w++) {
    const weekStart = addDays(startsOn, (w - 1) * 7);
    const weekEnd = addDays(weekStart, 6);
    const phase = phases[w - 1]!;
    const targetKm = weeklyTargets[w - 1]!;
    const isRecovery = isRecoveryWeek(w, totalWeeks, TAPER_WEEKS[input.distanceType]);

    weeks.push({
      weekNumber: w,
      phase,
      startsOn: weekStart,
      endsOn: weekEnd,
      plannedDistanceKm: targetKm,
      isRecovery,
    });

    const isRaceWeek = toEpochDay(weekStart) === toEpochDay(raceWeekStart);
    const weekWorkouts = scheduleWeek({
      weekNumber: w,
      phase,
      weekStart,
      weekEnd,
      targetKm,
      isRaceWeek,
      raceDate: input.raceDate,
      input,
      completionMode,
      isRecovery,
      pace,
      prevQualityEpoch,
      warnings,
    });

    for (const wo of weekWorkouts) {
      if (wo.isQuality) {
        prevQualityEpoch = toEpochDay(wo.scheduledDate);
      }
      workouts.push(wo);
    }
  }

  // Recompute week distances from actual scheduled training (exclude race),
  // then clamp so week-over-week growth never exceeds 10%.
  for (const week of weeks) {
    const sum = workouts
      .filter(
        (wo) =>
          wo.weekNumber === week.weekNumber &&
          wo.workoutType !== "race" &&
          wo.distanceKm != null,
      )
      .reduce((s, wo) => s + (wo.distanceKm ?? 0), 0);
    week.plannedDistanceKm = round1(sum);
  }

  for (let i = 1; i < weeks.length; i++) {
    const prev = weeks[i - 1]!.plannedDistanceKm;
    const cur = weeks[i]!.plannedDistanceKm;
    if (prev > 0 && cur > prev * 1.1 + 0.05) {
      const capped = round1(prev * 1.1);
      scaleWeekDistances(workouts, weeks[i]!.weekNumber, cur, capped);
      weeks[i]!.plannedDistanceKm = capped;
    }
  }

  enforceInvariants(workouts, weeks, input, totalWeeks);

  return {
    algorithmVersion: ALGORITHM_VERSION,
    startsOn,
    endsOn,
    totalWeeks,
    completionMode,
    weeks,
    workouts,
    warnings,
    inputSnapshot: {
      ...input,
      algorithmVersion: ALGORITHM_VERSION,
      completionMode,
    },
  };
}

// ─── Normalize / validate ────────────────────────────────

function normalizeInput(raw: PlanEngineInput): PlanEngineInput {
  if (!isValidDateOnly(raw.generationDate) || !isValidDateOnly(raw.raceDate)) {
    throw new PlanEngineError("INVALID_DATE", "日期格式无效");
  }
  if (toEpochDay(raw.raceDate) <= toEpochDay(raw.generationDate)) {
    throw new PlanEngineError("RACE_DATE_PAST", "比赛日必须晚于生成日");
  }

  const days = [...new Set(raw.trainableDays)].filter((d) => d >= 0 && d <= 6).sort();
  if (days.length < 3 || days.length > 7) {
    throw new PlanEngineError(
      "TRAINABLE_DAYS_INVALID",
      "可训练日需 3–7 天",
    );
  }
  if (!days.includes(raw.longRunDay)) {
    throw new PlanEngineError(
      "LONG_RUN_DAY_INVALID",
      "长跑日必须属于可训练日",
    );
  }
  if (
    !Number.isFinite(raw.weeklyDistanceKm) ||
    raw.weeklyDistanceKm < 0 ||
    raw.weeklyDistanceKm > 300
  ) {
    throw new PlanEngineError("WEEKLY_DISTANCE_INVALID", "周跑量无效");
  }
  if (
    !Number.isInteger(raw.weeklyRuns) ||
    raw.weeklyRuns < 0 ||
    raw.weeklyRuns > 7
  ) {
    throw new PlanEngineError("WEEKLY_RUNS_INVALID", "周频次无效");
  }
  if (
    !Number.isFinite(raw.longestRunKm) ||
    raw.longestRunKm < 0 ||
    raw.longestRunKm > 100
  ) {
    throw new PlanEngineError("LONGEST_RUN_INVALID", "最长跑无效");
  }
  if (
    !Number.isInteger(raw.painLevel) ||
    raw.painLevel < 0 ||
    raw.painLevel > 10
  ) {
    throw new PlanEngineError("PAIN_INVALID", "疼痛评分无效");
  }

  let recentRace = raw.recentRace;
  if (recentRace) {
    if (
      !isValidDateOnly(recentRace.raceDate) ||
      recentRace.distanceKm <= 0 ||
      recentRace.timeSec <= 0
    ) {
      recentRace = null;
    }
  }

  return {
    generationDate: raw.generationDate,
    distanceType: raw.distanceType,
    raceDate: raw.raceDate,
    targetTimeSec: raw.targetTimeSec && raw.targetTimeSec > 0 ? raw.targetTimeSec : null,
    weeklyDistanceKm: raw.weeklyDistanceKm,
    weeklyRuns: raw.weeklyRuns,
    longestRunKm: raw.longestRunKm,
    trainableDays: days,
    longRunDay: raw.longRunDay,
    painLevel: raw.painLevel,
    restrictions: raw.restrictions?.trim() || null,
    recentRace,
  };
}

export function computeTotalWeeks(generationDate: string, raceDate: string): number {
  const start = startOfMondayWeek(generationDate);
  const raceWeek = startOfMondayWeek(raceDate);
  return Math.floor(daysBetween(start, raceWeek) / 7) + 1;
}

export function isInsufficientBase(input: PlanEngineInput): boolean {
  if (input.distanceType === "half") {
    return input.weeklyDistanceKm < 20 || input.longestRunKm < 8;
  }
  if (input.distanceType === "full") {
    return input.weeklyDistanceKm < 30 || input.longestRunKm < 14;
  }
  return false;
}

// ─── Phases ──────────────────────────────────────────────

export function allocatePhases(
  totalWeeks: number,
  distanceType: DistanceType,
): PlanPhase[] {
  const taper = TAPER_WEEKS[distanceType];
  const preTaper = totalWeeks - taper;
  // base : build : specific ≈ 2 : 2 : 1 of pre-taper (min 1 each when possible)
  let base = Math.max(1, Math.round(preTaper * 0.4));
  let build = Math.max(1, Math.round(preTaper * 0.4));
  let specific = preTaper - base - build;
  if (specific < 1 && preTaper >= 3) {
    specific = 1;
    if (build > base) build -= 1;
    else base -= 1;
  }
  // Fix sum
  while (base + build + specific > preTaper) {
    if (base >= build && base >= specific && base > 1) base -= 1;
    else if (build >= specific && build > 1) build -= 1;
    else if (specific > 1) specific -= 1;
    else break;
  }
  while (base + build + specific < preTaper) {
    build += 1;
  }

  const phases: PlanPhase[] = [];
  for (let i = 0; i < base; i++) phases.push("base");
  for (let i = 0; i < build; i++) phases.push("build");
  for (let i = 0; i < specific; i++) phases.push("specific");
  for (let i = 0; i < taper; i++) phases.push("taper");
  return phases;
}

function isRecoveryWeek(
  weekNumber: number,
  totalWeeks: number,
  taperWeeks: number,
): boolean {
  const preTaper = totalWeeks - taperWeeks;
  if (weekNumber > preTaper) return false;
  // Every 4th week in pre-taper; never immediately before taper
  if (weekNumber === preTaper) return false;
  return weekNumber % 4 === 0;
}

// ─── Volume ──────────────────────────────────────────────

function buildWeeklyTargets(
  totalWeeks: number,
  phases: PlanPhase[],
  input: PlanEngineInput,
  completionMode: boolean,
  warnings: PlanWarning[],
): number[] {
  const taperWeeks = TAPER_WEEKS[input.distanceType];
  const preTaper = totalWeeks - taperWeeks;

  let base = Math.max(12, input.weeklyDistanceKm);
  if (completionMode) {
    base = Math.min(base, input.distanceType === "full" ? 25 : 18);
  }
  // Cap starting volume for sparse availability
  const maxPerDay = LONG_CAP_KM[input.distanceType];
  const maxWeek = maxPerDay * Math.min(input.trainableDays.length, 6) * 0.85;
  if (base > maxWeek) {
    base = maxWeek;
    warnings.push({
      code: "VOLUME_CLAMPED",
      message: "根据可训练日与长跑上限，起始周跑量已下调",
    });
  }

  const targets: number[] = [];
  let lastLoad = base;

  for (let w = 1; w <= totalWeeks; w++) {
    const phase = phases[w - 1]!;
    if (phase === "taper") {
      const taperIndex = w - preTaper; // 1..taperWeeks
      const factors =
        taperWeeks === 1
          ? [0.6]
          : taperWeeks === 2
            ? [0.7, 0.5]
            : [0.75, 0.6, 0.45];
      const peak = Math.max(...targets.slice(0, preTaper), lastLoad);
      targets.push(round1(peak * (factors[taperIndex - 1] ?? 0.5)));
      continue;
    }

    if (isRecoveryWeek(w, totalWeeks, taperWeeks)) {
      const prev = targets[w - 2] ?? lastLoad;
      targets.push(round1(prev * RECOVERY_FACTOR));
    } else {
      if (w === 1) {
        targets.push(round1(base));
      } else {
        const prev = targets[w - 2]!;
        // Grow from last non-recovery when possible
        let ref = prev;
        if (w >= 2 && isRecoveryWeek(w - 1, totalWeeks, taperWeeks)) {
          // After recovery, grow from pre-recovery peak (last load week)
          ref = lastLoad;
        }
        const next = ref * (1 + LOAD_GROWTH);
        // Enforce ≤10% vs immediate previous week
        const capped = Math.min(next, prev * 1.1);
        targets.push(round1(capped));
        lastLoad = Math.max(lastLoad, capped);
      }
      lastLoad = Math.max(lastLoad, targets[w - 1]!);
    }
  }

  return targets;
}

// ─── Pace ────────────────────────────────────────────────

interface PaceContext {
  hasBenchmark: boolean;
  easyMin: number;
  easyMax: number;
  qualityMin: number;
  qualityMax: number;
  longMin: number;
  longMax: number;
  raceMin: number | null;
  raceMax: number | null;
}

function resolvePace(input: PlanEngineInput, warnings: PlanWarning[]): PaceContext {
  const race = input.recentRace;
  if (!race) {
    warnings.push({
      code: "NO_BENCHMARK_PACE",
      message: "无有效基准成绩，课表仅显示 RPE，不显示配速区间",
    });
    return noPace();
  }

  const age = daysBetween(race.raceDate, input.generationDate);
  if (age < 0) {
    warnings.push({
      code: "NO_BENCHMARK_PACE",
      message: "基准成绩日期在未来，已忽略配速",
    });
    return noPace();
  }
  if (age > 365) {
    warnings.push({
      code: "STALE_BENCHMARK",
      message: "基准成绩超过 365 天，已忽略配速",
    });
    return noPace();
  }

  // Simple Riegel-like conversion to goal distance pace (min/km)
  const goalKm = DISTANCE_KM[input.distanceType];
  const racePace = race.timeSec / 60 / race.distanceKm; // min/km
  const equiv =
    racePace * Math.pow(goalKm / race.distanceKm, 0.06); // mild endurance factor

  return {
    hasBenchmark: true,
    easyMin: round2(equiv * 1.2),
    easyMax: round2(equiv * 1.35),
    qualityMin: round2(equiv * 0.95),
    qualityMax: round2(equiv * 1.05),
    longMin: round2(equiv * 1.15),
    longMax: round2(equiv * 1.28),
    raceMin: round2(equiv * 0.98),
    raceMax: round2(equiv * 1.02),
  };
}

function noPace(): PaceContext {
  return {
    hasBenchmark: false,
    easyMin: 0,
    easyMax: 0,
    qualityMin: 0,
    qualityMax: 0,
    longMin: 0,
    longMax: 0,
    raceMin: null,
    raceMax: null,
  };
}

// ─── Weekly scheduling ───────────────────────────────────

function scheduleWeek(args: {
  weekNumber: number;
  phase: PlanPhase;
  weekStart: string;
  weekEnd: string;
  targetKm: number;
  isRaceWeek: boolean;
  raceDate: string;
  input: PlanEngineInput;
  completionMode: boolean;
  isRecovery: boolean;
  pace: PaceContext;
  prevQualityEpoch: number | null;
  warnings: PlanWarning[];
}): PlannedWorkout[] {
  const {
    weekNumber,
    phase,
    weekStart,
    targetKm,
    isRaceWeek,
    raceDate,
    input,
    completionMode,
    isRecovery,
    pace,
    prevQualityEpoch,
    warnings,
  } = args;

  const result: PlannedWorkout[] = [];
  const raceEpoch = toEpochDay(raceDate);

  // Race day event
  if (isRaceWeek) {
    result.push(
      makeWorkout({
        weekNumber,
        phase,
        date: raceDate,
        type: "race",
        distanceKm: DISTANCE_KM[input.distanceType],
        durationMin: null,
        rpe: null,
        isQuality: false,
        pace,
        notes: "比赛日 — 按既定策略完赛，不作为训练负荷计入",
      }),
    );
  }

  // Available training days this week
  let trainable = input.trainableDays
    .map((dow) => {
      const offset = (dow + 7 - dayOfWeek(weekStart)) % 7;
      const date = addDays(weekStart, offset);
      return { dow, date, epoch: toEpochDay(date) };
    })
    .filter((d) => {
      if (isRaceWeek) {
        // No training on/after race; day before race is rest
        if (d.epoch >= raceEpoch) return false;
        if (d.epoch === raceEpoch - 1) return false;
      }
      return true;
    })
    .sort((a, b) => a.epoch - b.epoch);

  if (trainable.length === 0) {
    return result;
  }

  // Desired session count
  let sessions = clamp(
    input.weeklyRuns || trainable.length,
    3,
    Math.min(6, trainable.length),
  );
  if (isRaceWeek) {
    sessions = Math.min(sessions, Math.max(1, trainable.length));
    // Prefer fewer sessions in race week
    sessions = Math.min(sessions, 3);
  }
  if (isRecovery) {
    sessions = Math.max(3, sessions - 1);
  }

  // Quality count
  let qualityCount = 0;
  if (!isRaceWeek && !isRecovery && phase !== "base" && !completionMode) {
    qualityCount = phase === "specific" ? 2 : 1;
  }
  if (completionMode) qualityCount = 0;
  if (input.painLevel >= 3) qualityCount = 0;
  if (phase === "taper") qualityCount = Math.min(qualityCount, 1);
  qualityCount = Math.min(qualityCount, 2, Math.max(0, sessions - 2)); // keep long + easy

  // Long run day
  const longCandidates = trainable.filter((d) => d.dow === input.longRunDay);
  let longDay = !isRaceWeek && longCandidates[0] ? longCandidates[0] : null;
  if (!longDay && !isRaceWeek) {
    // Fallback: latest trainable day in week
    longDay = trainable[trainable.length - 1] ?? null;
  }

  // Pick quality days with spacing
  const qualityDays: typeof trainable = [];
  if (qualityCount > 0) {
    const candidates = trainable.filter(
      (d) => !longDay || d.epoch !== longDay.epoch,
    );
    const picked = pickQualityDays(
      candidates,
      qualityCount,
      prevQualityEpoch,
      raceEpoch,
    );
    if (picked.length < qualityCount) {
      warnings.push({
        code: "QUALITY_REDUCED_FOR_SPACING",
        message: `第 ${weekNumber} 周质量课因间隔限制减少为 ${picked.length} 次`,
      });
    }
    qualityDays.push(...picked);
  }

  // Select session days: long + quality + fill with easiest available
  const selected = new Map<number, "long" | "quality" | "easy">();
  if (longDay) selected.set(longDay.epoch, "long");
  for (const q of qualityDays) selected.set(q.epoch, "quality");

  const remaining = trainable
    .filter((d) => !selected.has(d.epoch))
    .sort((a, b) => a.epoch - b.epoch);
  while (selected.size < sessions && remaining.length > 0) {
    // Prefer mid-week fill, deterministic: earliest remaining
    const next = remaining.shift()!;
    selected.set(next.epoch, "easy");
  }

  // Ensure ≥1 rest day among week (non-race days)
  // If we filled all 7, drop one easy
  if (selected.size >= 7) {
    const easyEpoch = [...selected.entries()].find(([, t]) => t === "easy")?.[0];
    if (easyEpoch != null) selected.delete(easyEpoch);
  }

  // Distance allocation
  const sessionList = [...selected.entries()]
    .map(([epoch, kind]) => ({
      epoch,
      kind,
      date: trainable.find((t) => t.epoch === epoch)!.date,
      dow: trainable.find((t) => t.epoch === epoch)!.dow,
    }))
    .sort((a, b) => a.epoch - b.epoch);

  const distances = allocateDistances(
    sessionList,
    targetKm,
    input.distanceType,
    warnings,
    weekNumber,
  );

  for (const s of sessionList) {
    const dist = distances.get(s.epoch) ?? 0;
    if (s.kind === "long") {
      result.push(
        makeWorkout({
          weekNumber,
          phase,
          date: s.date,
          type: "long",
          distanceKm: dist,
          durationMin: durationFromDistance(dist, pace, "long"),
          rpe: 4,
          isQuality: false,
          pace,
          notes: isRecovery ? "恢复周长跑，保持轻松" : null,
        }),
      );
    } else if (s.kind === "quality") {
      const qType = qualityTypeForPhase(phase, weekNumber);
      result.push(
        makeWorkout({
          weekNumber,
          phase,
          date: s.date,
          type: qType,
          distanceKm: dist,
          durationMin: durationFromDistance(dist, pace, "quality"),
          rpe: qType === "intervals" ? 8 : 7,
          isQuality: true,
          pace,
          notes: null,
        }),
      );
    } else {
      const type: PlannedWorkoutType =
        isRecovery || phase === "taper" ? "recovery" : "easy";
      result.push(
        makeWorkout({
          weekNumber,
          phase,
          date: s.date,
          type,
          distanceKm: dist,
          durationMin: durationFromDistance(dist, pace, "easy"),
          rpe: type === "recovery" ? 2 : 3,
          isQuality: false,
          pace,
          notes: null,
        }),
      );
    }
  }

  // Adjust easy duration share toward 75–85% at plan level later; per-week soft bias:
  // already using RPE 2–4 for easy/recovery/long.

  return result.sort((a, b) => a.scheduledDate.localeCompare(b.scheduledDate));
}

function pickQualityDays(
  candidates: { epoch: number; date: string; dow: number }[],
  count: number,
  prevQualityEpoch: number | null,
  raceEpoch: number,
): typeof candidates {
  const valid = candidates.filter((c) => {
    // No quality within 2 calendar days before race (epoch diff < 2 means too close)
    if (raceEpoch - c.epoch < 2 && raceEpoch - c.epoch >= 0) return false;
    if (c.epoch >= raceEpoch) return false;
    if (prevQualityEpoch != null && c.epoch - prevQualityEpoch < 2) return false;
    return true;
  });

  if (count <= 0 || valid.length === 0) return [];
  if (count === 1) {
    // Prefer mid candidates
    return [valid[Math.floor((valid.length - 1) / 2)]!];
  }

  // Find first pair with epoch difference ≥ 2
  for (let i = 0; i < valid.length; i++) {
    for (let j = i + 1; j < valid.length; j++) {
      if (valid[j]!.epoch - valid[i]!.epoch >= 2) {
        return [valid[i]!, valid[j]!];
      }
    }
  }
  return [valid[0]!];
}

function allocateDistances(
  sessions: { epoch: number; kind: "long" | "quality" | "easy" }[],
  targetKm: number,
  distanceType: DistanceType,
  warnings: PlanWarning[],
  weekNumber: number,
): Map<number, number> {
  const map = new Map<number, number>();
  if (sessions.length === 0 || targetKm <= 0) return map;

  const longCap = LONG_CAP_KM[distanceType];
  const longSession = sessions.find((s) => s.kind === "long");
  let longKm = 0;
  if (longSession) {
    longKm = Math.min(targetKm * 0.35, longCap, targetKm * 0.4);
    // Ensure long is biggest
    longKm = Math.max(longKm, targetKm / sessions.length);
    longKm = Math.min(longKm, longCap, targetKm * 0.4);
    if (longKm >= longCap - 0.05) {
      warnings.push({
        code: "LONG_RUN_CAPPED",
        message: `第 ${weekNumber} 周长跑已触及 ${longCap} km 上限`,
      });
    }
  }

  const rest = targetKm - longKm;
  const others = sessions.filter((s) => s.kind !== "long");
  const quality = others.filter((s) => s.kind === "quality");
  const easy = others.filter((s) => s.kind === "easy");

  // Quality gets slightly more than easy each
  const qWeight = 1.15;
  const eWeight = 1;
  const totalWeight =
    quality.length * qWeight + easy.length * eWeight || 1;

  for (const s of sessions) {
    if (s.kind === "long") {
      map.set(s.epoch, round1(longKm));
    } else if (s.kind === "quality") {
      map.set(s.epoch, round1((rest * qWeight) / totalWeight));
    } else {
      map.set(s.epoch, round1((rest * eWeight) / totalWeight));
    }
  }

  // Fix rounding drift on last easy/long
  const sum = [...map.values()].reduce((a, b) => a + b, 0);
  const drift = round1(targetKm - sum);
  if (drift !== 0) {
    const adjEpoch =
      easy[easy.length - 1]?.epoch ??
      longSession?.epoch ??
      sessions[sessions.length - 1]!.epoch;
    map.set(adjEpoch, round1((map.get(adjEpoch) ?? 0) + drift));
  }

  // Ensure no easy exceeds long
  if (longSession) {
    const lk = map.get(longSession.epoch) ?? 0;
    for (const s of others) {
      const v = map.get(s.epoch) ?? 0;
      if (v > lk) map.set(s.epoch, round1(lk * 0.9));
    }
  }

  return map;
}

function qualityTypeForPhase(
  phase: PlanPhase,
  weekNumber: number,
): PlannedWorkoutType {
  if (phase === "specific") {
    return weekNumber % 2 === 0 ? "specific" : "threshold";
  }
  if (phase === "build") {
    return weekNumber % 2 === 0 ? "intervals" : "threshold";
  }
  return "threshold";
}

function durationFromDistance(
  km: number,
  pace: PaceContext,
  kind: "easy" | "long" | "quality",
): number {
  let minPerKm = EASY_PACE_MIN_PER_KM;
  if (pace.hasBenchmark) {
    if (kind === "quality") minPerKm = (pace.qualityMin + pace.qualityMax) / 2;
    else if (kind === "long") minPerKm = (pace.longMin + pace.longMax) / 2;
    else minPerKm = (pace.easyMin + pace.easyMax) / 2;
  }
  let mins = Math.round(km * minPerKm);
  if (kind === "long") mins = Math.min(mins, 180);
  return Math.max(10, mins);
}

function makeWorkout(args: {
  weekNumber: number;
  phase: PlanPhase;
  date: string;
  type: PlannedWorkoutType;
  distanceKm: number | null;
  durationMin: number | null;
  rpe: number | null;
  isQuality: boolean;
  pace: PaceContext;
  notes: string | null;
}): PlannedWorkout {
  let paceMin: number | null = null;
  let paceMax: number | null = null;
  if (args.pace.hasBenchmark && args.type !== "race") {
    if (args.isQuality) {
      paceMin = args.pace.qualityMin;
      paceMax = args.pace.qualityMax;
    } else if (args.type === "long") {
      paceMin = args.pace.longMin;
      paceMax = args.pace.longMax;
    } else {
      paceMin = args.pace.easyMin;
      paceMax = args.pace.easyMax;
    }
  } else if (args.pace.hasBenchmark && args.type === "race") {
    paceMin = args.pace.raceMin;
    paceMax = args.pace.raceMax;
  }

  // Full marathon long-run duration cap
  let durationMin = args.durationMin;
  let distanceKm = args.distanceKm;
  if (args.type === "long" && durationMin != null && durationMin > 180) {
    durationMin = 180;
    if (distanceKm != null && args.pace.hasBenchmark) {
      const mid = (args.pace.longMin + args.pace.longMax) / 2;
      distanceKm = round1(Math.min(distanceKm, 180 / mid));
    }
  }

  return {
    weekNumber: args.weekNumber,
    phase: args.phase,
    dayOfWeek: dayOfWeek(args.date),
    scheduledDate: args.date,
    workoutType: args.type,
    distanceKm: distanceKm != null ? round1(distanceKm) : null,
    durationMin,
    targetRpe: args.rpe,
    targetPaceMinKm: paceMin,
    targetPaceMaxKm: paceMax,
    isQuality: args.isQuality,
    notes: args.notes,
  };
}

// ─── Invariants ──────────────────────────────────────────

export function enforceInvariants(
  workouts: PlannedWorkout[],
  weeks: PlannedWeek[],
  input: PlanEngineInput,
  totalWeeks: number,
): void {
  const dates = new Set<string>();
  for (const w of workouts) {
    if (dates.has(w.scheduledDate)) {
      throw new PlanEngineError("DUPLICATE_DATE", `重复日期 ${w.scheduledDate}`);
    }
    dates.add(w.scheduledDate);

    if (w.dayOfWeek !== dayOfWeek(w.scheduledDate)) {
      throw new PlanEngineError("WEEKDAY_MISMATCH", w.scheduledDate);
    }

    if (w.workoutType !== "race" && !input.trainableDays.includes(w.dayOfWeek)) {
      throw new PlanEngineError(
        "FORBIDDEN_DAY",
        `非可训练日排课 ${w.scheduledDate}`,
      );
    }

    if (w.distanceKm != null && w.distanceKm < 0) {
      throw new PlanEngineError("NEGATIVE_DISTANCE", w.scheduledDate);
    }
  }

  // Growth ≤10% week to week (training distance)
  for (let i = 1; i < weeks.length; i++) {
    const prev = weeks[i - 1]!.plannedDistanceKm;
    const cur = weeks[i]!.plannedDistanceKm;
    if (prev > 0 && cur > prev * 1.1 + 0.15) {
      // Allow tiny float slack; taper/recovery can drop
      throw new PlanEngineError(
        "GROWTH_EXCEEDED",
        `第 ${i + 1} 周跑量增长超限 ${prev} → ${cur}`,
      );
    }
  }

  // Quality spacing ≥ 2 calendar days
  const quality = workouts
    .filter((w) => w.isQuality)
    .sort((a, b) => a.scheduledDate.localeCompare(b.scheduledDate));
  for (let i = 1; i < quality.length; i++) {
    if (daysBetween(quality[i - 1]!.scheduledDate, quality[i]!.scheduledDate) < 2) {
      throw new PlanEngineError(
        "QUALITY_SPACING",
        `${quality[i - 1]!.scheduledDate} / ${quality[i]!.scheduledDate}`,
      );
    }
  }

  // Max 2 quality per week
  for (let w = 1; w <= totalWeeks; w++) {
    const q = workouts.filter((x) => x.weekNumber === w && x.isQuality).length;
    if (q > 2) {
      throw new PlanEngineError("TOO_MANY_QUALITY", `第 ${w} 周 ${q} 次质量课`);
    }
  }

  // Race day present exactly once
  const races = workouts.filter((w) => w.workoutType === "race");
  if (races.length !== 1 || races[0]!.scheduledDate !== input.raceDate) {
    throw new PlanEngineError("RACE_MISSING", "比赛日未正确写入计划");
  }

  // Day before race: no training
  const dayBefore = addDays(input.raceDate, -1);
  if (workouts.some((w) => w.scheduledDate === dayBefore && w.workoutType !== "race")) {
    throw new PlanEngineError("PRE_RACE_REST", "比赛日前一天应休息");
  }

  // No post-race training
  if (
    workouts.some(
      (w) =>
        w.workoutType !== "race" &&
        toEpochDay(w.scheduledDate) > toEpochDay(input.raceDate),
    )
  ) {
    throw new PlanEngineError("POST_RACE_WORKOUT", "比赛日后不应再有训练");
  }
}

// ─── Utils ───────────────────────────────────────────────

function scaleWeekDistances(
  workouts: PlannedWorkout[],
  weekNumber: number,
  fromTotal: number,
  toTotal: number,
): void {
  if (fromTotal <= 0 || toTotal <= 0) return;
  const factor = toTotal / fromTotal;
  const weekRuns = workouts.filter(
    (w) =>
      w.weekNumber === weekNumber &&
      w.workoutType !== "race" &&
      w.distanceKm != null,
  );
  for (const w of weekRuns) {
    w.distanceKm = round1((w.distanceKm ?? 0) * factor);
    if (w.durationMin != null) {
      w.durationMin = Math.max(10, Math.round(w.durationMin * factor));
      if (w.workoutType === "long") {
        w.durationMin = Math.min(180, w.durationMin);
      }
    }
  }
  // Fix residual on the last non-race workout
  const sum = weekRuns.reduce((s, w) => s + (w.distanceKm ?? 0), 0);
  const drift = round1(toTotal - sum);
  if (drift !== 0 && weekRuns.length > 0) {
    const last = weekRuns[weekRuns.length - 1]!;
    last.distanceKm = round1((last.distanceKm ?? 0) + drift);
  }
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}
