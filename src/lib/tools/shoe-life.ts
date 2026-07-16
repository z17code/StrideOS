/**
 * Shoe lifespan helpers (client-safe). Thresholds are defaults, not brand guarantees.
 */

export const DEFAULT_SHOE_LIFE_KM = 700;
export const WARN_RATIO = 0.8;

export interface ShoeLifeInput {
  totalKm: number;
  lifeKm?: number;
  /** Optional: recent average weekly km to estimate remaining weeks */
  weeklyKm?: number | null;
  purchaseDate?: string | null;
  today?: string | null;
}

export interface ShoeLifeResult {
  totalKm: number;
  lifeKm: number;
  remainingKm: number;
  usedRatio: number;
  /** 0–100 */
  percentUsed: number;
  status: "fresh" | "ok" | "warn" | "retire";
  statusLabel: string;
  remainingWeeks: number | null;
}

export function assessShoeLife(input: ShoeLifeInput): ShoeLifeResult {
  const lifeKm = input.lifeKm && input.lifeKm > 0 ? input.lifeKm : DEFAULT_SHOE_LIFE_KM;
  const totalKm = Math.max(0, input.totalKm || 0);
  const remainingKm = Math.max(0, Math.round((lifeKm - totalKm) * 10) / 10);
  const usedRatio = lifeKm > 0 ? totalKm / lifeKm : 0;
  const percentUsed = Math.min(100, Math.round(usedRatio * 1000) / 10);

  let status: ShoeLifeResult["status"];
  let statusLabel: string;
  if (usedRatio >= 1) {
    status = "retire";
    statusLabel = "建议退役";
  } else if (usedRatio >= WARN_RATIO) {
    status = "warn";
    statusLabel = "接近寿命";
  } else if (usedRatio < 0.25) {
    status = "fresh";
    statusLabel = "较新";
  } else {
    status = "ok";
    statusLabel = "正常使用";
  }

  let remainingWeeks: number | null = null;
  if (input.weeklyKm != null && input.weeklyKm > 0 && remainingKm > 0) {
    remainingWeeks = Math.ceil(remainingKm / input.weeklyKm);
  }

  return {
    totalKm,
    lifeKm,
    remainingKm,
    usedRatio,
    percentUsed,
    status,
    statusLabel,
    remainingWeeks,
  };
}
