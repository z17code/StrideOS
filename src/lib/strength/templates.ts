export type StrengthTemplate = {
  id: string;
  name: string;
  description: string;
  durationMin: number;
};

/** Built-in defaults (safe for client components). */
export const STRENGTH_TEMPLATES = [
  {
    id: "core" as const,
    name: "核心稳定",
    description: "平板支撑、死虫、侧桥 — 提升躯干稳定性",
    durationMin: 15,
  },
  {
    id: "hips" as const,
    name: "髋部力量",
    description: "蚌式开合、侧抬腿、单腿臀桥 — 强化臀中肌",
    durationMin: 15,
  },
  {
    id: "calves" as const,
    name: "小腿与足部",
    description: "提踵、毛巾抓取、足弓激活 — 预防足底筋膜炎",
    durationMin: 10,
  },
  {
    id: "balance" as const,
    name: "平衡与本体感觉",
    description: "单腿站、平衡垫、闭眼站立 — 降低扭伤风险",
    durationMin: 10,
  },
  {
    id: "mobility" as const,
    name: "活动度拉伸",
    description: "髋屈肌、腘绳肌、胸椎旋转 — 改善跑姿",
    durationMin: 12,
  },
] as const;

export type StrengthTemplateId = (typeof STRENGTH_TEMPLATES)[number]["id"];

function parseEnvTemplates(): StrengthTemplate[] | null {
  const raw = process.env.STRENGTH_TEMPLATES_JSON?.trim();
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed) || parsed.length === 0) return null;
    const items: StrengthTemplate[] = [];
    for (const item of parsed) {
      if (!item || typeof item !== "object") return null;
      const rec = item as Record<string, unknown>;
      if (
        typeof rec.id !== "string" ||
        typeof rec.name !== "string" ||
        typeof rec.description !== "string" ||
        typeof rec.durationMin !== "number"
      ) {
        return null;
      }
      items.push({
        id: rec.id,
        name: rec.name,
        description: rec.description,
        durationMin: rec.durationMin,
      });
    }
    return items;
  } catch {
    return null;
  }
}

/** Server-side templates: env override or built-in defaults. */
export function listStrengthTemplates(): StrengthTemplate[] {
  return parseEnvTemplates() ?? STRENGTH_TEMPLATES.map((t) => ({ ...t }));
}

export function getTemplate(id: string) {
  return listStrengthTemplates().find((t) => t.id === id) ?? null;
}
