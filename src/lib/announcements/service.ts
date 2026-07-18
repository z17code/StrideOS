/**
 * Site announcements — admin CRUD + public active list for logged-in users.
 */
import { and, desc, eq, gte, isNull, lte, or } from "drizzle-orm";
import { db } from "@/db";
import { announcements } from "@/db/schema";
import type {
  AnnouncementUpdateInput,
  AnnouncementWriteInput,
} from "@/lib/validators/announcement";

export type AnnouncementPublic = {
  id: string;
  title: string;
  body: string;
  priority: number;
  startsAt: string | null;
  endsAt: string | null;
  updatedAt: string;
  createdAt: string;
};

export type AnnouncementAdmin = AnnouncementPublic & {
  isPublished: boolean;
  createdByAdminId: string | null;
};

function toPublic(row: typeof announcements.$inferSelect): AnnouncementPublic {
  return {
    id: row.id,
    title: row.title,
    body: row.body,
    priority: row.priority,
    startsAt: row.startsAt?.toISOString() ?? null,
    endsAt: row.endsAt?.toISOString() ?? null,
    updatedAt: row.updatedAt.toISOString(),
    createdAt: row.createdAt.toISOString(),
  };
}

function toAdmin(row: typeof announcements.$inferSelect): AnnouncementAdmin {
  return {
    ...toPublic(row),
    isPublished: row.isPublished,
    createdByAdminId: row.createdByAdminId,
  };
}

function parseOptionalDate(
  value: string | null | undefined,
): Date | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) {
    throw new Error("INVALID_DATE");
  }
  return d;
}

/** Active published announcements for user surfaces. */
export async function listActiveAnnouncements(
  limit = 10,
): Promise<AnnouncementPublic[]> {
  const n = Math.min(Math.max(limit, 1), 20);
  const now = new Date();

  const rows = await db
    .select()
    .from(announcements)
    .where(
      and(
        eq(announcements.isPublished, true),
        or(isNull(announcements.startsAt), lte(announcements.startsAt, now)),
        or(isNull(announcements.endsAt), gte(announcements.endsAt, now)),
      ),
    )
    .orderBy(desc(announcements.priority), desc(announcements.updatedAt))
    .limit(n);

  return rows.map(toPublic);
}

/** Admin: all announcements, newest first. */
export async function listAllAnnouncements(
  limit = 100,
): Promise<AnnouncementAdmin[]> {
  const n = Math.min(Math.max(limit, 1), 200);
  const rows = await db
    .select()
    .from(announcements)
    .orderBy(desc(announcements.priority), desc(announcements.updatedAt))
    .limit(n);
  return rows.map(toAdmin);
}

export async function createAnnouncement(
  adminId: string,
  input: AnnouncementWriteInput,
): Promise<AnnouncementAdmin> {
  const startsAt = parseOptionalDate(input.startsAt ?? null) ?? null;
  const endsAt = parseOptionalDate(input.endsAt ?? null) ?? null;
  if (startsAt && endsAt && endsAt < startsAt) {
    throw new Error("ENDS_BEFORE_STARTS");
  }

  const [row] = await db
    .insert(announcements)
    .values({
      title: input.title,
      body: input.body,
      isPublished: input.isPublished ?? false,
      priority: input.priority ?? 0,
      startsAt,
      endsAt,
      createdByAdminId: adminId,
      updatedAt: new Date(),
    })
    .returning();

  return toAdmin(row);
}

export async function updateAnnouncement(
  id: string,
  input: AnnouncementUpdateInput,
): Promise<AnnouncementAdmin | null> {
  const [existing] = await db
    .select()
    .from(announcements)
    .where(eq(announcements.id, id))
    .limit(1);
  if (!existing) return null;

  const patch: Partial<typeof announcements.$inferInsert> = {
    updatedAt: new Date(),
  };

  if (input.title !== undefined) patch.title = input.title;
  if (input.body !== undefined) patch.body = input.body;
  if (input.isPublished !== undefined) patch.isPublished = input.isPublished;
  if (input.priority !== undefined) patch.priority = input.priority;

  if (input.startsAt !== undefined) {
    patch.startsAt = parseOptionalDate(input.startsAt) ?? null;
  }
  if (input.endsAt !== undefined) {
    patch.endsAt = parseOptionalDate(input.endsAt) ?? null;
  }

  const nextStarts =
    patch.startsAt !== undefined ? patch.startsAt : existing.startsAt;
  const nextEnds = patch.endsAt !== undefined ? patch.endsAt : existing.endsAt;
  if (nextStarts && nextEnds && nextEnds < nextStarts) {
    throw new Error("ENDS_BEFORE_STARTS");
  }

  const [row] = await db
    .update(announcements)
    .set(patch)
    .where(eq(announcements.id, id))
    .returning();

  return row ? toAdmin(row) : null;
}

export async function deleteAnnouncement(id: string): Promise<boolean> {
  const deleted = await db
    .delete(announcements)
    .where(eq(announcements.id, id))
    .returning({ id: announcements.id });
  return deleted.length > 0;
}
