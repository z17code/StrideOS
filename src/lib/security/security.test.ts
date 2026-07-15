import { describe, expect, it } from "vitest";
import { passwordSchema, loginSchema, registerSchema } from "@/lib/validators/auth";
import {
  formatLockMessage,
} from "@/lib/security/rate-limit";
import {
  assertSameOrigin,
  getClientIp,
  ipBucketKey,
  normalizeUsernameKey,
  usernameBucketKey,
} from "@/lib/security/request";

describe("passwordSchema", () => {
  it("accepts reasonably strong passwords", () => {
    expect(passwordSchema.safeParse("Runner2026!").success).toBe(true);
    expect(passwordSchema.safeParse("abcd1234").success).toBe(true);
  });

  it("rejects short or simple passwords", () => {
    expect(passwordSchema.safeParse("short1").success).toBe(false);
    expect(passwordSchema.safeParse("allletters").success).toBe(false);
    expect(passwordSchema.safeParse("12345678").success).toBe(false);
    expect(passwordSchema.safeParse("password1").success).toBe(false);
    expect(passwordSchema.safeParse("has space1").success).toBe(false);
  });
});

describe("loginSchema", () => {
  it("requires username and password", () => {
    expect(loginSchema.safeParse({ username: "", password: "x" }).success).toBe(
      false,
    );
    expect(
      loginSchema.safeParse({ username: "alice", password: "secret" }).success,
    ).toBe(true);
  });
});

describe("registerSchema", () => {
  it("requires invite + valid password", () => {
    const ok = registerSchema.safeParse({
      inviteCode: "ABCD",
      username: "runner01",
      password: "Secure9pass",
    });
    expect(ok.success).toBe(true);

    const bad = registerSchema.safeParse({
      inviteCode: "ABCD",
      username: "runner01",
      password: "password",
    });
    expect(bad.success).toBe(false);
  });
});

describe("formatLockMessage", () => {
  it("formats seconds and minutes", () => {
    expect(formatLockMessage(0)).toContain("稍后再试");
    expect(formatLockMessage(30)).toContain("30 秒");
    expect(formatLockMessage(120)).toContain("2 分钟");
  });
});

describe("request security helpers", () => {
  it("extracts client IP from x-forwarded-for", () => {
    const req = new Request("http://localhost/api", {
      headers: { "x-forwarded-for": "1.2.3.4, 5.6.7.8" },
    });
    expect(getClientIp(req)).toBe("1.2.3.4");
  });

  it("builds stable bucket keys", () => {
    expect(normalizeUsernameKey(" Alice ")).toBe("alice");
    expect(usernameBucketKey("login", "Alice")).toBe("login:user:alice");
    expect(ipBucketKey("login", "1.2.3.4")).toMatch(/^login:ip:[a-f0-9]{32}$/);
  });

  it("allows same-origin POSTs", () => {
    const req = new Request("http://localhost:3000/api/v1/auth/login", {
      method: "POST",
      headers: { origin: "http://localhost:3000" },
    });
    expect(assertSameOrigin(req).ok).toBe(true);
  });

  it("rejects foreign origins", () => {
    const req = new Request("http://localhost:3000/api/v1/auth/login", {
      method: "POST",
      headers: { origin: "https://evil.example" },
    });
    const result = assertSameOrigin(req);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("ORIGIN_FORBIDDEN");
    }
  });
});
