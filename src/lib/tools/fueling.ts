/**
 * Long-run fueling estimates (client-safe). Not medical advice.
 */

export type WeatherHint = "cool" | "mild" | "hot";

export interface FuelingInput {
  distanceKm: number;
  /** Expected duration in minutes */
  durationMin: number;
  weather?: WeatherHint;
  /** Body weight kg — optional for carb range */
  weightKg?: number | null;
}

export interface FuelingResult {
  distanceKm: number;
  durationMin: number;
  waterMl: number;
  gelCount: number;
  carbGramsLow: number;
  carbGramsHigh: number;
  sodiumMg: number;
  notes: string[];
}

const WEATHER_WATER: Record<WeatherHint, number> = {
  cool: 400, // ml per hour
  mild: 550,
  hot: 750,
};

export function estimateFueling(input: FuelingInput): FuelingResult {
  const { distanceKm, durationMin } = input;
  if (!Number.isFinite(distanceKm) || distanceKm <= 0) {
    throw new Error("距离须大于 0");
  }
  if (!Number.isFinite(durationMin) || durationMin <= 0) {
    throw new Error("预计用时须大于 0");
  }

  const hours = durationMin / 60;
  const weather: WeatherHint = input.weather ?? "mild";
  const waterMl = Math.round(WEATHER_WATER[weather] * hours);

  // Carbs: ~30–60 g/h for sessions > 75 min; scale gently with duration
  let carbLow = 0;
  let carbHigh = 0;
  let gelCount = 0;
  if (durationMin >= 75) {
    const rateLow = 30;
    const rateHigh = durationMin >= 150 ? 60 : 45;
    carbLow = Math.round(rateLow * hours);
    carbHigh = Math.round(rateHigh * hours);
    // ~25g carbs per gel
    gelCount = Math.max(1, Math.round(carbLow / 25));
  }

  if (input.weightKg != null && Number.isFinite(input.weightKg)) {
    // mild personalization: slightly more carbs for heavier athletes on long efforts
    if (durationMin >= 90 && input.weightKg >= 75) {
      carbHigh = Math.round(carbHigh * 1.1);
    }
  }

  const sodiumMg = Math.round((300 + (weather === "hot" ? 200 : 0)) * hours);

  const notes: string[] = [
    "仅为经验估算，请结合个人肠胃与赛会补给点调整。",
    "开跑前保证水分与一餐易消化碳水；训练中再试新补给。",
  ];
  if (durationMin < 60) {
    notes.push("1 小时内多数人无需额外能量胶，以水分为主即可。");
  }
  if (weather === "hot") {
    notes.push("炎热天气优先补水与钠，注意中暑迹象。");
  }

  return {
    distanceKm,
    durationMin,
    waterMl,
    gelCount,
    carbGramsLow: carbLow,
    carbGramsHigh: carbHigh,
    sodiumMg,
    notes,
  };
}
