import { fromEpochDay, toEpochDay } from "@/lib/datetime";

export interface ActivityRecord {
  date: string;
  workoutType: string;
  distanceKm: number | null;
  durationMin: number | null;
  actualRpe: number | null;
  painLevel: number | null;
  notes?: string | null;
}

export interface CheckinRecord {
  date: string;
  fatigueLevel: number;
  painLevel: number;
}

export interface PlannedWorkoutRef {
  id: string;
  scheduledDate: string;
  workoutType: string;
  distanceKm: number | null;
  durationMin: number | null;
  targetRpe: number | null;
  targetPaceMinKm: number | null;
  targetPaceMaxKm: number | null;
  isQuality: boolean;
  dayOfWeek: number;
  weekNumber: number;
}

export interface AdjustmentProposal {
  type: "cancel" | "move" | "reduce_intensity" | "reduce_load" | "medical_alert";
  targetId: string;
  targetDate: string;
  description: string;
  current: Partial<PlannedWorkoutRef>;
  proposed: Partial<PlannedWorkoutRef>;
  severity: "info" | "warning" | "critical";
}

export interface AdjustmentContext {
  userId: string;
  planVersionId: string;
  workouts: PlannedWorkoutRef[];
  activities: ActivityRecord[];
  checkins: CheckinRecord[];
  today: string;
}

export function proposeAdjustments(ctx: AdjustmentContext): {
  proposals: AdjustmentProposal[];
  warnings: string[];
} {
  const proposals: AdjustmentProposal[] = [];
  const warnings: string[] = [];
  const seen = new Set<string>();
  const nowEpoch = toEpochDay(ctx.today);
  const byDate = new Map(ctx.workouts.map((w) => [w.scheduledDate, w]));
  const completed = new Set(ctx.activities.map((a) => a.date));

  const push = (p: AdjustmentProposal) => {
    if (p.type !== "medical_alert" && seen.has(p.targetId)) return;
    seen.add(p.targetId);
    proposals.push(p);
  };

  // 1. Missed (last 7d): cancel easy / move quality
  for (const w of ctx.workouts) {
    const e = toEpochDay(w.scheduledDate);
    if (e >= nowEpoch || e < nowEpoch - 7) continue;
    if (w.workoutType === "race" || w.workoutType === "rest") continue;
    if (completed.has(w.scheduledDate)) continue;

    if (w.isQuality) {
      const slot = findNextOpenSlot(ctx.workouts, w, nowEpoch);
      if (slot) {
        push({
          type: "move",
          targetId: w.id,
          targetDate: w.scheduledDate,
          description: `漏课：${w.scheduledDate} 未完成——移至 ${slot}`,
          current: { id: w.id, scheduledDate: w.scheduledDate },
          proposed: { scheduledDate: slot },
          severity: "warning",
        });
      } else {
        push({
          type: "cancel",
          targetId: w.id,
          targetDate: w.scheduledDate,
          description: `漏课：${w.scheduledDate} 未完成——无可移日，取消该次素质课`,
          current: { id: w.id, scheduledDate: w.scheduledDate },
          proposed: {},
          severity: "warning",
        });
      }
    } else {
      push({
        type: "cancel",
        targetId: w.id,
        targetDate: w.scheduledDate,
        description: `漏课：${w.scheduledDate} 未完成——取消该次训练`,
        current: { id: w.id, scheduledDate: w.scheduledDate },
        proposed: {},
        severity: "info",
      });
    }
  }

  // 2. RPE ≥ target+2
  for (const act of ctx.activities) {
    const planW = byDate.get(act.date);
    if (!planW?.isQuality || planW.targetRpe == null || act.actualRpe == null) continue;
    if (act.actualRpe < planW.targetRpe + 2) continue;
    const upcoming =
      ctx.workouts.find(
        (w) =>
          toEpochDay(w.scheduledDate) >= nowEpoch &&
          w.isQuality &&
          w.workoutType === planW.workoutType &&
          w.id !== planW.id,
      ) ?? planW;
    push({
      type: "reduce_intensity",
      targetId: upcoming.id,
      targetDate: upcoming.scheduledDate,
      description: `RPE 超标：${act.date} 实际 ${act.actualRpe} / 目标 ${planW.targetRpe}——降低后续同类型课强度`,
      current: {
        targetRpe: upcoming.targetRpe,
        targetPaceMinKm: upcoming.targetPaceMinKm,
        targetPaceMaxKm: upcoming.targetPaceMaxKm,
      },
      proposed: {
        targetRpe: upcoming.targetRpe != null ? Math.max(3, upcoming.targetRpe - 1) : null,
        targetPaceMinKm:
          upcoming.targetPaceMinKm != null
            ? Math.round((upcoming.targetPaceMinKm + 0.15) * 100) / 100
            : null,
        targetPaceMaxKm:
          upcoming.targetPaceMaxKm != null
            ? Math.round((upcoming.targetPaceMaxKm + 0.15) * 100) / 100
            : null,
      },
      severity: "warning",
    });
  }

  // 3. consecutive anomaly ≥3
  const streak = countConsecutiveAnomaly(ctx.checkins, ctx.today);
  if (streak >= 3) {
    for (const qw of ctx.workouts
      .filter((w) => {
        const e = toEpochDay(w.scheduledDate);
        return e >= nowEpoch && e <= nowEpoch + 7 && w.isQuality && w.workoutType !== "race";
      })
      .slice(0, 2)) {
      push({
        type: "reduce_load",
        targetId: qw.id,
        targetDate: qw.scheduledDate,
        description: `连续 ${streak} 天异常疲劳/疼痛——降低 ${qw.scheduledDate} 负荷`,
        current: { distanceKm: qw.distanceKm, targetRpe: qw.targetRpe },
        proposed: {
          distanceKm:
            qw.distanceKm != null ? Math.round(qw.distanceKm * 0.7 * 10) / 10 : null,
          targetRpe: qw.targetRpe != null ? Math.max(3, qw.targetRpe - 2) : null,
        },
        severity: "warning",
      });
    }
  }

  // 4. pain ≥7
  let maxPain = 0;
  for (const c of ctx.checkins) {
    const e = toEpochDay(c.date);
    if (e >= nowEpoch - 2 && e <= nowEpoch) maxPain = Math.max(maxPain, c.painLevel);
  }
  for (const a of ctx.activities) {
    if (a.painLevel == null) continue;
    const e = toEpochDay(a.date);
    if (e >= nowEpoch - 2 && e <= nowEpoch) maxPain = Math.max(maxPain, a.painLevel);
  }
  if (maxPain >= 7) {
    for (const w of ctx.workouts) {
      const e = toEpochDay(w.scheduledDate);
      if (e < nowEpoch || e > nowEpoch + 2) continue;
      if (w.workoutType === "race" || w.workoutType === "rest") continue;
      push({
        type: "cancel",
        targetId: w.id,
        targetDate: w.scheduledDate,
        description: `疼痛评分 ≥7——取消 ${w.scheduledDate} 训练，建议休息并就医检查`,
        current: { id: w.id, scheduledDate: w.scheduledDate },
        proposed: {},
        severity: "critical",
      });
    }
  }

  // 5. medical keywords
  for (const act of ctx.activities) {
    if (!hasMedicalKeywords(act.notes)) continue;
    push({
      type: "medical_alert",
      targetId: `medical:${act.date}`,
      targetDate: act.date,
      description: `记录含胸痛/晕厥关键词——建议立即就医评估`,
      current: {},
      proposed: {},
      severity: "critical",
    });
    warnings.push(
      `${act.date} 活动备注出现医疗警示关键词，请立即就医评估，勿自行继续高强度训练。`,
    );
  }

  return { proposals, warnings };
}

export function findNextOpenSlot(
  workouts: PlannedWorkoutRef[],
  missed: PlannedWorkoutRef,
  nowEpoch: number,
): string | null {
  const occupied = new Set(workouts.map((w) => w.scheduledDate));
  const missedEpoch = toEpochDay(missed.scheduledDate);
  for (let offset = 1; offset <= 2; offset++) {
    const candidate = missedEpoch + offset;
    if (candidate < nowEpoch) continue;
    const date = fromEpochDay(candidate);
    if (!occupied.has(date)) return date;
  }
  return null;
}

export function countConsecutiveAnomaly(
  checkins: CheckinRecord[],
  today: string,
): number {
  const sorted = [...checkins]
    .filter((c) => toEpochDay(c.date) <= toEpochDay(today))
    .sort((a, b) => b.date.localeCompare(a.date));
  let streak = 0;
  for (const c of sorted) {
    if (c.fatigueLevel >= 4 || c.painLevel >= 5) streak++;
    else break;
  }
  return streak;
}

export function hasMedicalKeywords(notes: string | null | undefined): boolean {
  if (!notes) return false;
  return ["胸痛", "胸闷", "晕厥", "头晕", "心悸", "呼吸困难"].some((k) =>
    notes.includes(k),
  );
}

export interface WorkoutChange {
  workoutId: string;
  scheduledDate?: string;
  workoutType?: string;
  distanceKm?: number | null;
  durationMin?: number | null;
  targetRpe?: number | null;
  targetPaceMinKm?: number | null;
  targetPaceMaxKm?: number | null;
  notes?: string | null;
}

export function applyProposalToWorkouts(
  _workouts: PlannedWorkoutRef[],
  proposals: AdjustmentProposal[],
): { changed: WorkoutChange[]; cancelledIds: Set<string> } {
  const changeMap = new Map<string, WorkoutChange>();
  const cancelledIds = new Set<string>();
  for (const p of proposals) {
    if (p.type === "medical_alert") continue;
    if (p.type === "cancel") {
      cancelledIds.add(p.targetId);
      continue;
    }
    const existing = changeMap.get(p.targetId) ?? { workoutId: p.targetId };
    if (p.type === "move" && p.proposed.scheduledDate) {
      existing.scheduledDate = p.proposed.scheduledDate;
      existing.notes = `已调整（${p.description}）`;
    } else if (p.type === "reduce_intensity") {
      if (p.proposed.targetRpe !== undefined)
        existing.targetRpe = p.proposed.targetRpe as number | null;
      if (p.proposed.targetPaceMinKm !== undefined)
        existing.targetPaceMinKm = p.proposed.targetPaceMinKm as number | null;
      if (p.proposed.targetPaceMaxKm !== undefined)
        existing.targetPaceMaxKm = p.proposed.targetPaceMaxKm as number | null;
      existing.notes = `强度已降低（${p.description}）`;
    } else if (p.type === "reduce_load") {
      if (p.proposed.distanceKm !== undefined)
        existing.distanceKm = p.proposed.distanceKm as number | null;
      if (p.proposed.targetRpe !== undefined)
        existing.targetRpe = p.proposed.targetRpe as number | null;
      existing.notes = `负荷已降低（${p.description}）`;
    }
    changeMap.set(p.targetId, existing);
  }
  for (const id of cancelledIds) changeMap.delete(id);
  return { changed: Array.from(changeMap.values()), cancelledIds };
}
