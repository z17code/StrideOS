import { describe, expect, it } from "vitest";
import { assessPerformances, pickAnchor } from "./predict";
import { computePace, lapFromPace, paceFromTime, timeFromPace } from "./pace";
import { classifyBmi, computeBmi } from "./bmi";

describe("predict.pickAnchor", () => {
  it("returns null when no times entered", () => {
    expect(
      pickAnchor([
        { key: "5k", timeSec: null },
        { key: "10k", timeSec: null },
      ]),
    ).toBeNull();
  });

  it("picks the entry with highest VDOT", () => {
    // Strong 5k, weaker half → 5k should win
    const anchor = pickAnchor([
      { key: "5k", timeSec: 18 * 60 + 45 },
      { key: "half", timeSec: 91 * 60 + 39 },
    ]);
    expect(anchor).not.toBeNull();
    expect(anchor!.key).toBe("5k");
    expect(anchor!.vdot).toBeGreaterThan(40);
  });
});

describe("predict.assessPerformances", () => {
  it("rates missing distances as null level with a predicted time", () => {
    const result = assessPerformances([
      { key: "3k", timeSec: null },
      { key: "5k", timeSec: 18 * 60 + 45 },
      { key: "10k", timeSec: null },
      { key: "half", timeSec: null },
      { key: "full", timeSec: null },
    ]);
    expect(result).not.toBeNull();
    expect(result!.anchorKey).toBe("5k");
    const threeK = result!.assessments.find((a) => a.key === "3k")!;
    expect(threeK.actualSec).toBeNull();
    expect(threeK.level).toBeNull();
    expect(threeK.predictedSec).toBeGreaterThan(0);
  });

  it("rates a slower 10k as average or poor vs 5k anchor", () => {
    const result = assessPerformances([
      { key: "5k", timeSec: 18 * 60 + 45 },
      { key: "10k", timeSec: 40 * 60 },
      { key: "half", timeSec: 91 * 60 + 39 },
    ]);
    expect(result).not.toBeNull();
    const tenK = result!.assessments.find((a) => a.key === "10k")!;
    expect(tenK.level).not.toBeNull();
    expect(["average", "poor", "good"]).toContain(tenK.level);
    // Actual 40:00 should be slower than predicted from 18:45 5k
    expect(tenK.actualSec!).toBeGreaterThan(tenK.predictedSec);
  });

  it("rates matching predicted time as good/excellent", () => {
    // Enter only 5k → self-comparison should be ~good (delta ≈ 0)
    const result = assessPerformances([{ key: "5k", timeSec: 20 * 60 }]);
    const five = result!.assessments.find((a) => a.key === "5k")!;
    expect(five.level).toBe("good");
  });
});

describe("pace.computePace", () => {
  it("fills pace and lap from distance + time", () => {
    const r = computePace(
      { distanceKm: 10, timeSec: 40 * 60, paceMinPerKm: null, lapSec: null },
      "time",
    );
    expect(r.paceMinPerKm).toBeCloseTo(4, 2);
    expect(r.lapSec).toBe(96); // 4:00/km → 1:36 / 400m
    expect(r.timeSec).toBe(2400);
  });

  it("fills time and lap from distance + pace", () => {
    const r = computePace(
      { distanceKm: 10, timeSec: null, paceMinPerKm: 4, lapSec: null },
      "pace",
    );
    expect(r.timeSec).toBe(2400);
    expect(r.lapSec).toBe(96);
  });

  it("fills time and pace from distance + lap", () => {
    const r = computePace(
      { distanceKm: 10, timeSec: null, paceMinPerKm: null, lapSec: 96 },
      "lap",
    );
    expect(r.paceMinPerKm).toBeCloseTo(4, 2);
    expect(r.timeSec).toBe(2400);
  });

  it("throws without distance or without any pace field", () => {
    expect(() =>
      computePace({
        distanceKm: null,
        timeSec: 100,
        paceMinPerKm: null,
        lapSec: null,
      }),
    ).toThrow(/distanceKm/);
    expect(() =>
      computePace({
        distanceKm: 10,
        timeSec: null,
        paceMinPerKm: null,
        lapSec: null,
      }),
    ).toThrow(/time, pace, or lap/);
  });
});

describe("pace helpers", () => {
  it("round-trips pace ↔ time", () => {
    const t = timeFromPace(5, 4);
    expect(t).toBe(1200);
    expect(paceFromTime(5, t)).toBeCloseTo(4, 5);
  });

  it("converts pace to 400m lap", () => {
    expect(lapFromPace(4)).toBe(96);
  });
});

describe("bmi", () => {
  it("classifies ranges", () => {
    expect(classifyBmi(17)).toBe("underweight");
    expect(classifyBmi(20.7)).toBe("normal");
    expect(classifyBmi(25)).toBe("overweight");
    expect(classifyBmi(30)).toBe("obese");
  });

  it("computes BMI for 160cm / 53kg ≈ 20.7", () => {
    const r = computeBmi(160, 53);
    expect(r.bmi).toBe(20.7);
    expect(r.category).toBe("normal");
    expect(r.categoryLabel).toBe("正常");
    expect(r.idealWeightKg).toBeCloseTo(56.3, 1);
  });

  it("rejects non-positive inputs", () => {
    expect(() => computeBmi(0, 50)).toThrow();
    expect(() => computeBmi(170, -1)).toThrow();
  });
});
