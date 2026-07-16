import { describe, expect, it } from "vitest";
import { isInviteAvailable, isInviteConsumed } from "./invite-status";

describe("invite status (permanent single-use)", () => {
  it("treats usedAt as permanent consume even when usedByUserId was cleared", () => {
    // Simulates post-account-deletion FK SET NULL on usedByUserId.
    const afterUserDeleted = {
      usedAt: new Date("2026-01-01T00:00:00Z"),
      usedByUserId: null as string | null,
      expiresAt: null as Date | null,
    };
    expect(isInviteConsumed(afterUserDeleted)).toBe(true);
    expect(isInviteAvailable(afterUserDeleted)).toBe(false);
  });

  it("is unused when both markers are null", () => {
    const unused = {
      usedAt: null,
      usedByUserId: null,
      expiresAt: null,
    };
    expect(isInviteConsumed(unused)).toBe(false);
    expect(isInviteAvailable(unused)).toBe(true);
  });

  it("rejects expired unused codes", () => {
    const expired = {
      usedAt: null,
      usedByUserId: null,
      expiresAt: new Date("2020-01-01T00:00:00Z"),
    };
    expect(isInviteAvailable(expired, new Date("2026-07-15T00:00:00Z"))).toBe(
      false,
    );
  });

  it("is consumed when only usedByUserId is set", () => {
    expect(
      isInviteConsumed({
        usedAt: null,
        usedByUserId: "user-1",
      }),
    ).toBe(true);
  });
});
