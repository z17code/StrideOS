import { scrypt, randomBytes, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scryptAsync = promisify(scrypt);

const KEYLEN = 64;
const SALT_BYTES = 16;

/**
 * Hash a password with scrypt. Format: saltHex:hashHex
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(SALT_BYTES);
  const derived = (await scryptAsync(password, salt, KEYLEN)) as Buffer;
  return `${salt.toString("hex")}:${derived.toString("hex")}`;
}

/**
 * Verify a password against a stored salt:hash string.
 * Always runs scrypt when salt is parseable so timing is closer for
 * missing/invalid users (callers should pass a dummy hash).
 */
export async function verifyPassword(
  password: string,
  stored: string,
): Promise<boolean> {
  const [saltHex, hashHex] = stored.split(":");
  if (!saltHex || !hashHex) {
    // Still burn CPU with a throwaway scrypt to reduce cheap early exits.
    await scryptAsync(password, randomBytes(SALT_BYTES), KEYLEN);
    return false;
  }

  let salt: Buffer;
  let expected: Buffer;
  try {
    salt = Buffer.from(saltHex, "hex");
    expected = Buffer.from(hashHex, "hex");
  } catch {
    await scryptAsync(password, randomBytes(SALT_BYTES), KEYLEN);
    return false;
  }

  if (salt.length === 0 || expected.length === 0) {
    await scryptAsync(password, randomBytes(SALT_BYTES), KEYLEN);
    return false;
  }

  const derived = (await scryptAsync(password, salt, KEYLEN)) as Buffer;

  if (expected.length !== derived.length) {
    // Compare against derived to keep work similar, always false.
    timingSafeEqual(derived, derived);
    return false;
  }
  return timingSafeEqual(expected, derived);
}
