/**
 * TOTP (RFC 6238) helpers + AES-GCM secret encryption.
 * Zero third-party crypto deps; uses node:crypto only.
 */
import {
  createCipheriv,
  createDecipheriv,
  createHmac,
  createHash,
  randomBytes,
  timingSafeEqual,
} from "node:crypto";

const BASE32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
const TOTP_DIGITS = 6;
const TOTP_PERIOD_SEC = 30;
const TOTP_WINDOW = 2; // ±2 steps (~±60s) — helps when login UI is slow
const ISSUER = "StrideOS";

function getEncryptionKey(): Buffer {
  const material =
    process.env.TOTP_ENCRYPTION_KEY ||
    process.env.SESSION_SECRET ||
    "";
  if (!material || material.length < 16) {
    // Dev fallback — production must set SESSION_SECRET / TOTP_ENCRYPTION_KEY.
    return createHash("sha256").update("strideos-dev-totp-key").digest();
  }
  return createHash("sha256").update(material).digest();
}

/** Encrypt plaintext → `ivB64.tagB64.cipherB64` */
export function encryptSecret(plain: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", getEncryptionKey(), iv);
  const enc = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString("base64url")}.${tag.toString("base64url")}.${enc.toString("base64url")}`;
}

export function decryptSecret(payload: string): string | null {
  const parts = payload.split(".");
  if (parts.length !== 3) return null;
  const [ivB64, tagB64, dataB64] = parts;
  try {
    const iv = Buffer.from(ivB64, "base64url");
    const tag = Buffer.from(tagB64, "base64url");
    const data = Buffer.from(dataB64, "base64url");
    const decipher = createDecipheriv("aes-256-gcm", getEncryptionKey(), iv);
    decipher.setAuthTag(tag);
    const dec = Buffer.concat([decipher.update(data), decipher.final()]);
    return dec.toString("utf8");
  } catch {
    return null;
  }
}

export function generateTotpSecret(bytes = 20): string {
  const buf = randomBytes(bytes);
  return base32Encode(buf);
}

function base32Encode(buf: Buffer): string {
  let bits = 0;
  let value = 0;
  let output = "";
  for (const byte of buf) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      output += BASE32_ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) {
    output += BASE32_ALPHABET[(value << (5 - bits)) & 31];
  }
  return output;
}

export function base32Decode(input: string): Buffer {
  const cleaned = input.replace(/=+$/g, "").toUpperCase().replace(/[^A-Z2-7]/g, "");
  let bits = 0;
  let value = 0;
  const out: number[] = [];
  for (const ch of cleaned) {
    const idx = BASE32_ALPHABET.indexOf(ch);
    if (idx < 0) continue;
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      out.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  return Buffer.from(out);
}

function hotp(secret: Buffer, counter: number): string {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64BE(BigInt(counter));
  const hmac = createHmac("sha1", secret).update(buf).digest();
  const offset = hmac[hmac.length - 1] & 0xf;
  const code =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);
  const str = String(code % 10 ** TOTP_DIGITS);
  return str.padStart(TOTP_DIGITS, "0");
}

export function generateTotpCode(
  secretBase32: string,
  atMs = Date.now(),
): string {
  const secret = base32Decode(secretBase32);
  const counter = Math.floor(atMs / 1000 / TOTP_PERIOD_SEC);
  return hotp(secret, counter);
}

export function verifyTotpCode(
  secretBase32: string,
  token: string,
  atMs = Date.now(),
  window = TOTP_WINDOW,
): boolean {
  const cleaned = token.replace(/\s+/g, "");
  if (!/^\d{6}$/.test(cleaned)) return false;
  const secret = base32Decode(secretBase32);
  if (secret.length === 0) return false;
  const counter = Math.floor(atMs / 1000 / TOTP_PERIOD_SEC);
  const expected = Buffer.from(cleaned);
  for (let w = -window; w <= window; w++) {
    const candidate = Buffer.from(hotp(secret, counter + w));
    if (
      candidate.length === expected.length &&
      timingSafeEqual(candidate, expected)
    ) {
      return true;
    }
  }
  return false;
}

export function buildOtpAuthUrl(
  secretBase32: string,
  accountName: string,
): string {
  const label = encodeURIComponent(`${ISSUER}:${accountName}`);
  const params = new URLSearchParams({
    secret: secretBase32,
    issuer: ISSUER,
    algorithm: "SHA1",
    digits: String(TOTP_DIGITS),
    period: String(TOTP_PERIOD_SEC),
  });
  return `otpauth://totp/${label}?${params.toString()}`;
}

/** Generate printable backup codes like ABCD-EF12 */
export function generateBackupCodes(count = 8): string[] {
  const codes: string[] = [];
  for (let i = 0; i < count; i++) {
    const hex = randomBytes(4).toString("hex").toUpperCase();
    codes.push(`${hex.slice(0, 4)}-${hex.slice(4)}`);
  }
  return codes;
}

export function normalizeBackupCode(code: string): string {
  return code.replace(/[\s-]/g, "").toUpperCase();
}

export function hashBackupCode(code: string): string {
  return createHash("sha256")
    .update(normalizeBackupCode(code))
    .digest("hex");
}

