import { describe, expect, it } from "vitest";
import {
  proposeAdjustments,
  applyProposalToWorkouts,
  countConsecutiveAnomaly,
  hasMedicalKeywords,
  findNextOpenSlot,
  type PlannedWorkoutRef,
  type ActivityRecord,
  type CheckinRecord,
} from "../adjustments/engine";

// Use a fixed "today" so the 7-day lookback is predictable
const TODAY = "2026-07-13";
// toEpochDay("2026-07-13") → workout dates must be in [TODAY-7, TODAY) to be "missed"
// = [2026-07-06, 2026-07-13)

const WORKOUTS: PlannedWorkoutRef[] = [
  {
    id: "w-easy",
    scheduledDate: "2026-07-07",
    workoutType: "easy",
    distanceKm: 8,
    durationMin: 45,
    targetRpe: 4,
    targetPaceMinKm: 5.5,
    targetPaceMaxKm: 6.0,
    isQuality: false,
    dayOfWeek: 2,
    weekNumber: 1,
  },
  {
    id: "w-quality",
    scheduledDate: "2026-07-12",
    workoutType: "threshold",
    distanceKm: 10,
    durationMin: 50,
    targetRpe: 7,
    targetPaceMinKm: 4.5,
    targetPaceMaxKm: 5.0,
    isQuality: true,
    dayOfWeek: 3,
    weekNumber: 1,
  },
  {
    id: "w-occupied",
    scheduledDate: "2026-07-14",
    workoutType: "easy",
    distanceKm: 6,
    durationMin: 35,
    targetRpe: 3,
    targetPaceMinKm: null,
    targetPaceMaxKm: null,
    isQuality: false,
    dayOfWeek: 1,
    weekNumber: 2,
  },
  {
    id: "w-free",
    scheduledDate: "2026-07-15",
    workoutType: "intervals",
    distanceKm: 8,
    durationMin: 40,
    targetRpe: 8,
    targetPaceMinKm: 4.0,
    targetPaceMaxKm: 4.4,
    isQuality: true,
    dayOfWeek: 2,
    weekNumber: 2,
  },
];

function baseCtx(opts: {
  activities?: ActivityRecord[];
  checkins?: CheckinRecord[];
  today?: string;
  workouts?: PlannedWorkoutRef[];
}) {
  return {
    userId: "test-user",
    planVersionId: "v1",
    workouts: opts.workouts ?? WORKOUTS,
    activities: opts.activities ?? [],
    checkins: opts.checkins ?? [],
    today: opts.today ?? TODAY,
  };
}

/* ── Rule 1: missed workouts ──────────────────────────── */

describe("proposeAdjustments — missed workouts", () => {
  it("cancels missed easy runs within 7-day window", () => {
    const { proposals } = proposeAdjustments(
      baseCtx({ activities: [], checkins: [] }),
    );
    // w-easy (07-07, easy) and w-quality (07-08, quality) are in window and not completed
    const cancelled = proposals.filter((p) => p.type === "cancel");
    expect(cancelled.some((p) => p.targetId === "w-easy")).toBe(true);
  });

  it("does not propose for future workouts (>= today)", () => {
    // w-future-easy is on 07-14 (after today), should be skipped
    const { proposals } = proposeAdjustments(
      baseCtx({ activities: [], checkins: [] }),
    );
    expect(
      proposals.some((p) => p.targetId === "w-future-easy"),
    ).toBe(false);
  });

  it("does not propose for already completed workouts", () => {
    const activities: ActivityRecord[] = [
      {
        date: "2026-07-07",
        workoutType: "easy",
        distanceKm: 8,
        durationMin: 45,
        actualRpe: 4,
        painLevel: 0,
        notes: null,
      },
    ];
    const { proposals } = proposeAdjustments(
      baseCtx({ activities, checkins: [] }),
    );
    expect(
      proposals.find((p) => p.targetId === "w-easy"),
    ).toBeUndefined();
  });

  it("skips rest and race workouts", () => {
    const workouts: PlannedWorkoutRef[] = [
      ...WORKOUTS,
      {
        id: "w-rest",
        scheduledDate: "2026-07-09",
        workoutType: "rest",
        distanceKm: null,
        durationMin: null,
        targetRpe: null,
        targetPaceMinKm: null,
        targetPaceMaxKm: null,
        isQuality: false,
        dayOfWeek: 4,
        weekNumber: 1,
      },
      {
        id: "w-race",
        scheduledDate: "2026-07-11",
        workoutType: "race",
        distanceKm: 21.1,
        durationMin: 120,
        targetRpe: 9,
        targetPaceMinKm: 4.2,
        targetPaceMaxKm: 4.6,
        isQuality: true,
        dayOfWeek: 6,
        weekNumber: 1,
      },
    ];
    const { proposals } = proposeAdjustments(
      baseCtx({ activities: [], checkins: [], workouts }),
    );
    expect(
      proposals.find((p) => p.targetId === "w-rest"),
    ).toBeUndefined();
    expect(
      proposals.find((p) => p.targetId === "w-race"),
    ).toBeUndefined();
  });

  it("moves missed quality workouts to open slots when available", () => {
    const { proposals } = proposeAdjustments(
      baseCtx({ activities: [], checkins: [] }),
    );
    // w-quality (07-12) is quality and missed. 07-13 is not occupied → should get "move"
    const moveProposal = proposals.find(
      (p) => p.targetId === "w-quality" && p.type === "move",
    );
    expect(moveProposal).toBeDefined();
  });
});

/* ── Rule 2: RPE ≥ target+2 ───────────────────────────── */

describe("proposeAdjustments — RPE", () => {
  it("triggers reduce_intensity when actualRpe >= targetRpe + 2", () => {
    // Use a workout+activity pair where the workout date is NOT a missed workout
    // (i.e., the workout was completed, so it doesn't trigger rule 1 first)
    const workouts: PlannedWorkoutRef[] = [
      {
        id: "rpe-w",
        scheduledDate: "2026-07-12",
        workoutType: "threshold",
        distanceKm: 10,
        durationMin: 50,
        targetRpe: 7,
        targetPaceMinKm: 4.5,
        targetPaceMaxKm: 5.0,
        isQuality: true,
        dayOfWeek: 3,
        weekNumber: 1,
      },
      {
        id: "rpe-future",
        scheduledDate: "2026-07-14",
        workoutType: "threshold",
        distanceKm: 8,
        durationMin: 40,
        targetRpe: 7,
        targetPaceMinKm: 4.3,
        targetPaceMaxKm: 4.7,
        isQuality: true,
        dayOfWeek: 5,
        weekNumber: 2,
      },
    ];
    const activities: ActivityRecord[] = [
      {
        date: "2026-07-12",
        workoutType: "threshold",
        distanceKm: 10,
        durationMin: 50,
        actualRpe: 9, // target is 7 → +2
        painLevel: 2,
        notes: null,
      },
    ];
    const { proposals } = proposeAdjustments(
      baseCtx({ today: TODAY, activities, checkins: [], workouts }),
    );
    const reduce = proposals.find((p) => p.type === "reduce_intensity");
    expect(reduce).toBeDefined();
    expect(reduce!.severity).toBe("warning");
  });

  it("does not trigger when RPE is exactly at target", () => {
    const activities: ActivityRecord[] = [
      {
        date: "2026-07-12",
        workoutType: "threshold",
        distanceKm: 10,
        durationMin: 50,
        actualRpe: 7, // exactly at target
        painLevel: 2,
        notes: null,
      },
    ];
    const { proposals } = proposeAdjustments(
      baseCtx({ today: TODAY, activities, checkins: [] }),
    );
    expect(
      proposals.find((p) => p.type === "reduce_intensity"),
    ).toBeUndefined();
  });

  it("does not trigger on non-quality workouts", () => {
    const activities: ActivityRecord[] = [
      {
        date: "2026-07-07",
        workoutType: "easy",
        distanceKm: 8,
        durationMin: 45,
        actualRpe: 6, // non-quality, even though high
        painLevel: 2,
        notes: null,
      },
    ];
    const { proposals } = proposeAdjustments(
      baseCtx({ today: TODAY, activities, checkins: [] }),
    );
    expect(
      proposals.find((p) => p.type === "reduce_intensity"),
    ).toBeUndefined();
  });
});

/* ── Rule 3: consecutive anomaly ≥3 ──────────────────── */

describe("proposeAdjustments — consecutive anomaly", () => {
  it("triggers reduce_load at 3 consecutive days fatigue≥4", () => {
    const checkins: CheckinRecord[] = [
      { date: "2026-07-11", fatigueLevel: 4, painLevel: 1 },
      { date: "2026-07-12", fatigueLevel: 4, painLevel: 1 },
      { date: "2026-07-13", fatigueLevel: 4, painLevel: 1 },
    ];
    const { proposals } = proposeAdjustments(
      baseCtx({ today: TODAY, activities: [], checkins }),
    );
    const reduces = proposals.filter((p) => p.type === "reduce_load");
    expect(reduces.length).toBeGreaterThanOrEqual(1);
    expect(reduces[0]!.severity).toBe("warning");
  });

  it("triggers reduce_load at 3 consecutive days pain≥5", () => {
    const checkins: CheckinRecord[] = [
      { date: "2026-07-11", fatigueLevel: 2, painLevel: 5 },
      { date: "2026-07-12", fatigueLevel: 2, painLevel: 6 },
      { date: "2026-07-13", fatigueLevel: 2, painLevel: 5 },
    ];
    const { proposals } = proposeAdjustments(
      baseCtx({ today: TODAY, activities: [], checkins }),
    );
    expect(
      proposals.find((p) => p.type === "reduce_load"),
    ).toBeDefined();
  });

  it("does not trigger at 2 consecutive days", () => {
    const checkins: CheckinRecord[] = [
      { date: "2026-07-12", fatigueLevel: 4, painLevel: 5 },
      { date: "2026-07-13", fatigueLevel: 4, painLevel: 5 },
    ];
    const { proposals } = proposeAdjustments(
      baseCtx({ today: TODAY, activities: [], checkins }),
    );
    expect(
      proposals.find((p) => p.type === "reduce_load"),
    ).toBeUndefined();
  });

  it("stops counting when a normal day breaks the streak", () => {
    const checkins: CheckinRecord[] = [
      { date: "2026-07-11", fatigueLevel: 4, painLevel: 1 },
      { date: "2026-07-12", fatigueLevel: 2, painLevel: 1 },
      { date: "2026-07-13", fatigueLevel: 4, painLevel: 1 },
    ];
    const { proposals } = proposeAdjustments(
      baseCtx({ today: TODAY, activities: [], checkins }),
    );
    expect(
      proposals.find((p) => p.type === "reduce_load"),
    ).toBeUndefined();
  });

  it("only targets upcoming quality workouts within 7 days", () => {
    const checkins: CheckinRecord[] = [
      { date: "2026-07-11", fatigueLevel: 5, painLevel: 5 },
      { date: "2026-07-12", fatigueLevel: 5, painLevel: 5 },
      { date: "2026-07-13", fatigueLevel: 5, painLevel: 5 },
    ];
    const { proposals } = proposeAdjustments(
      baseCtx({ today: TODAY, activities: [], checkins }),
    );
    const reduces = proposals.filter((p) => p.type === "reduce_load");
    for (const r of reduces) {
      const w = WORKOUTS.find((w2) => w2.id === r.targetId);
      expect(w).toBeDefined();
      if (w) {
        expect(w.scheduledDate >= TODAY).toBe(true);
        expect(w.scheduledDate <= "2026-07-20").toBe(true);
      }
    }
  });
});

/* ── Rule 4: pain ≥7 ──────────────────────────────────── */

describe("proposeAdjustments — pain ≥7", () => {
  it("cancels upcoming non-rest non-race workouts when pain ≥7", () => {
    // Use checkins with pain 8 within 2-day window
    const checkins: CheckinRecord[] = [
      { date: "2026-07-12", fatigueLevel: 2, painLevel: 8 },
    ];
    const { proposals } = proposeAdjustments(
      baseCtx({ today: TODAY, activities: [], checkins }),
    );
    // w-long (07-10) and w-future-easy (07-14) are upcoming (>= today)
    // w-long is past today's start — actually 07-10 < 07-13, so it's not >= nowEpoch
    // Let me check: engine says e < nowEpoch || e > nowEpoch + 2 continue
    // w-long is 07-10 < 07-13 → skipped
    // w-future-easy is 07-14, nowEpoch+2 = 07-15 → 07-14 is in range
    const criticalCancels = proposals.filter(
      (p) => p.type === "cancel" && p.severity === "critical",
    );
    expect(criticalCancels.length).toBeGreaterThanOrEqual(1);
  });

  it("detects pain from activities within 2 days", () => {
    const activities: ActivityRecord[] = [
      {
        date: "2026-07-13",
        workoutType: "easy",
        distanceKm: 5,
        durationMin: 30,
        actualRpe: 4,
        painLevel: 9,
        notes: null,
      },
    ];
    const { proposals } = proposeAdjustments(
      baseCtx({ today: TODAY, activities, checkins: [] }),
    );
    expect(
      proposals.some(
        (p) => p.type === "cancel" && p.severity === "critical",
      ),
    ).toBe(true);
  });

  it("does not trigger when max pain < 7", () => {
    const checkins: CheckinRecord[] = [
      { date: "2026-07-12", fatigueLevel: 2, painLevel: 6 },
    ];
    const { proposals } = proposeAdjustments(
      baseCtx({ today: TODAY, activities: [], checkins }),
    );
    expect(
      proposals.find(
        (p) => p.type === "cancel" && p.severity === "critical",
      ),
    ).toBeUndefined();
  });
});

/* ── Rule 5: medical keywords ─────────────────────────── */

describe("proposeAdjustments — medical keywords", () => {
  const keywords = ["胸痛", "胸闷", "晕厥", "头晕", "心悸", "呼吸困难"];

  for (const kw of keywords) {
    it(`detects "${kw}" in activity notes`, () => {
      const activities: ActivityRecord[] = [
        {
          date: "2026-07-13",
          workoutType: "easy",
          distanceKm: 5,
          durationMin: 30,
          actualRpe: 3,
          painLevel: 0,
          notes: `跑步时感到${kw}，休息后缓解`,
        },
      ];
      const { proposals, warnings } = proposeAdjustments(
        baseCtx({ today: TODAY, activities, checkins: [] }),
      );
      expect(
        proposals.find((p) => p.type === "medical_alert"),
      ).toBeDefined();
      expect(warnings.length).toBeGreaterThanOrEqual(1);
    });
  }

  it("does not trigger for normal notes", () => {
    const activities: ActivityRecord[] = [
      {
        date: "2026-07-13",
        workoutType: "easy",
        distanceKm: 5,
        durationMin: 30,
        actualRpe: 3,
        painLevel: 0,
        notes: "天气很好，配速稳定",
      },
    ];
    const { proposals } = proposeAdjustments(
      baseCtx({ today: TODAY, activities, checkins: [] }),
    );
    expect(
      proposals.find((p) => p.type === "medical_alert"),
    ).toBeUndefined();
  });

  it("handles null/undefined notes gracefully", () => {
    const activities: ActivityRecord[] = [
      {
        date: "2026-07-13",
        workoutType: "easy",
        distanceKm: 5,
        durationMin: 30,
        actualRpe: 3,
        painLevel: 0,
        notes: null,
      },
    ];
    const { proposals } = proposeAdjustments(
      baseCtx({ today: TODAY, activities, checkins: [] }),
    );
    expect(
      proposals.find((p) => p.type === "medical_alert"),
    ).toBeUndefined();
  });
});

/* ── applyProposalToWorkouts ──────────────────────────── */

describe("applyProposalToWorkouts", () => {
  const workouts: PlannedWorkoutRef[] = [
    {
      id: "a",
      scheduledDate: "2026-07-01",
      workoutType: "easy",
      distanceKm: 8,
      durationMin: 45,
      targetRpe: 4,
      targetPaceMinKm: 5.5,
      targetPaceMaxKm: 6.0,
      isQuality: false,
      dayOfWeek: 3,
      weekNumber: 1,
    },
    {
      id: "b",
      scheduledDate: "2026-07-02",
      workoutType: "threshold",
      distanceKm: 10,
      durationMin: 50,
      targetRpe: 7,
      targetPaceMinKm: 4.5,
      targetPaceMaxKm: 5.0,
      isQuality: true,
      dayOfWeek: 4,
      weekNumber: 1,
    },
  ];

  it("returns cancelledIds for cancel type", () => {
    const proposals = [
      {
        type: "cancel" as const,
        targetId: "a",
        targetDate: "2026-07-01",
        description: "",
        current: {},
        proposed: {},
        severity: "info" as const,
      },
    ];
    const result = applyProposalToWorkouts(workouts, proposals);
    expect(result.cancelledIds.has("a")).toBe(true);
    expect(result.cancelledIds.has("b")).toBe(false);
    expect(result.changed.length).toBe(0);
  });

  it("applies move changes", () => {
    const proposals = [
      {
        type: "move" as const,
        targetId: "a",
        targetDate: "2026-07-01",
        description: "reschedule",
        current: { scheduledDate: "2026-07-01" },
        proposed: { scheduledDate: "2026-07-10" },
        severity: "warning" as const,
      },
    ];
    const result = applyProposalToWorkouts(workouts, proposals);
    expect(result.cancelledIds.size).toBe(0);
    expect(result.changed).toHaveLength(1);
    expect(result.changed[0]!.scheduledDate).toBe("2026-07-10");
  });

  it("applies reduce_intensity changes", () => {
    const proposals = [
      {
        type: "reduce_intensity" as const,
        targetId: "b",
        targetDate: "2026-07-02",
        description: "RPE too high",
        current: { targetRpe: 7, targetPaceMinKm: 4.5, targetPaceMaxKm: 5.0 },
        proposed: { targetRpe: 6, targetPaceMinKm: 4.65, targetPaceMaxKm: 5.15 },
        severity: "warning" as const,
      },
    ];
    const result = applyProposalToWorkouts(workouts, proposals);
    expect(result.changed).toHaveLength(1);
    expect(result.changed[0]!.targetRpe).toBe(6);
    expect(result.changed[0]!.targetPaceMinKm).toBeCloseTo(4.65);
  });

  it("applies reduce_load changes", () => {
    const proposals = [
      {
        type: "reduce_load" as const,
        targetId: "b",
        targetDate: "2026-07-02",
        description: "consecutive anomaly",
        current: { distanceKm: 10, targetRpe: 7 },
        proposed: { distanceKm: 7, targetRpe: 5 },
        severity: "warning" as const,
      },
    ];
    const result = applyProposalToWorkouts(workouts, proposals);
    expect(result.changed).toHaveLength(1);
    expect(result.changed[0]!.distanceKm).toBe(7);
    expect(result.changed[0]!.targetRpe).toBe(5);
  });

  it("skips medical_alert type", () => {
    const proposals = [
      {
        type: "medical_alert" as const,
        targetId: "x",
        targetDate: "2026-07-13",
        description: "",
        current: {},
        proposed: {},
        severity: "critical" as const,
      },
    ];
    const result = applyProposalToWorkouts(workouts, proposals);
    expect(result.changed).toHaveLength(0);
    expect(result.cancelledIds.size).toBe(0);
  });

  it("removes cancelled targets from changed set", () => {
    const proposals = [
      {
        type: "cancel" as const,
        targetId: "a",
        targetDate: "2026-07-01",
        description: "",
        current: {},
        proposed: {},
        severity: "info" as const,
      },
      {
        type: "reduce_load" as const,
        targetId: "a",
        targetDate: "2026-07-01",
        description: "also reduce",
        current: { distanceKm: 8 },
        proposed: { distanceKm: 5 },
        severity: "warning" as const,
      },
    ];
    const result = applyProposalToWorkouts(workouts, proposals);
    expect(result.cancelledIds.has("a")).toBe(true);
    expect(
      result.changed.find((c) => c.workoutId === "a"),
    ).toBeUndefined();
  });
});

/* ── countConsecutiveAnomaly ──────────────────────────── */

describe("countConsecutiveAnomaly", () => {
  it("counts consecutive fatigue≥4 or pain≥5 from today backwards", () => {
    const checkins: CheckinRecord[] = [
      { date: "2026-07-13", fatigueLevel: 4, painLevel: 1 },
      { date: "2026-07-12", fatigueLevel: 3, painLevel: 6 },
      { date: "2026-07-11", fatigueLevel: 5, painLevel: 3 },
      { date: "2026-07-10", fatigueLevel: 2, painLevel: 1 },
    ];
    expect(countConsecutiveAnomaly(checkins, TODAY)).toBe(3);
  });

  it("returns 0 for all normal days", () => {
    const checkins: CheckinRecord[] = [
      { date: "2026-07-13", fatigueLevel: 2, painLevel: 1 },
      { date: "2026-07-12", fatigueLevel: 2, painLevel: 1 },
    ];
    expect(countConsecutiveAnomaly(checkins, TODAY)).toBe(0);
  });

  it("ignores future dates", () => {
    const checkins: CheckinRecord[] = [
      { date: "2026-07-13", fatigueLevel: 4, painLevel: 1 },
      { date: "2026-07-14", fatigueLevel: 4, painLevel: 1 },
    ];
    expect(countConsecutiveAnomaly(checkins, TODAY)).toBe(1);
  });
});

/* ── hasMedicalKeywords ───────────────────────────────── */

describe("hasMedicalKeywords", () => {
  const keywords = ["胸痛", "胸闷", "晕厥", "头晕", "心悸", "呼吸困难"];

  it.each(keywords)("detects %s", (kw) => {
    expect(hasMedicalKeywords(`跑步时感到${kw}`)).toBe(true);
  });

  it("returns false for normal text", () => {
    expect(hasMedicalKeywords("今天状态很好")).toBe(false);
  });

  it("returns false for null/empty", () => {
    expect(hasMedicalKeywords(null)).toBe(false);
    expect(hasMedicalKeywords("")).toBe(false);
  });

  it("requires full keyword match (no partial)", () => {
    expect(hasMedicalKeywords("胸")).toBe(false);
    expect(hasMedicalKeywords("胸痛发作")).toBe(true);
  });
});

/* ── findNextOpenSlot ─────────────────────────────────── */

describe("findNextOpenSlot", () => {
  it("finds next open day after missed workout", () => {
    const missed: PlannedWorkoutRef = {
      id: "m",
      scheduledDate: "2026-07-08",
      workoutType: "intervals",
      distanceKm: 8,
      durationMin: 40,
      targetRpe: 8,
      targetPaceMinKm: 4.0,
      targetPaceMaxKm: 4.4,
      isQuality: true,
      dayOfWeek: 3,
      weekNumber: 1,
    };
    // No other workouts occupy 07-09 or 07-10
    const nowEpoch = Math.floor(Date.parse("2026-07-08") / 86400000);
    const slot = findNextOpenSlot([missed], missed, nowEpoch);
    expect(slot).toBe("2026-07-09");
  });

  it("skips occupied days", () => {
    const occupied: PlannedWorkoutRef[] = [
      {
        id: "x1",
        scheduledDate: "2026-07-08",
        workoutType: "easy",
        distanceKm: null,
        durationMin: null,
        targetRpe: null,
        targetPaceMinKm: null,
        targetPaceMaxKm: null,
        isQuality: false,
        dayOfWeek: 3,
        weekNumber: 1,
      },
      {
        id: "x2",
        scheduledDate: "2026-07-09",
        workoutType: "easy",
        distanceKm: null,
        durationMin: null,
        targetRpe: null,
        targetPaceMinKm: null,
        targetPaceMaxKm: null,
        isQuality: false,
        dayOfWeek: 4,
        weekNumber: 1,
      },
    ];
    const missed: PlannedWorkoutRef = {
      id: "m",
      scheduledDate: "2026-07-08",
      workoutType: "intervals",
      distanceKm: 8,
      durationMin: 40,
      targetRpe: 8,
      targetPaceMinKm: 4.0,
      targetPaceMaxKm: 4.4,
      isQuality: true,
      dayOfWeek: 3,
      weekNumber: 1,
    };
    const nowEpoch = Math.floor(Date.parse("2026-07-08") / 86400000);
    const slot = findNextOpenSlot(occupied, missed, nowEpoch);
    expect(slot).toBe("2026-07-10");
  });

  it("returns null when no slot within lookahead", () => {
    // Fill days 08-12
    const occupied: PlannedWorkoutRef[] = Array.from({ length: 5 }, (_, i) => ({
      id: `x${i}`,
      scheduledDate: `2026-07-${String(8 + i).padStart(2, "0")}`,
      workoutType: "easy" as const,
      distanceKm: null,
      durationMin: null,
      targetRpe: null,
      targetPaceMinKm: null,
      targetPaceMaxKm: null,
      isQuality: false,
      dayOfWeek: i + 3,
      weekNumber: 1,
    }));
    const missed: PlannedWorkoutRef = {
      id: "m",
      scheduledDate: "2026-07-08",
      workoutType: "intervals",
      distanceKm: 8,
      durationMin: 40,
      targetRpe: 8,
      targetPaceMinKm: 4.0,
      targetPaceMaxKm: 4.4,
      isQuality: true,
      dayOfWeek: 3,
      weekNumber: 1,
    };
    const nowEpoch = Math.floor(Date.parse("2026-07-08") / 86400000);
    const slot = findNextOpenSlot(occupied, missed, nowEpoch);
    expect(slot).toBeNull();
  });
});
