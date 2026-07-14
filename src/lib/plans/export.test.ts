import { describe, expect, it } from "vitest";
import {
  buildPlanIcs,
  buildPlanMarkdown,
  buildPlanPrintHtml,
  type ExportPlan,
} from "./export";

const sample: ExportPlan = {
  versionNumber: 2,
  label: "半马冲刺",
  startsOn: "2026-07-01",
  endsOn: "2026-07-07",
  totalWeeks: 1,
  workouts: [
    {
      scheduledDate: "2026-07-01",
      workoutType: "easy",
      phase: "base",
      distanceKm: 8,
      durationMin: 50,
      targetRpe: 4,
      targetPaceMinKm: 5.5,
      targetPaceMaxKm: 6.0,
      isQuality: false,
      notes: "轻松跑",
    },
    {
      scheduledDate: "2026-07-02",
      workoutType: "rest",
      phase: "base",
      distanceKm: null,
      durationMin: null,
      targetRpe: null,
      targetPaceMinKm: null,
      targetPaceMaxKm: null,
      isQuality: false,
      notes: null,
    },
  ],
};

describe("plan export", () => {
  it("builds ICS with VEVENT and skips rest days", () => {
    const ics = buildPlanIcs(sample);
    expect(ics).toContain("BEGIN:VCALENDAR");
    expect(ics).toContain("BEGIN:VEVENT");
    expect(ics).toContain("SUMMARY:轻松跑");
    expect(ics).not.toContain("SUMMARY:休息");
  });

  it("builds markdown table", () => {
    const md = buildPlanMarkdown(sample);
    expect(md).toContain("# 半马冲刺");
    expect(md).toContain("| 2026-07-01 |");
    expect(md).toContain("轻松跑");
  });

  it("builds printable html", () => {
    const html = buildPlanPrintHtml(sample);
    expect(html).toContain("<table>");
    expect(html).toContain("window.print");
  });
});
