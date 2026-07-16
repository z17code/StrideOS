/**
 * Rough pace ↔ running power estimate (client-safe).
 * Uses a simplified flat-road model (not Stryd-calibrated).
 */

export interface PacePowerInput {
  /** Pace decimal min/km */
  paceMinPerKm?: number | null;
  /** Watts */
  powerW?: number | null;
  /** Body weight kg (required for conversion) */
  weightKg: number;
}

export interface PacePowerResult {
  paceMinPerKm: number;
  powerW: number;
  /** W/kg */
  wPerKg: number;
  note: string;
}

/**
 * Very rough: power ≈ 3.6 * mass_kg * speed_m_s  (flat, efficient runner fudge).
 * Calibrated loosely so 5:00/km @ 65kg ≈ 250–280W range.
 */
export function paceToPower(paceMinPerKm: number, weightKg: number): number {
  if (paceMinPerKm <= 0 || weightKg <= 0) throw new Error("配速与体重须大于 0");
  const speedMps = 1000 / (paceMinPerKm * 60);
  return Math.round(3.55 * weightKg * speedMps);
}

export function powerToPace(powerW: number, weightKg: number): number {
  if (powerW <= 0 || weightKg <= 0) throw new Error("功率与体重须大于 0");
  const speedMps = powerW / (3.55 * weightKg);
  if (speedMps <= 0) throw new Error("功率过低");
  return Math.round((1000 / speedMps / 60) * 100) / 100;
}

export function convertPacePower(input: PacePowerInput): PacePowerResult {
  if (!Number.isFinite(input.weightKg) || input.weightKg < 30 || input.weightKg > 200) {
    throw new Error("请填写合理体重（公斤）");
  }
  let pace = input.paceMinPerKm ?? null;
  let power = input.powerW ?? null;

  if (pace != null && pace > 0) {
    power = paceToPower(pace, input.weightKg);
  } else if (power != null && power > 0) {
    pace = powerToPace(power, input.weightKg);
  } else {
    throw new Error("请填写配速或功率之一");
  }

  return {
    paceMinPerKm: pace!,
    powerW: power!,
    wPerKg: Math.round((power! / input.weightKg) * 100) / 100,
    note: "简化平路模型，仅供参考，不能替代功率计标定。",
  };
}
