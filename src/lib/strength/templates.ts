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

export function getTemplate(id: string) {
  return STRENGTH_TEMPLATES.find((t) => t.id === id) ?? null;
}
