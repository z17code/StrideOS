export const ALGORITHM_VERSION = "1.0.0";

export type DistanceType = "10k" | "half" | "full";
export type PlanPhase = "base" | "build" | "specific" | "taper";
export type PlannedWorkoutType =
  | "easy"
  | "recovery"
  | "long"
  | "threshold"
  | "intervals"
  | "specific"
  | "race";

export type WarningCode =
  | "INSUFFICIENT_BASE"
  | "COMPLETION_MODE"
  | "DELAY_RECOMMENDED"
  | "NO_BENCHMARK_PACE"
  | "STALE_BENCHMARK"
  | "PAIN_REDUCED_QUALITY"
  | "QUALITY_REDUCED_FOR_SPACING"
  | "VOLUME_CLAMPED"
  | "LONG_RUN_CAPPED";

export interface RecentRaceInput {
  distanceKm: number;
  timeSec: number;
  raceDate: string;
}

export interface PlanEngineInput {
  /** Captured Asia/Shanghai date for this generation request. */
  generationDate: string;
  distanceType: DistanceType;
  raceDate: string;
  targetTimeSec: number | null;
  weeklyDistanceKm: number;
  weeklyRuns: number;
  longestRunKm: number;
  /** 0=Sun … 6=Sat */
  trainableDays: number[];
  longRunDay: number;
  painLevel: number;
  restrictions: string | null;
  recentRace: RecentRaceInput | null;
}

export interface PlannedWorkout {
  weekNumber: number;
  phase: PlanPhase;
  dayOfWeek: number;
  scheduledDate: string;
  workoutType: PlannedWorkoutType;
  distanceKm: number | null;
  durationMin: number | null;
  targetRpe: number | null;
  targetPaceMinKm: number | null;
  targetPaceMaxKm: number | null;
  isQuality: boolean;
  notes: string | null;
}

export interface PlannedWeek {
  weekNumber: number;
  phase: PlanPhase;
  startsOn: string;
  endsOn: string;
  plannedDistanceKm: number;
  isRecovery: boolean;
}

export interface PlanWarning {
  code: WarningCode;
  message: string;
}

export interface GeneratedPlan {
  algorithmVersion: string;
  startsOn: string;
  endsOn: string;
  totalWeeks: number;
  completionMode: boolean;
  weeks: PlannedWeek[];
  workouts: PlannedWorkout[];
  warnings: PlanWarning[];
  inputSnapshot: PlanEngineInput & {
    algorithmVersion: string;
    completionMode: boolean;
  };
}

export class PlanEngineError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = "PlanEngineError";
  }
}

export const DISTANCE_KM: Record<DistanceType, number> = {
  "10k": 10,
  half: 21.1,
  full: 42.2,
};

export const DISTANCE_LABEL: Record<DistanceType, string> = {
  "10k": "10 公里",
  half: "半程马拉松",
  full: "全程马拉松",
};

export const WORKOUT_LABEL: Record<PlannedWorkoutType | "rest" | "strength", string> =
  {
    easy: "轻松跑",
    recovery: "恢复跑",
    long: "长距离跑",
    threshold: "阈值跑",
    intervals: "间歇跑",
    specific: "专项配速",
    race: "比赛日",
    rest: "休息",
    strength: "力量训练",
  };

export const PHASE_LABEL: Record<PlanPhase, string> = {
  base: "基础期",
  build: "提升期",
  specific: "专项期",
  taper: "减量期",
};
