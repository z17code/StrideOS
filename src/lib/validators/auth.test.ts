import { describe, expect, it } from "vitest";
import { passwordSchema, registerSchema, usernameSchema } from "@/lib/validators/auth";
import { firstFlattenMessage, firstZodMessage } from "@/lib/validators/format";

describe("register validation messages", () => {
  it("requires letter + digit in password", () => {
    const onlyLetters = passwordSchema.safeParse("abcdefgh");
    expect(onlyLetters.success).toBe(false);
    if (!onlyLetters.success) {
      expect(firstZodMessage(onlyLetters.error)).toContain("字母和数字");
    }

    const onlyDigits = passwordSchema.safeParse("12345678");
    expect(onlyDigits.success).toBe(false);

    const ok = passwordSchema.safeParse("run2026ok");
    expect(ok.success).toBe(true);
  });

  it("blocks common weak passwords", () => {
    const weak = passwordSchema.safeParse("password1");
    expect(weak.success).toBe(false);
    if (!weak.success) {
      expect(firstZodMessage(weak.error)).toContain("过于简单");
    }
  });

  it("accepts valid chinese username", () => {
    expect(usernameSchema.safeParse("跑者小明").success).toBe(true);
    expect(usernameSchema.safeParse("xhu123").success).toBe(true);
    expect(usernameSchema.safeParse("ab").success).toBe(false);
  });

  it("surfaces first field error from flatten details", () => {
    const parsed = registerSchema.safeParse({
      inviteCode: "ABC",
      username: "xhu123",
      password: "onlyalpha",
    });
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      const msg = firstFlattenMessage(parsed.error.flatten());
      expect(msg).toContain("字母和数字");
      expect(firstZodMessage(parsed.error)).toBe(msg);
    }
  });
});
