/**
 * BMI calculator (client-safe). Uses Chinese adult reference ranges
 * commonly shown in domestic fitness apps (偏瘦 / 正常 / 超重 / 肥胖).
 */

export type BmiCategory = "underweight" | "normal" | "overweight" | "obese";

export const BMI_CATEGORY_LABELS: Record<BmiCategory, string> = {
  underweight: "偏瘦",
  normal: "正常",
  overweight: "超重",
  obese: "肥胖",
};

export const BMI_RANGES: Array<{
  category: BmiCategory;
  label: string;
  /** Inclusive lower bound (null = -∞). */
  min: number | null;
  /** Inclusive upper bound (null = +∞). */
  max: number | null;
  display: string;
}> = [
  {
    category: "underweight",
    label: "偏瘦",
    min: null,
    max: 18.4,
    display: "< 18.5",
  },
  {
    category: "normal",
    label: "正常",
    min: 18.5,
    max: 23.9,
    display: "18.5 - 23.9",
  },
  {
    category: "overweight",
    label: "超重",
    min: 24.0,
    max: 27.9,
    display: "24.0 - 27.9",
  },
  {
    category: "obese",
    label: "肥胖",
    min: 28.0,
    max: null,
    display: "≥ 28.0",
  },
];

/** Midpoint of the "normal" band used for ideal weight (BMI 22). */
export const IDEAL_BMI = 22;

export interface BmiResult {
  bmi: number;
  category: BmiCategory;
  categoryLabel: string;
  /** Ideal weight at BMI 22 for the given height, kg. */
  idealWeightKg: number;
  heightCm: number;
  weightKg: number;
}

export function classifyBmi(bmi: number): BmiCategory {
  if (!Number.isFinite(bmi)) {
    throw new Error("bmi must be finite");
  }
  if (bmi < 18.5) return "underweight";
  if (bmi < 24) return "normal";
  if (bmi < 28) return "overweight";
  return "obese";
}

/**
 * Compute BMI from height (cm) and weight (kg).
 * Ideal weight uses BMI 22 (common Chinese fitness mid-normal target).
 */
export function computeBmi(heightCm: number, weightKg: number): BmiResult {
  if (!Number.isFinite(heightCm) || heightCm <= 0) {
    throw new Error("heightCm must be a positive number");
  }
  if (!Number.isFinite(weightKg) || weightKg <= 0) {
    throw new Error("weightKg must be a positive number");
  }

  const heightM = heightCm / 100;
  const bmi = Math.round((weightKg / (heightM * heightM)) * 10) / 10;
  const category = classifyBmi(bmi);
  const idealWeightKg =
    Math.round(IDEAL_BMI * heightM * heightM * 10) / 10;

  return {
    bmi,
    category,
    categoryLabel: BMI_CATEGORY_LABELS[category],
    idealWeightKg,
    heightCm,
    weightKg,
  };
}
