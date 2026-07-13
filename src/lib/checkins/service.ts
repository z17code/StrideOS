import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { dailyCheckins, type DailyCheckin } from "@/db/schema";
import type { CheckinInput } from "@/lib/validators/checkin";

export function mapCheckin(c: DailyCheckin) {
  return {
    id: c.id,
    date: c.date,
    fatigueLevel: c.fatigueLevel,
    painLevel: c.painLevel,
    notes: c.notes,
    createdAt: c.createdAt,
  };
}

export async function getCheckin(userId: string, date: string) {
  return db.query.dailyCheckins.findFirst({
    where: and(eq(dailyCheckins.userId, userId), eq(dailyCheckins.date, date)),
  });
}

export async function upsertCheckin(
  userId: string,
  data: CheckinInput,
): Promise<DailyCheckin> {
  const existing = await getCheckin(userId, data.date);
  if (existing) {
    const [updated] = await db
      .update(dailyCheckins)
      .set({
        fatigueLevel: data.fatigueLevel,
        painLevel: data.painLevel,
        notes: data.notes ?? null,
      })
      .where(eq(dailyCheckins.id, existing.id))
      .returning();
    return updated;
  }
  const [created] = await db
    .insert(dailyCheckins)
    .values({
      userId,
      date: data.date,
      fatigueLevel: data.fatigueLevel,
      painLevel: data.painLevel,
      notes: data.notes ?? null,
    })
    .returning();
  return created;
}

export async function listRecentCheckins(
  userId: string,
  limit = 14,
): Promise<DailyCheckin[]> {
  return db
    .select()
    .from(dailyCheckins)
    .where(eq(dailyCheckins.userId, userId))
    .orderBy(desc(dailyCheckins.date))
    .limit(limit);
}
