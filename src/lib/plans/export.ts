import { WORKOUT_LABEL, PHASE_LABEL, type PlanPhase } from "@/lib/plans/types";

export type ExportWorkout = {
  scheduledDate: string;
  workoutType: string;
  phase: string;
  distanceKm: number | null;
  durationMin: number | null;
  targetRpe: number | null;
  targetPaceMinKm: number | null;
  targetPaceMaxKm: number | null;
  isQuality: boolean;
  notes: string | null;
};

export type ExportPlan = {
  versionNumber: number;
  label: string | null;
  startsOn: string;
  endsOn: string;
  totalWeeks: number;
  workouts: ExportWorkout[];
};

function workoutTitle(type: string) {
  return WORKOUT_LABEL[type as keyof typeof WORKOUT_LABEL] ?? type;
}

function phaseTitle(phase: string) {
  return PHASE_LABEL[phase as PlanPhase] ?? phase;
}

function escapeIcsText(text: string) {
  return text
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n");
}

function foldIcsLine(line: string) {
  if (line.length <= 75) return line;
  const parts: string[] = [];
  let rest = line;
  parts.push(rest.slice(0, 75));
  rest = rest.slice(75);
  while (rest.length > 0) {
    parts.push(` ${rest.slice(0, 74)}`);
    rest = rest.slice(74);
  }
  return parts.join("\r\n");
}

function dateToIcsDay(date: string) {
  return date.replace(/-/g, "");
}

function stampUtcNow() {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return (
    `${d.getUTCFullYear()}${p(d.getUTCMonth() + 1)}${p(d.getUTCDate())}` +
    `T${p(d.getUTCHours())}${p(d.getUTCMinutes())}${p(d.getUTCSeconds())}Z`
  );
}

function addDaysYmd(date: string, days: number) {
  const [y, m, d] = date.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + days);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${dt.getUTCFullYear()}-${p(dt.getUTCMonth() + 1)}-${p(dt.getUTCDate())}`;
}

function workoutDescription(w: ExportWorkout) {
  const bits: string[] = [];
  bits.push(`阶段：${phaseTitle(w.phase)}`);
  if (w.distanceKm != null) bits.push(`距离：${w.distanceKm} km`);
  if (w.durationMin != null) bits.push(`时长：${w.durationMin} 分钟`);
  if (w.targetRpe != null) bits.push(`目标 RPE：${w.targetRpe}`);
  if (w.targetPaceMinKm != null || w.targetPaceMaxKm != null) {
    bits.push(
      `配速：${w.targetPaceMinKm ?? "—"}–${w.targetPaceMaxKm ?? "—"} min/km`,
    );
  }
  if (w.isQuality) bits.push("质量课");
  if (w.notes) bits.push(w.notes);
  return bits.join("\n");
}

export function buildPlanIcs(plan: ExportPlan) {
  const stamp = stampUtcNow();
  const title =
    plan.label?.trim() ||
    `StrideOS 训练计划 v${plan.versionNumber}`;
  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//StrideOS//Plan Export//ZH",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${escapeIcsText(title)}`,
  ];

  for (const w of plan.workouts) {
    if (w.workoutType === "rest") continue;
    const summary = workoutTitle(w.workoutType);
    const desc = workoutDescription(w);
    const uid = `strideos-plan-v${plan.versionNumber}-${w.scheduledDate}-${w.workoutType}@strideos`;
    lines.push("BEGIN:VEVENT");
    lines.push(`UID:${escapeIcsText(uid)}`);
    lines.push(`DTSTAMP:${stamp}`);
    lines.push(`DTSTART;VALUE=DATE:${dateToIcsDay(w.scheduledDate)}`);
    lines.push(
      `DTEND;VALUE=DATE:${dateToIcsDay(addDaysYmd(w.scheduledDate, 1))}`,
    );
    lines.push(`SUMMARY:${escapeIcsText(summary)}`);
    if (desc) lines.push(`DESCRIPTION:${escapeIcsText(desc)}`);
    lines.push("END:VEVENT");
  }

  lines.push("END:VCALENDAR");
  return `${lines.map(foldIcsLine).join("\r\n")}\r\n`;
}

export function buildPlanMarkdown(plan: ExportPlan) {
  const title =
    plan.label?.trim() || `StrideOS 训练计划 v${plan.versionNumber}`;
  const rows = plan.workouts
    .slice()
    .sort((a, b) => a.scheduledDate.localeCompare(b.scheduledDate))
    .map((w) => {
      const dist = w.distanceKm != null ? `${w.distanceKm} km` : "—";
      const dur = w.durationMin != null ? `${w.durationMin} min` : "—";
      const note = (w.notes ?? "").replace(/\|/g, "\\|").replace(/\n/g, " ");
      return `| ${w.scheduledDate} | ${phaseTitle(w.phase)} | ${workoutTitle(w.workoutType)} | ${dist} | ${dur} | ${note} |`;
    });

  return [
    `# ${title}`,
    "",
    `- 版本：v${plan.versionNumber}`,
    `- 周期：${plan.startsOn} ~ ${plan.endsOn}（${plan.totalWeeks} 周）`,
    `- 导出时间：${new Date().toISOString()}`,
    "",
    "| 日期 | 阶段 | 课型 | 距离 | 时长 | 备注 |",
    "| --- | --- | --- | --- | --- | --- |",
    ...rows,
    "",
  ].join("\n");
}

export function buildPlanPrintHtml(plan: ExportPlan) {
  const title =
    plan.label?.trim() || `StrideOS 训练计划 v${plan.versionNumber}`;
  const rows = plan.workouts
    .slice()
    .sort((a, b) => a.scheduledDate.localeCompare(b.scheduledDate))
    .map((w) => {
      const dist = w.distanceKm != null ? `${w.distanceKm} km` : "—";
      const dur = w.durationMin != null ? `${w.durationMin} min` : "—";
      const note = (w.notes ?? "").replace(/</g, "&lt;");
      return `<tr><td>${w.scheduledDate}</td><td>${phaseTitle(w.phase)}</td><td>${workoutTitle(w.workoutType)}</td><td>${dist}</td><td>${dur}</td><td>${note}</td></tr>`;
    })
    .join("");

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8" />
  <title>${title}</title>
  <style>
    body { font-family: "PingFang SC", "Microsoft YaHei", sans-serif; margin: 24px; color: #111; }
    h1 { font-size: 20px; margin: 0 0 8px; }
    .meta { color: #555; font-size: 13px; margin-bottom: 16px; }
    table { border-collapse: collapse; width: 100%; font-size: 12px; }
    th, td { border: 1px solid #ddd; padding: 6px 8px; text-align: left; }
    th { background: #f5f5f5; }
    @media print { body { margin: 12mm; } }
  </style>
</head>
<body>
  <h1>${title}</h1>
  <div class="meta">版本 v${plan.versionNumber} · ${plan.startsOn} ~ ${plan.endsOn} · ${plan.totalWeeks} 周</div>
  <table>
    <thead><tr><th>日期</th><th>阶段</th><th>课型</th><th>距离</th><th>时长</th><th>备注</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>
  <script>window.onload = function () { window.print(); };</script>
</body>
</html>`;
}
