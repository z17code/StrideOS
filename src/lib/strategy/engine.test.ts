import { describe, expect, it } from "vitest";
import {
  buildRaceStrategy,
  computeVdot,
  equivalentRaceTimes,
  negativeSplitStrategy,
  vdotToTrainingPaces,
  type StrategyDistanceType,
  type TrainingPaceKey,
} from "./engine";

/**
 * Continuous Daniels-Gilbert formula reference points for this engine.
 * (Published VDOT tables use discrete lookup + different rounding; these
 * bounds match the closed-form implementation in engine.ts.)
 */
const REFERENCE = {
  // 3:00 marathon → ~53.5
  marathon3h: {
    distanceKm: 42.195,
    timeSec: 3 * 3600,
    vdotMin: 52,
    vdotMax: 55,
  },
  // 40:00 10k → ~51.9
  tenK40: { distanceKm: 10, timeSec: 40 * 60, vdotMin: 50, vdotMax: 53 },
  // 1:30 half → ~51.0
  half90: {
    distanceKm: 21.0975,
    timeSec: 90 * 60,
    vdotMin: 49,
    vdotMax: 53,
  },
};

describe("computeVdot", () => {
  it("rejects non-positive inputs", () => {
    expect(() => computeVdot(0, 1800)).toThrow(/distanceKm/);
    expect(() => computeVdot(-5, 1800)).toThrow(/distanceKm/);
    expect(() => computeVdot(10, 0)).toThrow(/timeSec/);
    expect(() => computeVdot(10, -100)).toThrow(/timeSec/);
    expect(() => computeVdot(Number.NaN, 1800)).toThrow(/distanceKm/);
    expect(() => computeVdot(10, Number.POSITIVE_INFINITY)).toThrow(/timeSec/);
  });

  it("returns values in a practical VDOT range for common race performances", () => {
    for (const ref of Object.values(REFERENCE)) {
      const vdot = computeVdot(ref.distanceKm, ref.timeSec);
      expect(vdot).toBeGreaterThanOrEqual(ref.vdotMin);
      expect(vdot).toBeLessThanOrEqual(ref.vdotMax);
    }
  });

  it("is monotonic: faster time → higher VDOT at fixed distance", () => {
    const distances = [5, 10, 21.0975, 42.195];
    for (const d of distances) {
      // paces from 6:00/km down to 3:00/km
      const times = [6, 5.5, 5, 4.5, 4, 3.5, 3].map((minPerKm) =>
        Math.round(d * minPerKm * 60),
      );
      const vdots = times.map((t) => computeVdot(d, t));
      for (let i = 1; i < vdots.length; i++) {
        expect(vdots[i]!).toBeGreaterThan(vdots[i - 1]!);
      }
    }
  });

  it("is monotonic: longer distance at same pace → slightly different VDOT (fraction effect)", () => {
    // Same absolute pace (4:30/km) over different distances yields different VDOT
    // because sustainable fraction of VO2max declines with duration.
    const paceSecPerKm = 4.5 * 60;
    const short = computeVdot(5, 5 * paceSecPerKm);
    const long = computeVdot(42.195, 42.195 * paceSecPerKm);
    // Holding pace over a longer race is harder → higher VDOT for the long race.
    expect(long).toBeGreaterThan(short);
  });

  it("rounds to one decimal place", () => {
    const vdot = computeVdot(10, 2400);
    expect(Number.isInteger(vdot * 10)).toBe(true);
  });
});

describe("vdotToTrainingPaces", () => {
  const PACE_ORDER: TrainingPaceKey[] = [
    "easy",
    "marathon",
    "threshold",
    "interval",
    "repetition",
  ];

  it("rejects non-positive VDOT", () => {
    expect(() => vdotToTrainingPaces(0)).toThrow(/vdot/);
    expect(() => vdotToTrainingPaces(-10)).toThrow(/vdot/);
  });

  it("returns all five training pace keys with min < max", () => {
    const paces = vdotToTrainingPaces(50);
    for (const key of PACE_ORDER) {
      expect(paces[key]).toBeDefined();
      expect(paces[key].minPerKm).toBeLessThan(paces[key].maxPerKm);
      expect(paces[key].minPerKm).toBeGreaterThan(0);
      expect(paces[key].maxPerKm).toBeGreaterThan(0);
    }
  });

  it("is ordered from slowest (easy) to fastest (repetition) by mid-range", () => {
    const paces = vdotToTrainingPaces(55);
    const mids = PACE_ORDER.map(
      (k) => (paces[k].minPerKm + paces[k].maxPerKm) / 2,
    );
    for (let i = 1; i < mids.length; i++) {
      // Higher intensity → faster (lower min/km) mid-range
      expect(mids[i]!).toBeLessThan(mids[i - 1]!);
    }
  });

  it("higher VDOT → faster (lower) paces at every zone", () => {
    const low = vdotToTrainingPaces(40);
    const high = vdotToTrainingPaces(60);
    for (const key of PACE_ORDER) {
      expect(high[key].minPerKm).toBeLessThan(low[key].minPerKm);
      expect(high[key].maxPerKm).toBeLessThan(low[key].maxPerKm);
    }
  });
});

describe("equivalentRaceTimes", () => {
  it("rejects non-positive VDOT", () => {
    expect(() => equivalentRaceTimes(0)).toThrow(/vdot/);
  });

  it("returns positive times for all four distances, ordered by distance", () => {
    const eq = equivalentRaceTimes(50);
    expect(eq["5k"]).toBeGreaterThan(0);
    expect(eq["10k"]).toBeGreaterThan(eq["5k"]);
    expect(eq.half).toBeGreaterThan(eq["10k"]);
    expect(eq.full).toBeGreaterThan(eq.half);
  });

  it("round-trips: computeVdot(distance, equivalentTime) ≈ original VDOT", () => {
    for (const vdot of [35, 45, 55, 65, 75]) {
      const eq = equivalentRaceTimes(vdot);
      const distances: Array<{ key: keyof typeof eq; km: number }> = [
        { key: "5k", km: 5 },
        { key: "10k", km: 10 },
        { key: "half", km: 21.0975 },
        { key: "full", km: 42.195 },
      ];
      for (const d of distances) {
        const recovered = computeVdot(d.km, eq[d.key]);
        // Binary search + 0.1 rounding: allow 0.3 tolerance
        expect(Math.abs(recovered - vdot)).toBeLessThanOrEqual(0.3);
      }
    }
  });

  it("higher VDOT → faster (shorter) equivalent times", () => {
    const slow = equivalentRaceTimes(40);
    const fast = equivalentRaceTimes(60);
    for (const key of ["5k", "10k", "half", "full"] as const) {
      expect(fast[key]).toBeLessThan(slow[key]);
    }
  });
});

describe("negativeSplitStrategy", () => {
  const CASES: Array<{
    type: StrategyDistanceType;
    target: number;
    segments: number;
  }> = [
    { type: "10k", target: 40 * 60, segments: 2 },
    { type: "half", target: 90 * 60, segments: 3 },
    { type: "full", target: 3 * 3600, segments: 4 },
  ];

  it("rejects non-positive target time", () => {
    expect(() => negativeSplitStrategy("half", 0)).toThrow(/targetTimeSec/);
    expect(() => negativeSplitStrategy("half", -100)).toThrow(/targetTimeSec/);
  });

  it.each(CASES)(
    "$type: segment durations sum exactly to targetTimeSec",
    ({ type, target, segments }) => {
      const segs = negativeSplitStrategy(type, target);
      expect(segs).toHaveLength(segments);
      const sum = segs.reduce((acc, s) => acc + s.durationSec, 0);
      expect(sum).toBe(target);
    },
  );

  it.each(CASES)(
    "$type: segment distances sum to race distance",
    ({ type, target }) => {
      const segs = negativeSplitStrategy(type, target);
      const dist = segs.reduce((acc, s) => acc + s.distanceKm, 0);
      const expected =
        type === "10k" ? 10 : type === "half" ? 21.0975 : 42.195;
      expect(dist).toBeCloseTo(expected, 4);
    },
  );

  it("is a true negative split: first segment slower than last", () => {
    for (const { type, target } of CASES) {
      const segs = negativeSplitStrategy(type, target);
      const first = segs[0]!;
      const last = segs[segs.length - 1]!;
      // paceMinPerKm higher = slower
      expect(first.paceMinPerKm).toBeGreaterThan(last.paceMinPerKm);
    }
  });

  it("handles awkward target times without losing the exact sum invariant", () => {
    // Odd second totals that force remainder absorption into the last segment
    for (const target of [2347, 5555, 9999, 12345]) {
      for (const type of ["10k", "half", "full"] as StrategyDistanceType[]) {
        const segs = negativeSplitStrategy(type, target);
        const sum = segs.reduce((acc, s) => acc + s.durationSec, 0);
        expect(sum).toBe(target);
      }
    }
  });
});

describe("buildRaceStrategy", () => {
  it("assembles a complete RaceStrategy for half marathon", () => {
    const strategy = buildRaceStrategy("half", 90 * 60);
    expect(strategy.distanceType).toBe("half");
    expect(strategy.distanceKm).toBe(21.0975);
    expect(strategy.targetTimeSec).toBe(5400);
    expect(strategy.vdot).toBeGreaterThan(0);
    expect(strategy.averagePaceMinPerKm).toBeCloseTo(5400 / 21.0975 / 60, 3);
    expect(strategy.trainingPaces.easy.minPerKm).toBeGreaterThan(0);
    expect(strategy.equivalentTimes["5k"]).toBeGreaterThan(0);
    expect(strategy.segments.length).toBe(3);
    const sum = strategy.segments.reduce((a, s) => a + s.durationSec, 0);
    expect(sum).toBe(5400);
  });

  it("is deterministic", () => {
    const a = buildRaceStrategy("full", 3 * 3600);
    const b = buildRaceStrategy("full", 3 * 3600);
    expect(a).toEqual(b);
  });

  it("covers all three distance types", () => {
    for (const type of ["10k", "half", "full"] as StrategyDistanceType[]) {
      const s = buildRaceStrategy(type, 3600);
      expect(s.distanceType).toBe(type);
      expect(s.segments.length).toBeGreaterThanOrEqual(2);
    }
  });
});
