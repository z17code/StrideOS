/**
 * TOTP 2FA account lifecycle + pending login challenges.
 */
import { and, eq, gt, isNull } from "drizzle-orm";
import QRCode from "qrcode";
import { db } from "@/db";
import {
  pending2fa,
  totpBackupCodes,
  users,
} from "@/db/schema";
import { generateToken, hashToken } from "@/lib/auth/tokens";
import {
  buildOtpAuthUrl,
  decryptSecret,
  encryptSecret,
  generateBackupCodes,
  generateTotpSecret,
  hashBackupCode,
  normalizeBackupCode,
  verifyTotpCode,
} from "@/lib/auth/totp";

const PENDING_2FA_MINUTES = 5;

export async function getTotpStatus(userId: string): Promise<{
  enabled: boolean;
  enabledAt: Date | null;
}> {
  const row = await db
    .select({
      totpEnabled: users.totpEnabled,
      totpEnabledAt: users.totpEnabledAt,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  const u = row[0];
  return {
    enabled: Boolean(u?.totpEnabled),
    enabledAt: u?.totpEnabledAt ?? null,
  };
}

export async function beginTotpSetup(userId: string, username: string): Promise<{
  secret: string;
  otpauthUrl: string;
  qrDataUrl: string;
}> {
  const status = await getTotpStatus(userId);
  if (status.enabled) {
    throw new TotpError("ALREADY_ENABLED", "已开启二次验证，请先关闭后再重新绑定");
  }

  const secret = generateTotpSecret();
  const otpauthUrl = buildOtpAuthUrl(secret, username);
  const qrDataUrl = await QRCode.toDataURL(otpauthUrl, {
    errorCorrectionLevel: "M",
    margin: 1,
    width: 220,
  });

  await db
    .update(users)
    .set({ totpPendingSecretEnc: encryptSecret(secret) })
    .where(eq(users.id, userId));

  return { secret, otpauthUrl, qrDataUrl };
}

export async function confirmTotpSetup(
  userId: string,
  code: string,
): Promise<{ backupCodes: string[] }> {
  const row = await db
    .select({
      totpEnabled: users.totpEnabled,
      totpPendingSecretEnc: users.totpPendingSecretEnc,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  const u = row[0];
  if (!u) throw new TotpError("NOT_FOUND", "用户不存在");
  if (u.totpEnabled) {
    throw new TotpError("ALREADY_ENABLED", "已开启二次验证");
  }
  if (!u.totpPendingSecretEnc) {
    throw new TotpError("NO_PENDING", "请先开始绑定验证器");
  }

  const secret = decryptSecret(u.totpPendingSecretEnc);
  if (!secret || !verifyTotpCode(secret, code)) {
    throw new TotpError("INVALID_CODE", "验证码错误或已过期，请重试");
  }

  const backupCodes = generateBackupCodes(8);
  const now = new Date();

  await db.transaction(async (tx) => {
    await tx
      .update(users)
      .set({
        totpEnabled: true,
        totpSecretEnc: encryptSecret(secret),
        totpPendingSecretEnc: null,
        totpEnabledAt: now,
      })
      .where(eq(users.id, userId));

    await tx.delete(totpBackupCodes).where(eq(totpBackupCodes.userId, userId));
    await tx.insert(totpBackupCodes).values(
      backupCodes.map((c) => ({
        userId,
        codeHash: hashBackupCode(c),
      })),
    );
  });

  return { backupCodes };
}

export async function disableTotp(
  userId: string,
  code: string,
): Promise<void> {
  const ok = await verifyUserTotpOrBackup(userId, code);
  if (!ok) {
    throw new TotpError("INVALID_CODE", "验证码或备份码错误");
  }

  await db.transaction(async (tx) => {
    await tx
      .update(users)
      .set({
        totpEnabled: false,
        totpSecretEnc: null,
        totpPendingSecretEnc: null,
        totpEnabledAt: null,
      })
      .where(eq(users.id, userId));
    await tx.delete(totpBackupCodes).where(eq(totpBackupCodes.userId, userId));
    await tx.delete(pending2fa).where(eq(pending2fa.userId, userId));
  });
}

export async function createPending2faToken(userId: string): Promise<string> {
  const token = generateToken();
  const tokenHash = hashToken(token);
  const expiresAt = new Date();
  expiresAt.setMinutes(expiresAt.getMinutes() + PENDING_2FA_MINUTES);

  // One pending challenge per user.
  await db.delete(pending2fa).where(eq(pending2fa.userId, userId));
  await db.insert(pending2fa).values({ userId, tokenHash, expiresAt });
  return token;
}

export async function findPending2faToken(
  pendingToken: string,
): Promise<{ id: string; userId: string } | null> {
  const tokenHash = hashToken(pendingToken);
  const now = new Date();
  const row = await db
    .select({
      id: pending2fa.id,
      userId: pending2fa.userId,
    })
    .from(pending2fa)
    .where(
      and(eq(pending2fa.tokenHash, tokenHash), gt(pending2fa.expiresAt, now)),
    )
    .limit(1);
  return row[0] ?? null;
}

export async function deletePending2faToken(id: string): Promise<void> {
  await db.delete(pending2fa).where(eq(pending2fa.id, id));
}

/** Peek + delete after success. Prefer find + delete for retry-friendly flow. */
export async function consumePending2faToken(
  pendingToken: string,
): Promise<{ userId: string } | null> {
  const p = await findPending2faToken(pendingToken);
  if (!p) return null;
  await deletePending2faToken(p.id);
  return { userId: p.userId };
}

/**
 * Verify TOTP or unused backup code. Consumes backup code on success.
 * Does not require pending token.
 */
export async function verifyUserTotpOrBackup(
  userId: string,
  code: string,
): Promise<boolean> {
  const cleaned = code.trim();
  const row = await db
    .select({
      totpEnabled: users.totpEnabled,
      totpSecretEnc: users.totpSecretEnc,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  const u = row[0];
  if (!u?.totpEnabled || !u.totpSecretEnc) return false;

  const secret = decryptSecret(u.totpSecretEnc);
  if (secret && verifyTotpCode(secret, cleaned)) {
    return true;
  }

  // Backup codes: 8 hex chars with optional dash
  const normalized = normalizeBackupCode(cleaned);
  if (normalized.length < 6) return false;

  const codeHash = hashBackupCode(cleaned);
  const backup = await db
    .select({ id: totpBackupCodes.id })
    .from(totpBackupCodes)
    .where(
      and(
        eq(totpBackupCodes.userId, userId),
        eq(totpBackupCodes.codeHash, codeHash),
        isNull(totpBackupCodes.usedAt),
      ),
    )
    .limit(1);

  if (!backup[0]) return false;

  await db
    .update(totpBackupCodes)
    .set({ usedAt: new Date() })
    .where(eq(totpBackupCodes.id, backup[0].id));

  return true;
}

export class TotpError extends Error {
  constructor(
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "TotpError";
  }
}

export function isTotpError(err: unknown): err is TotpError {
  return err instanceof TotpError;
}
