/** Invite consumed = permanently invalid (single-use forever). */
export function isInviteConsumed(invite: {
  usedAt: Date | string | null;
  usedByUserId: string | null;
}): boolean {
  return Boolean(invite.usedAt || invite.usedByUserId);
}

/** Unused and not expired → can register. */
export function isInviteAvailable(
  invite: {
    usedAt: Date | string | null;
    usedByUserId: string | null;
    expiresAt: Date | string | null;
  },
  now: Date = new Date(),
): boolean {
  if (isInviteConsumed(invite)) return false;
  if (invite.expiresAt && new Date(invite.expiresAt) < now) return false;
  return true;
}
