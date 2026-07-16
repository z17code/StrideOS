/**
 * Training log note templates (static + optional localStorage).
 * Templates live in git; user checks are device-local only.
 */

export interface NoteTemplate {
  id: string;
  title: string;
  body: string;
}

export const NOTE_TEMPLATES: NoteTemplate[] = [
  {
    id: "easy",
    title: "轻松跑",
    body: "配速感受：\n呼吸：\n腿部疲劳（1–10）：\n备注：",
  },
  {
    id: "long",
    title: "长距离",
    body: "分段感受：\n补给（水/胶）：\n后半程掉速？：\n结束后恢复：",
  },
  {
    id: "quality",
    title: "质量课",
    body: "课型（阈/间歇/节奏）：\n目标配速 vs 实际：\n恢复是否充分：\n技术/步频备注：",
  },
  {
    id: "race",
    title: "比赛日",
    body: "目标：\n实际分段：\n天气/路况：\n发挥评价：\n下次改进：",
  },
  {
    id: "pain",
    title: "身体不适",
    body: "部位：\n疼痛评分（0–10）：\n出现时机：\n是否影响动作：\n处理：休息 / 就医 / 减量",
  },
  {
    id: "strength",
    title: "力量日",
    body: "主项：\n组数感受：\n核心/髋/小腿：\n与跑步衔接：",
  },
];

export function fillNoteTemplate(id: string): string | null {
  return NOTE_TEMPLATES.find((t) => t.id === id)?.body ?? null;
}
