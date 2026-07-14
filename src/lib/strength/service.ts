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
import { getTemplate } from "./templates";

export { STRENGTH_TEMPLATES, getTemplate, listStrengthTemplates, type StrengthTemplateId, type StrengthTemplate } from "./templates";

export function mapStrengthSession(s: StrengthSession) {
  const template = s.templateId ? getTemplate(s.templateId) : null;
  return {
    id: s.id,
    date: s.date,
    templateId: s.templateId,
    templateName: template?.name ?? (s.templateId ?? "自定义"),
    completed: s.completed,
    notes: s.notes,
    exercises: s.exercises,
    durationMin: s.durationMin,
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
      templateId: data.templateId ?? null,
      completed: data.completed ?? true,
      notes: data.notes ?? null,
      exercises: data.exercises ?? null,
      durationMin: data.durationMin ?? null,
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
      ...(data.exercises !== undefined ? { exercises: data.exercises } : {}),
      ...(data.durationMin !== undefined ? { durationMin: data.durationMin } : {}),
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
