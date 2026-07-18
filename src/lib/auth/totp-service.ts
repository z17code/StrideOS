/**
 * TOTP 2FA account lifecycle + pending login challenges.
 * Supports multiple named authenticators per user.
 */
import { and, eq, gt, isNull } from "drizzle-orm";
import QRCode from "qrcode";
import { db } from "@/db";
import {
  pending2fa,
  totpAuthenticators,
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
const MAX_AUTHENTICATORS = 5;
const DEFAULT_AUTH_NAME = "默认验证器";

export type TotpAuthenticatorPublic = {
  id: string;
  name: string;
  createdAt: Date;
  lastUsedAt: Date | null;
};

export async function getTotpStatus(userId: string): Promise<{
  enabled: boolean;
  enabledAt: Date | null;
  authenticators: TotpAuthenticatorPublic[];
}> {
  const row = await db
    .select({
      totpEnabled: users.totpEnabled,
      totpEnabledAt: users.totpEnabledAt,
      totpSecretEnc: users.totpSecretEnc,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  const u = row[0];

  let devices = await db
    .select({
      id: totpAuthenticators.id,
      name: totpAuthenticators.name,
      createdAt: totpAuthenticators.createdAt,
      lastUsedAt: totpAuthenticators.lastUsedAt,
    })
    .from(totpAuthenticators)
    .where(eq(totpAuthenticators.userId, userId));

  // Legacy single-secret → materialize one named device row
  if (devices.length === 0 && u?.totpEnabled && u.totpSecretEnc) {
    try {
      const [inserted] = await db
        .insert(totpAuthenticators)
        .values({
          userId,
          name: DEFAULT_AUTH_NAME,
          secretEnc: u.totpSecretEnc,
          createdAt: u.totpEnabledAt ?? new Date(),
        })
        .returning({
          id: totpAuthenticators.id,
          name: totpAuthenticators.name,
          createdAt: totpAuthenticators.createdAt,
          lastUsedAt: totpAuthenticators.lastUsedAt,
        });
      if (inserted) devices = [inserted];
    } catch {
      // table missing or race — still report enabled
    }
  }

  return {
    enabled: Boolean(u?.totpEnabled) || devices.length > 0,
    enabledAt: u?.totpEnabledAt ?? null,
    authenticators: devices,
  };
}

function normalizeAuthName(name: string | undefined | null): string {
  const cleaned = (name ?? "").trim().replace(/\s+/g, " ");
  if (!cleaned) return DEFAULT_AUTH_NAME;
  return cleaned.slice(0, 24);
}

export async function beginTotpSetup(
  userId: string,
  username: string,
  name?: string,
): Promise<{
  secret: string;
  otpauthUrl: string;
  qrDataUrl: string;
  name: string;
}> {
  const status = await getTotpStatus(userId);
  if (status.authenticators.length >= MAX_AUTHENTICATORS) {
    throw new TotpError(
      "LIMIT",
      `最多绑定 ${MAX_AUTHENTICATORS} 个验证器`,
    );
  }

  const deviceName = normalizeAuthName(name);
  const secret = generateTotpSecret();
  const accountLabel =
    deviceName === DEFAULT_AUTH_NAME
      ? username
      : `${username} (${deviceName})`;
  const otpauthUrl = buildOtpAuthUrl(secret, accountLabel);
  const qrDataUrl = await QRCode.toDataURL(otpauthUrl, {
    errorCorrectionLevel: "M",
    margin: 1,
    width: 220,
  });

  await db
    .update(users)
    .set({
      totpPendingSecretEnc: encryptSecret(secret),
      totpPendingName: deviceName,
    })
    .where(eq(users.id, userId));

  return { secret, otpauthUrl, qrDataUrl, name: deviceName };
}

export async function confirmTotpSetup(
  userId: string,
  code: string,
  name?: string,
): Promise<{ backupCodes: string[] | null; authenticator: TotpAuthenticatorPublic }> {
  const row = await db
    .select({
      totpEnabled: users.totpEnabled,
      totpPendingSecretEnc: users.totpPendingSecretEnc,
      totpPendingName: users.totpPendingName,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  const u = row[0];
  if (!u) throw new TotpError("NOT_FOUND", "用户不存在");
  if (!u.totpPendingSecretEnc) {
    throw new TotpError("NO_PENDING", "请先开始绑定验证器");
  }

  const existing = await db
    .select({ id: totpAuthenticators.id })
    .from(totpAuthenticators)
    .where(eq(totpAuthenticators.userId, userId));
  if (existing.length >= MAX_AUTHENTICATORS) {
    throw new TotpError(
      "LIMIT",
      `最多绑定 ${MAX_AUTHENTICATORS} 个验证器`,
    );
  }

  const secret = decryptSecret(u.totpPendingSecretEnc);
  if (!secret || !verifyTotpCode(secret, code)) {
    throw new TotpError("INVALID_CODE", "验证码错误或已过期，请重试");
  }

  const deviceName = normalizeAuthName(name ?? u.totpPendingName);
  const wasEnabled = Boolean(u.totpEnabled) || existing.length > 0;
  const now = new Date();
  let backupCodes: string[] | null = null;

  const inserted = await db.transaction(async (tx) => {
    const [device] = await tx
      .insert(totpAuthenticators)
      .values({
        userId,
        name: deviceName,
        secretEnc: encryptSecret(secret),
        createdAt: now,
      })
      .returning({
        id: totpAuthenticators.id,
        name: totpAuthenticators.name,
        createdAt: totpAuthenticators.createdAt,
        lastUsedAt: totpAuthenticators.lastUsedAt,
      });

    await tx
      .update(users)
      .set({
        totpEnabled: true,
        totpPendingSecretEnc: null,
        totpPendingName: null,
        totpEnabledAt: wasEnabled ? undefined : now,
        // Keep legacy column in sync with first/latest for older readers
        totpSecretEnc: encryptSecret(secret),
      })
      .where(eq(users.id, userId));

    if (!wasEnabled) {
      backupCodes = generateBackupCodes(8);
      await tx.delete(totpBackupCodes).where(eq(totpBackupCodes.userId, userId));
      await tx.insert(totpBackupCodes).values(
        backupCodes.map((c) => ({
          userId,
          codeHash: hashBackupCode(c),
        })),
      );
    }

    return device;
  });

  return {
    backupCodes,
    authenticator: {
      id: inserted.id,
      name: inserted.name,
      createdAt: inserted.createdAt,
      lastUsedAt: inserted.lastUsedAt,
    },
  };
}

export async function renameAuthenticator(
  userId: string,
  authenticatorId: string,
  name: string,
): Promise<TotpAuthenticatorPublic> {
  const deviceName = normalizeAuthName(name);
  const updated = await db
    .update(totpAuthenticators)
    .set({ name: deviceName })
    .where(
      and(
        eq(totpAuthenticators.id, authenticatorId),
        eq(totpAuthenticators.userId, userId),
      ),
    )
    .returning({
      id: totpAuthenticators.id,
      name: totpAuthenticators.name,
      createdAt: totpAuthenticators.createdAt,
      lastUsedAt: totpAuthenticators.lastUsedAt,
    });

  if (!updated[0]) {
    throw new TotpError("NOT_FOUND", "验证器不存在");
  }
  return updated[0];
}

export async function removeAuthenticator(
  userId: string,
  authenticatorId: string,
  code: string,
): Promise<{ enabled: boolean }> {
  const ok = await verifyUserTotpOrBackup(userId, code);
  if (!ok) {
    throw new TotpError("INVALID_CODE", "验证码或备份码错误");
  }

  const devices = await db
    .select({ id: totpAuthenticators.id })
    .from(totpAuthenticators)
    .where(eq(totpAuthenticators.userId, userId));

  const target = devices.find((d) => d.id === authenticatorId);
  if (!target) {
    throw new TotpError("NOT_FOUND", "验证器不存在");
  }

  if (devices.length <= 1) {
    // Removing the last device disables 2FA entirely.
    await disableTotpAfterVerified(userId);
    return { enabled: false };
  }

  await db
    .delete(totpAuthenticators)
    .where(
      and(
        eq(totpAuthenticators.id, authenticatorId),
        eq(totpAuthenticators.userId, userId),
      ),
    );
  return { enabled: true };
}

export async function disableTotp(userId: string, code: string): Promise<void> {
  const ok = await verifyUserTotpOrBackup(userId, code);
  if (!ok) {
    throw new TotpError("INVALID_CODE", "验证码或备份码错误");
  }
  await disableTotpAfterVerified(userId);
}

async function disableTotpAfterVerified(userId: string): Promise<void> {
  await db.transaction(async (tx) => {
    await tx
      .update(users)
      .set({
        totpEnabled: false,
        totpSecretEnc: null,
        totpPendingSecretEnc: null,
        totpPendingName: null,
        totpEnabledAt: null,
      })
      .where(eq(users.id, userId));
    await tx
      .delete(totpAuthenticators)
      .where(eq(totpAuthenticators.userId, userId));
    await tx.delete(totpBackupCodes).where(eq(totpBackupCodes.userId, userId));
    await tx.delete(pending2fa).where(eq(pending2fa.userId, userId));
  });
}

export async function createPending2faToken(userId: string): Promise<string> {
  const token = generateToken();
  const tokenHash = hashToken(token);
  const expiresAt = new Date();
  expiresAt.setMinutes(expiresAt.getMinutes() + PENDING_2FA_MINUTES);

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

export async function consumePending2faToken(
  pendingToken: string,
): Promise<{ userId: string } | null> {
  const p = await findPending2faToken(pendingToken);
  if (!p) return null;
  await deletePending2faToken(p.id);
  return { userId: p.userId };
}

/**
 * Verify TOTP against any bound authenticator, or unused backup code.
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
  if (!u) return false;

  const devices = await db
    .select({
      id: totpAuthenticators.id,
      secretEnc: totpAuthenticators.secretEnc,
    })
    .from(totpAuthenticators)
    .where(eq(totpAuthenticators.userId, userId));

  const secrets: { id: string | null; secretEnc: string }[] = devices.map(
    (d) => ({ id: d.id, secretEnc: d.secretEnc }),
  );
  // Legacy single-secret fallback
  if (secrets.length === 0 && u.totpSecretEnc) {
    secrets.push({ id: null, secretEnc: u.totpSecretEnc });
  }

  if (secrets.length === 0 && !u.totpEnabled) return false;

  for (const s of secrets) {
    const secret = decryptSecret(s.secretEnc);
    if (secret && verifyTotpCode(secret, cleaned)) {
      if (s.id) {
        try {
          await db
            .update(totpAuthenticators)
            .set({ lastUsedAt: new Date() })
            .where(eq(totpAuthenticators.id, s.id));
        } catch {
          // non-fatal
        }
      }
      return true;
    }
  }

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
