
import { describe, expect, it } from "vitest";
import { computeHrZones, estimateHrMax } from "./heart-rate";
import { buildTrainingPaceTable } from "./paces";
import { buildSplitTable } from "./splits";
import { estimateFueling } from "./fueling";
import { designIntervalSession } from "./intervals";
import { adjustPaceForGrade } from "./grade";
import { convertPacePower, paceToPower } from "./power";
import { assessShoeLife } from "./shoe-life";
import { buildLoadOverview } from "./load";
import { kmToMiles, paceMinPerKmToMinPerMile } from "./units";
import { getRoutine } from "./recovery";
import { RACE_COUNTDOWN } from "./race-checklist";
import { fillNoteTemplate, NOTE_TEMPLATES } from "./notes";
import { VDOT_GUIDE } from "./vdot-guide";

describe("heart-rate", () => {
  it("estimates HRmax from age", () => {
    expect(estimateHrMax(40)).toBe(Math.round(208 - 0.7 * 40));
  });

  it("builds karvonen zones when rest HR provided", () => {
    const r = computeHrZones({ hrMax: 190, hrRest: 50 });
    expect(r.method).toBe("karvonen");
    expect(r.zones).toHaveLength(5);
    expect(r.zones[0]!.minBpm).toBeLessThan(r.zones[4]!.maxBpm);
    expect(r.zones[4]!.maxBpm).toBe(190);
  });
});

describe("paces table", () => {
  it("returns VDOT and five pace keys", () => {
    const t = buildTrainingPaceTable(10, 40 * 60);
    expect(t.vdot).toBeGreaterThan(40);
    expect(t.paces.easy.minPerKm).toBeGreaterThan(t.paces.interval.minPerKm);
  });
});

describe("splits", () => {
  it("even splits sum to target time", () => {
    const t = buildSplitTable(10, 3000, "even");
    expect(t.rows.at(-1)!.cumulativeSec).toBe(3000);
    expect(t.rows).toHaveLength(10);
  });

  it("negative splits still sum exactly", () => {
    const t = buildSplitTable(21.0975, 90 * 60, "negative");
    expect(t.rows.at(-1)!.cumulativeSec).toBe(90 * 60);
  });
});

describe("fueling", () => {
  it("short run needs little fuel", () => {
    const r = estimateFueling({ distanceKm: 8, durationMin: 45, weather: "mild" });
    expect(r.gelCount).toBe(0);
    expect(r.waterMl).toBeGreaterThan(0);
  });

  it("long hot run suggests gels and more water", () => {
    const cool = estimateFueling({ distanceKm: 30, durationMin: 180, weather: "cool" });
    const hot = estimateFueling({ distanceKm: 30, durationMin: 180, weather: "hot" });
    expect(hot.waterMl).toBeGreaterThan(cool.waterMl);
    expect(hot.gelCount).toBeGreaterThan(0);
  });
});

describe("intervals", () => {
  it("designs 6x1k session", () => {
    const r = designIntervalSession({
      warmupMin: 15,
      cooldownMin: 10,
      blocks: [
        {
          reps: 6,
          workMeters: 1000,
          workSec: null,
          recoverySec: 120,
          workPaceMinPerKm: 4,
        },
      ],
    });
    expect(r.totalWorkKm).toBe(6);
    expect(r.totalWorkSec).toBe(6 * 240);
    expect(r.totalDurationSec).toBeGreaterThan(r.totalWorkSec);
  });
});

describe("grade", () => {
  it("uphill slows pace", () => {
    const r = adjustPaceForGrade({ flatPaceMinPerKm: 5, gradePercent: 5 });
    expect(r.adjustedPaceMinPerKm).toBeGreaterThan(5);
    expect(r.deltaSecPerKm).toBe(90);
  });
});

describe("power", () => {
  it("faster pace → higher power", () => {
    const slow = paceToPower(6, 65);
    const fast = paceToPower(4, 65);
    expect(fast).toBeGreaterThan(slow);
  });

  it("round-trips roughly", () => {
    const r = convertPacePower({ paceMinPerKm: 5, weightKg: 65 });
    expect(r.powerW).toBeGreaterThan(100);
    expect(r.wPerKg).toBeGreaterThan(1);
  });
});

describe("shoe-life", () => {
  it("flags retire over threshold", () => {
    const r = assessShoeLife({ totalKm: 720, lifeKm: 700 });
    expect(r.status).toBe("retire");
    expect(r.remainingKm).toBe(0);
  });

  it("estimates remaining weeks", () => {
    const r = assessShoeLife({ totalKm: 400, lifeKm: 700, weeklyKm: 50 });
    expect(r.status).toBe("ok");
    expect(r.remainingWeeks).toBe(6);
  });
});

describe("load overview", () => {
  it("buckets plan vs activities by week", () => {
    const overview = buildLoadOverview({
      today: "2026-07-16", // Thursday
      weekCount: 2,
      planned: [
        { scheduledDate: "2026-07-14", distanceKm: 10, isQuality: false },
        { scheduledDate: "2026-07-07", distanceKm: 12, isQuality: true },
      ],
      activities: [
        { date: "2026-07-14", distanceKm: 9 },
        { date: "2026-07-08", distanceKm: 11 },
      ],
    });
    expect(overview.weeks).toHaveLength(2);
    expect(overview.thisWeek!.plannedKm).toBe(10);
    expect(overview.thisWeek!.actualKm).toBe(9);
    expect(overview.thisWeek!.completionRatio).toBe(0.9);
  });
});

describe("units", () => {
  it("converts km and pace", () => {
    expect(kmToMiles(10)).toBeCloseTo(6.2137, 3);
    expect(paceMinPerKmToMinPerMile(5)).toBeCloseTo(8.0467, 2);
  });
});

describe("static content", () => {
  it("has recovery / countdown / notes / guide", () => {
    expect(getRoutine("warmup").items.length).toBeGreaterThan(2);
    expect(RACE_COUNTDOWN.length).toBeGreaterThan(4);
    expect(NOTE_TEMPLATES.length).toBeGreaterThan(3);
    expect(fillNoteTemplate("long")).toContain("补给");
    expect(VDOT_GUIDE.paragraphs.length).toBeGreaterThan(2);
  });
});
