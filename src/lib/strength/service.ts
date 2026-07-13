import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import {
  strengthSessions,
  type StrengthSession,
} from "@/db/schema";
import type {
  CreateStrengthInput,
  UpdateStrengthInput,
} from "@/lib/validators/strength";

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

export function mapStrengthSession(s: StrengthSession) {
  const template = getTemplate(s.templateId);
  return {
    id: s.id,
    date: s.date,
    templateId: s.templateId,
    templateName: template?.name ?? s.templateId,
    completed: s.completed,
    notes: s.notes,
    createdAt: s.createdAt,
  };
}

export async function getStrengthSession(userId: string, id: string) {
  return db.query.strengthSessions.findFirst({
    where: and(
      eq(strengthSessions.id, id),
      eq(strengthSessions.userId, userId),
    ),
  });
}

export async function listStrengthSessions(
  userId: string,
  limit = 50,
  offset = 0,
) {
  return db
    .select()
    .from(strengthSessions)
    .where(eq(strengthSessions.userId, userId))
    .orderBy(desc(strengthSessions.date), desc(strengthSessions.createdAt))
    .limit(limit)
    .offset(offset);
}

export async function createStrengthSession(
  userId: string,
  data: CreateStrengthInput,
): Promise<StrengthSession> {
  const [created] = await db
    .insert(strengthSessions)
    .values({
      userId,
      date: data.date,
      templateId: data.templateId,
      completed: data.completed ?? true,
      notes: data.notes ?? null,
    })
    .returning();
  return created;
}

export async function updateStrengthSession(
  userId: string,
  id: string,
  data: UpdateStrengthInput,
) {
  const existing = await getStrengthSession(userId, id);
  if (!existing) return null;
  const [updated] = await db
    .update(strengthSessions)
    .set({
      ...(data.date !== undefined ? { date: data.date } : {}),
      ...(data.templateId !== undefined ? { templateId: data.templateId } : {}),
      ...(data.completed !== undefined ? { completed: data.completed } : {}),
      ...(data.notes !== undefined ? { notes: data.notes } : {}),
    })
    .where(
      and(eq(strengthSessions.id, id), eq(strengthSessions.userId, userId)),
    )
    .returning();
  return updated;
}

export async function deleteStrengthSession(userId: string, id: string) {
  const existing = await getStrengthSession(userId, id);
  if (!existing) return null;
  await db
    .delete(strengthSessions)
    .where(
      and(eq(strengthSessions.id, id), eq(strengthSessions.userId, userId)),
    );
  return existing;
}
