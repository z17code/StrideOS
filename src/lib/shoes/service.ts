import { and, asc, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { shoes, type Shoe } from "@/db/schema";
import type {
  CreateShoeInput,
  UpdateShoeInput,
} from "@/lib/validators/shoe";

export function mapShoe(s: Shoe) {
  return {
    id: s.id,
    brand: s.brand,
    model: s.model,
    purchaseDate: s.purchaseDate,
    totalKm: s.totalKm,
    lastUsedAt: s.lastUsedAt,
    isRetired: s.isRetired,
    createdAt: s.createdAt,
  };
}

export async function getShoe(userId: string, shoeId: string) {
  return db.query.shoes.findFirst({
    where: and(eq(shoes.id, shoeId), eq(shoes.userId, userId)),
  });
}

/** All shoes (active + retired), brand/model ascending. */
export async function listAllShoes(userId: string) {
  return db
    .select()
    .from(shoes)
    .where(eq(shoes.userId, userId))
    .orderBy(asc(shoes.brand), asc(shoes.model));
}

/** Active (non-retired) shoes only. */
export async function listActiveShoes(userId: string) {
  return db
    .select()
    .from(shoes)
    .where(and(eq(shoes.userId, userId), eq(shoes.isRetired, false)))
    .orderBy(asc(shoes.brand), asc(shoes.model));
}

export async function createShoe(
  userId: string,
  data: CreateShoeInput,
): Promise<Shoe> {
  const [created] = await db
    .insert(shoes)
    .values({
      userId,
      brand: data.brand,
      model: data.model,
      purchaseDate: data.purchaseDate ?? null,
      totalKm: data.totalKm ?? 0,
      isRetired: false,
    })
    .returning();
  return created;
}

export async function updateShoe(
  userId: string,
  shoeId: string,
  data: UpdateShoeInput,
) {
  const existing = await getShoe(userId, shoeId);
  if (!existing) return null;
  const [updated] = await db
    .update(shoes)
    .set({
      ...(data.brand !== undefined ? { brand: data.brand } : {}),
      ...(data.model !== undefined ? { model: data.model } : {}),
      ...(data.purchaseDate !== undefined
        ? { purchaseDate: data.purchaseDate }
        : {}),
      ...(data.totalKm !== undefined ? { totalKm: data.totalKm } : {}),
      ...(data.isRetired !== undefined ? { isRetired: data.isRetired } : {}),
    })
    .where(and(eq(shoes.id, shoeId), eq(shoes.userId, userId)))
    .returning();
  return updated;
}

export async function deleteShoe(userId: string, shoeId: string) {
  const existing = await getShoe(userId, shoeId);
  if (!existing) return null;
  await db
    .delete(shoes)
    .where(and(eq(shoes.id, shoeId), eq(shoes.userId, userId)));
  return existing;
}

/** Soft-retire (isRetired = true). */
export async function retireShoe(userId: string, shoeId: string) {
  return updateShoe(userId, shoeId, { isRetired: true });
}
