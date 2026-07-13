import { describe, expect, it } from "vitest";
import {
  allocatePhases,
  computeTotalWeeks,
  enforceInvariants,
  generatePlan,
  isInsufficientBase,
} from "./engine";
import type { PlanEngineInput } from "./types";
import { PlanEngineError } from "./types";
import { addDays, startOfMondayWeek } from "@/lib/datetime";

function baseInput(over: Partial<PlanEngineInput> = {}): PlanEngineInput {
  return {
    generationDate: "2026-07-13",
    distanceType: "half",
    raceDate: "2026-11-15",
    targetTimeSec: 7200,
    weeklyDistanceKm: 35,
    weeklyRuns: 4,
    longestRunKm: 14,
    trainableDays: [1, 2, 4, 6], // Mon Tue Thu Sat
    longRunDay: 6,
    painLevel: 0,
    restrictions: null,
    recentRace: {
      distanceKm: 10,
      timeSec: 3000,
      raceDate: "2026-05-01",
    },
    ...over,
  };
}

describe("allocatePhases", () => {
  it("uses exact taper lengths", () => {
    expect(allocatePhases(12, "10k").filter((p) => p === "taper")).toHaveLength(1);
    expect(allocatePhases(12, "half").filter((p) => p === "taper")).toHaveLength(2);
    expect(allocatePhases(16, "full").filter((p) => p === "taper")).toHaveLength(3);
  });

  it("covers all weeks", () => {
    for (const n of [8, 12, 16, 20, 24]) {
      expect(allocatePhases(n, "half")).toHaveLength(n);
    }
  });
});

describe("computeTotalWeeks", () => {
  it("counts Monday weeks inclusively", () => {
    // 2026-07-13 is Monday; 2026-09-06 is Sunday of week 8
    expect(computeTotalWeeks("2026-07-13", "2026-09-06")).toBe(8);
    // 2026-09-07 is Monday → week 9
    expect(computeTotalWeeks("2026-07-13", "2026-09-07")).toBe(9);
  });
});

describe("isInsufficientBase", () => {
  it("detects half/full thresholds at boundaries", () => {
    expect(
      isInsufficientBase(baseInput({ weeklyDistanceKm: 19.9, longestRunKm: 10 })),
    ).toBe(true);
    expect(
      isInsufficientBase(baseInput({ weeklyDistanceKm: 20, longestRunKm: 8 })),
    ).toBe(false);
    expect(
      isInsufficientBase(
        baseInput({
          distanceType: "full",
          weeklyDistanceKm: 29,
          longestRunKm: 20,
        }),
      ),
    ).toBe(true);
    expect(
      isInsufficientBase(
        baseInput({
          distanceType: "full",
          weeklyDistanceKm: 40,
          longestRunKm: 14,
        }),
      ),
    ).toBe(false);
  });
});

describe("generatePlan", () => {
  it("generates a deterministic half plan", () => {
    const a = generatePlan(baseInput());
    const b = generatePlan(baseInput());
    expect(a.workouts).toEqual(b.workouts);
    expect(a.totalWeeks).toBeGreaterThanOrEqual(8);
    expect(a.totalWeeks).toBeLessThanOrEqual(24);
    expect(a.workouts.some((w) => w.workoutType === "race")).toBe(true);
  });

  it("rejects windows outside 8–24 weeks", () => {
    expect(() =>
      generatePlan(baseInput({ raceDate: "2026-07-20" })),
    ).toThrow(PlanEngineError);
  });

  it("forces completion mode for low base", () => {
    const plan = generatePlan(
      baseInput({ weeklyDistanceKm: 12, longestRunKm: 5 }),
    );
    expect(plan.completionMode).toBe(true);
    expect(plan.warnings.some((w) => w.code === "INSUFFICIENT_BASE")).toBe(true);
    // No quality in completion mode
    expect(plan.workouts.every((w) => !w.isQuality)).toBe(true);
  });

  it("omits pace without benchmark", () => {
    const plan = generatePlan(baseInput({ recentRace: null }));
    expect(plan.warnings.some((w) => w.code === "NO_BENCHMARK_PACE")).toBe(true);
    expect(
      plan.workouts
        .filter((w) => w.workoutType !== "race")
        .every((w) => w.targetPaceMinKm == null),
    ).toBe(true);
  });

  it("respects race-week rest rules", () => {
    const plan = generatePlan(baseInput());
    const race = plan.workouts.find((w) => w.workoutType === "race")!;
    const dayBefore = addDays(race.scheduledDate, -1);
    expect(
      plan.workouts.some(
        (w) => w.scheduledDate === dayBefore && w.workoutType !== "race",
      ),
    ).toBe(false);
    expect(
      plan.workouts.some(
        (w) =>
          w.workoutType !== "race" &&
          w.scheduledDate > race.scheduledDate,
      ),
    ).toBe(false);
  });

  it("keeps long runs within caps and 40%", () => {
    const plan = generatePlan(
      baseInput({ distanceType: "full", weeklyDistanceKm: 45, longestRunKm: 20 }),
    );
    for (const week of plan.weeks) {
      const longs = plan.workouts.filter(
        (w) => w.weekNumber === week.weekNumber && w.workoutType === "long",
      );
      for (const l of longs) {
        expect(l.distanceKm ?? 0).toBeLessThanOrEqual(32.05);
        if (week.plannedDistanceKm > 0 && l.distanceKm != null) {
          expect(l.distanceKm).toBeLessThanOrEqual(week.plannedDistanceKm * 0.4 + 0.15);
        }
        if (l.durationMin != null) {
          expect(l.durationMin).toBeLessThanOrEqual(180);
        }
      }
    }
  });

  it("starts plan on Monday week", () => {
    const plan = generatePlan(baseInput({ generationDate: "2026-07-15" }));
    expect(plan.startsOn).toBe(startOfMondayWeek("2026-07-15"));
  });

  it("passes enforceInvariants on generated plans", () => {
    const input = baseInput();
    const plan = generatePlan(input);
    expect(() =>
      enforceInvariants(plan.workouts, plan.weeks, input, plan.totalWeeks),
    ).not.toThrow();
  });
});
