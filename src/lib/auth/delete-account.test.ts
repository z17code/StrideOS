import { describe, expect, it } from "vitest";
import {
  ADMIN_DELETE_USER_CONFIRMATION,
  DELETE_ACCOUNT_CONFIRMATION,
} from "@/lib/auth/delete-account-constants";
import {
  adminDeleteUserSchema,
  deleteAccountSchema,
} from "@/lib/validators/auth";

describe("delete account confirmation", () => {
  it("uses long phrases to reduce accidental deletes", () => {
    expect(DELETE_ACCOUNT_CONFIRMATION.length).toBeGreaterThan(10);
    expect(ADMIN_DELETE_USER_CONFIRMATION.length).toBeGreaterThan(10);
    expect(DELETE_ACCOUNT_CONFIRMATION).not.toBe(ADMIN_DELETE_USER_CONFIRMATION);
  });

  it("accepts exact self-serve confirmation only", () => {
    expect(
      deleteAccountSchema.safeParse({
        confirmation: DELETE_ACCOUNT_CONFIRMATION,
      }).success,
    ).toBe(true);
    expect(
      deleteAccountSchema.safeParse({
        confirmation: "确认注销",
      }).success,
    ).toBe(false);
    expect(
      deleteAccountSchema.safeParse({
        confirmation: ADMIN_DELETE_USER_CONFIRMATION,
      }).success,
    ).toBe(false);
  });

  it("accepts exact admin confirmation only", () => {
    expect(
      adminDeleteUserSchema.safeParse({
        confirmation: ADMIN_DELETE_USER_CONFIRMATION,
      }).success,
    ).toBe(true);
    expect(
      adminDeleteUserSchema.safeParse({
        confirmation: DELETE_ACCOUNT_CONFIRMATION,
      }).success,
    ).toBe(false);
  });
});
