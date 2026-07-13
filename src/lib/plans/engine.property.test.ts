import { describe, expect, it } from "vitest";
import * as fc from "fast-check";
import { generatePlan } from "./engine";
import type { DistanceType, PlanEngineInput } from "./types";
import { addDays, dayOfWeek, daysBetween, startOfMondayWeek } from "@/lib/datetime";

const distanceArb = fc.constantFrom<DistanceType>("10k", "half", "full");

const trainableArb = fc
  .uniqueArray(fc.integer({ min: 0, max: 6 }), { minLength: 3, maxLength: 6 })
  .map((days) => [...days].sort((a, b) => a - b));

function inputArb() {
  return fc
    .record({
      generationDate: fc.constant("2026-07-13"),
      distanceType: distanceArb,
      weekOffset: fc.integer({ min: 8, max: 22 }),
      targetTimeSec: fc.option(fc.integer({ min: 1800, max: 20_000 }), {
        nil: null,
      }),
      weeklyDistanceKm: fc.double({ min: 10, max: 60, noNaN: true }),
      weeklyRuns: fc.integer({ min: 3, max: 6 }),
      longestRunKm: fc.double({ min: 5, max: 30, noNaN: true }),
      trainableDays: trainableArb,
      painLevel: fc.integer({ min: 0, max: 4 }),
      withRace: fc.boolean(),
    })
    .chain((r) => {
      const raceDate = addDays(startOfMondayWeek(r.generationDate), r.weekOffset * 7 + 6);
      return fc.constant({
        generationDate: r.generationDate,
        distanceType: r.distanceType,
        raceDate,
        targetTimeSec: r.targetTimeSec,
        weeklyDistanceKm: Math.round(r.weeklyDistanceKm * 10) / 10,
        weeklyRuns: r.weeklyRuns,
        longestRunKm: Math.round(r.longestRunKm * 10) / 10,
        trainableDays: r.trainableDays,
        longRunDay: r.trainableDays[r.trainableDays.length - 1]!,
        painLevel: r.painLevel,
        restrictions: null,
        recentRace: r.withRace
          ? {
              distanceKm: 10,
              timeSec: 2800,
              raceDate: "2026-04-01",
            }
          : null,
      } satisfies PlanEngineInput);
    });
}

describe("plan engine properties", () => {
  it("holds core invariants for random valid inputs", () => {
    fc.assert(
      fc.property(inputArb(), (input) => {
        const plan = generatePlan(input);
        const a = generatePlan(input);
        expect(a.workouts).toEqual(plan.workouts);

        expect(plan.totalWeeks).toBeGreaterThanOrEqual(8);
        expect(plan.totalWeeks).toBeLessThanOrEqual(24);

        // unique dates
        const dates = plan.workouts.map((w) => w.scheduledDate);
        expect(new Set(dates).size).toBe(dates.length);

        // weekday match + trainable (except race)
        for (const w of plan.workouts) {
          expect(w.dayOfWeek).toBe(dayOfWeek(w.scheduledDate));
          if (w.workoutType !== "race") {
            expect(input.trainableDays).toContain(w.dayOfWeek);
          }
          if (w.distanceKm != null) {
            expect(w.distanceKm).toBeGreaterThanOrEqual(0);
          }
        }

        // one race
        const races = plan.workouts.filter((w) => w.workoutType === "race");
        expect(races).toHaveLength(1);
        expect(races[0]!.scheduledDate).toBe(input.raceDate);

        // quality spacing
        const quality = plan.workouts
          .filter((w) => w.isQuality)
          .sort((x, y) => x.scheduledDate.localeCompare(y.scheduledDate));
        for (let i = 1; i < quality.length; i++) {
          expect(
            daysBetween(quality[i - 1]!.scheduledDate, quality[i]!.scheduledDate),
          ).toBeGreaterThanOrEqual(2);
        }

        // max 2 quality / week
        for (let week = 1; week <= plan.totalWeeks; week++) {
          const q = plan.workouts.filter(
            (w) => w.weekNumber === week && w.isQuality,
          ).length;
          expect(q).toBeLessThanOrEqual(2);
        }

        // growth ≤ 10%
        for (let i = 1; i < plan.weeks.length; i++) {
          const prev = plan.weeks[i - 1]!.plannedDistanceKm;
          const cur = plan.weeks[i]!.plannedDistanceKm;
          if (prev > 0) {
            expect(cur).toBeLessThanOrEqual(prev * 1.1 + 0.2);
          }
        }

        // long run caps
        const cap =
          input.distanceType === "10k"
            ? 18
            : input.distanceType === "half"
              ? 22
              : 32;
        for (const w of plan.workouts.filter((x) => x.workoutType === "long")) {
          expect(w.distanceKm ?? 0).toBeLessThanOrEqual(cap + 0.05);
        }

        // pace only with benchmark
        if (!input.recentRace) {
          expect(
            plan.workouts
              .filter((w) => w.workoutType !== "race")
              .every((w) => w.targetPaceMinKm == null),
          ).toBe(true);
        }
      }),
      { numRuns: 300 },
    );
  });
});
