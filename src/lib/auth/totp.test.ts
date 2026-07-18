import { describe, expect, it } from "vitest";
import {
  buildOtpAuthUrl,
  decryptSecret,
  encryptSecret,
  generateBackupCodes,
  generateTotpCode,
  generateTotpSecret,
  hashBackupCode,
  normalizeBackupCode,
  verifyTotpCode,
} from "@/lib/auth/totp";

describe("totp", () => {
  it("generates base32 secrets and verifies codes", () => {
    const secret = generateTotpSecret();
    expect(secret.length).toBeGreaterThanOrEqual(16);
    const code = generateTotpCode(secret);
    expect(code).toMatch(/^\d{6}$/);
    expect(verifyTotpCode(secret, code)).toBe(true);
    expect(verifyTotpCode(secret, "000000")).toBe(false);
  });

  it("builds otpauth url", () => {
    const url = buildOtpAuthUrl("JBSWY3DPEHPK3PXP", "alice");
    expect(url.startsWith("otpauth://totp/")).toBe(true);
    expect(url).toContain("secret=JBSWY3DPEHPK3PXP");
    expect(url).toContain("issuer=StrideOS");
  });

  it("encrypts and decrypts secrets", () => {
    process.env.SESSION_SECRET = "test-session-secret-at-least-32-chars!!";
    const plain = generateTotpSecret();
    const enc = encryptSecret(plain);
    expect(enc).not.toEqual(plain);
    expect(decryptSecret(enc)).toBe(plain);
    expect(decryptSecret("not-valid")).toBeNull();
  });

  it("normalizes and hashes backup codes", () => {
    const codes = generateBackupCodes(2);
    expect(codes).toHaveLength(2);
    expect(codes[0]).toMatch(/^[A-F0-9]{4}-[A-F0-9]{4}$/);
    const h1 = hashBackupCode(codes[0]);
    const h2 = hashBackupCode(normalizeBackupCode(codes[0]));
    expect(h1).toBe(h2);
  });
});
