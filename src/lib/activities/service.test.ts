import { describe, expect, it, vi, beforeEach } from "vitest";

/**
 * mutationId idempotency test.
 *
 * `createActivity` uses a lookup-then-insert pattern: if an activity with the
 * same (userId, mutationId) already exists, it returns that row instead of
 * inserting a duplicate. The DB also enforces uniqueness via
 * `activities_user_mutation_uidx`.
 *
 * We mock `@/db` and drive `findFirst`'s return value to exercise both
 * branches: the insert branch (findFirst → undefined) and the dedup branch
 * (findFirst → existing row). This verifies the service's idempotency
 * contract without requiring a live database.
 */

type StoredActivity = {
  id: string;
  userId: string;
  date: string;
  workoutType: string;
  distanceKm: number | null;
  durationMin: number | null;
  actualRpe: number | null;
  avgHeartRate: number | null;
  painLevel: number | null;
  notes: string | null;
  shoeId: string | null;
  planWorkoutId: string | null;
  mutationId: string | null;
  createdAt: Date;
};

const hoisted = vi.hoisted(() => {
  const findFirst = vi.fn();
  const insertedRows: StoredActivity[] = [];
  let shoeKm: Record<string, number> = {};

  const insert = vi.fn(() => ({
    values: vi.fn((row: Partial<StoredActivity>) => ({
      returning: vi.fn(async () => {
        const created: StoredActivity = {
          id: `id-${insertedRows.length + 1}`,
          userId: row.userId!,
          date: row.date!,
          workoutType: row.workoutType!,
          distanceKm: row.distanceKm ?? null,
          durationMin: row.durationMin ?? null,
          actualRpe: row.actualRpe ?? null,
          avgHeartRate: row.avgHeartRate ?? null,
          painLevel: row.painLevel ?? null,
          notes: row.notes ?? null,
          shoeId: row.shoeId ?? null,
          planWorkoutId: row.planWorkoutId ?? null,
          mutationId: row.mutationId ?? null,
          createdAt: new Date(),
        };
        insertedRows.push(created);
        return [created];
      }),
    })),
  }));

  // The service updates shoe mileage via a separate db.update call.
  // We capture the set payload and mutate shoeKm to reflect the increment.
  let pendingSet: Record<string, unknown> | null = null;
  const update = vi.fn(() => ({
    set: vi.fn((s: Record<string, unknown>) => {
      pendingSet = s;
      return {
        where: vi.fn(async () => {
          // Drizzle encodes totalKm as a SQL fragment; in our mock the service
          // passes { totalKm: sql`... + dist` } which we can't parse. Instead we
          // rely on the distanceKm stored in the most recent inserted row.
          // The service only calls update after an insert with shoeId+distanceKm,
          // so the last inserted row tells us the increment.
          const last = insertedRows[insertedRows.length - 1];
          if (last?.shoeId && last.distanceKm && last.distanceKm > 0) {
            shoeKm[last.shoeId] =
              (shoeKm[last.shoeId] ?? 0) + last.distanceKm;
          }
          pendingSet = null;
          return [];
        }),
      };
    }),
  }));

  return {
    findFirst,
    insert,
    update,
    get insertedRows() {
      return insertedRows;
    },
    get shoeKm() {
      return shoeKm;
    },
    reset: () => {
      insertedRows.length = 0;
      shoeKm = {};
      findFirst.mockReset();
      insert.mockClear();
      update.mockClear();
    },
  };
});

vi.mock("@/db", () => ({
  db: {
    query: { activities: { findFirst: hoisted.findFirst } },
    insert: hoisted.insert,
    update: hoisted.update,
  },
}));

import { createActivity } from "../activities/service";

const baseInput = {
  date: "2026-07-13",
  workoutType: "easy" as const,
  distanceKm: 10,
  durationMin: 60,
  actualRpe: 5,
};

beforeEach(() => {
  hoisted.reset();
});

describe("createActivity — mutationId idempotency", () => {
  it("inserts a new row when no prior activity with the mutationId exists", async () => {
    // findFirst → undefined means "no existing row, proceed to insert"
    hoisted.findFirst.mockResolvedValue(undefined);

    const a1 = await createActivity("user-1", {
      ...baseInput,
      mutationId: "mut-123",
    });
    expect(a1).toBeDefined();
    expect(a1.mutationId).toBe("mut-123");
    expect(hoisted.insert).toHaveBeenCalledTimes(1);
    expect(hoisted.insertedRows).toHaveLength(1);
  });

  it("returns the existing row (no insert) when mutationId already present", async () => {
    const existing: StoredActivity = {
      id: "existing-id",
      userId: "user-1",
      date: "2026-07-13",
      workoutType: "easy",
      distanceKm: 10,
      durationMin: 60,
      actualRpe: 5,
      avgHeartRate: null,
      painLevel: null,
      notes: null,
      shoeId: null,
      planWorkoutId: null,
      mutationId: "mut-123",
      createdAt: new Date(),
    };
    hoisted.findFirst.mockResolvedValue(existing);

    const a1 = await createActivity("user-1", {
      ...baseInput,
      mutationId: "mut-123",
    });

    expect(a1.id).toBe("existing-id");
    expect(hoisted.insert).not.toHaveBeenCalled();
    expect(hoisted.insertedRows).toHaveLength(0);
  });

  it("preserves the original row's values on dedup return", async () => {
    const existing: StoredActivity = {
      id: "original",
      userId: "user-1",
      date: "2026-07-13",
      workoutType: "easy",
      distanceKm: 10, // original
      durationMin: 60,
      actualRpe: 5,
      avgHeartRate: null,
      painLevel: null,
      notes: "original notes",
      shoeId: null,
      planWorkoutId: null,
      mutationId: "mut-123",
      createdAt: new Date(),
    };
    hoisted.findFirst.mockResolvedValue(existing);

    const a2 = await createActivity("user-1", {
      ...baseInput,
      distanceKm: 99, // should be ignored
      notes: "changed notes", // should be ignored
      mutationId: "mut-123",
    });

    expect(a2.id).toBe("original");
    expect(a2.distanceKm).toBe(10); // original preserved
    expect(a2.notes).toBe("original notes");
    expect(hoisted.insert).not.toHaveBeenCalled();
  });

  it("does not perform lookup when mutationId is absent", async () => {
    hoisted.findFirst.mockResolvedValue(undefined);

    await createActivity("user-1", { ...baseInput });

    expect(hoisted.findFirst).not.toHaveBeenCalled();
    expect(hoisted.insert).toHaveBeenCalledTimes(1);
  });

  it("performs lookup before insert when mutationId is present", async () => {
    hoisted.findFirst.mockResolvedValue(undefined);

    await createActivity("user-1", { ...baseInput, mutationId: "mut-x" });

    expect(hoisted.findFirst).toHaveBeenCalledTimes(1);
    expect(hoisted.insert).toHaveBeenCalledTimes(1);
  });

  it("skips insert when lookup finds a match", async () => {
    hoisted.findFirst.mockResolvedValue({
      id: "found",
      mutationId: "mut-x",
    });

    await createActivity("user-1", { ...baseInput, mutationId: "mut-x" });

    expect(hoisted.findFirst).toHaveBeenCalledTimes(1);
    expect(hoisted.insert).not.toHaveBeenCalled();
  });

  it("always inserts when mutationId is not provided (no lookup)", async () => {
    hoisted.findFirst.mockResolvedValue(undefined);

    const a1 = await createActivity("user-1", { ...baseInput });
    const a2 = await createActivity("user-1", { ...baseInput });
    const a3 = await createActivity("user-1", { ...baseInput });

    expect(a1.id).not.toBe(a2.id);
    expect(a2.id).not.toBe(a3.id);
    expect(hoisted.findFirst).not.toHaveBeenCalled();
    expect(hoisted.insert).toHaveBeenCalledTimes(3);
  });

  it("increments shoe mileage only on the insert path, not the dedup path", async () => {
    // First call: no existing → insert → shoe km += 10
    hoisted.findFirst.mockResolvedValueOnce(undefined);
    await createActivity("user-1", {
      ...baseInput,
      distanceKm: 10,
      shoeId: "shoe-1",
      mutationId: "mut-shoe",
    });
    expect(hoisted.shoeKm["shoe-1"]).toBe(10);

    // Second call: existing → dedup return, no insert, no km increment
    hoisted.findFirst.mockResolvedValueOnce({
      id: "first",
      userId: "user-1",
      mutationId: "mut-shoe",
      shoeId: "shoe-1",
      distanceKm: 10,
    });
    await createActivity("user-1", {
      ...baseInput,
      distanceKm: 10,
      shoeId: "shoe-1",
      mutationId: "mut-shoe",
    });
    expect(hoisted.shoeKm["shoe-1"]).toBe(10); // unchanged
    expect(hoisted.insert).toHaveBeenCalledTimes(1);
  });

  it("lookup is skipped entirely without mutationId, even on repeated calls", async () => {
    hoisted.findFirst.mockResolvedValue(undefined);

    await createActivity("user-1", { ...baseInput, distanceKm: 5, shoeId: "s" });
    await createActivity("user-1", { ...baseInput, distanceKm: 5, shoeId: "s" });

    // Two inserts (no dedup possible without mutationId)
    expect(hoisted.insert).toHaveBeenCalledTimes(2);
    // Shoe km accumulates across both inserts
    expect(hoisted.shoeKm["s"]).toBe(10);
  });
});
