import { z } from "zod";

export const weeklyReportSchema = z.object({
  weekStart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

export const monthlyReportSchema = z.object({
  month: z.string().regex(/^\d{4}-\d{2}$/).optional(),
});

export type WeeklyReportInput = z.infer<typeof weeklyReportSchema>;
export type MonthlyReportInput = z.infer<typeof monthlyReportSchema>;

export interface WeeklyReport {
  weekStart: string;
  weekEnd: string;
  totalDistanceKm: number;
  totalDurationMin: number;
  runCount: number;
  qualityCount: number;
  avgRpe: number | null;
  avgPain: number | null;
  avgFatigue: number | null;
  plannedDistanceKm: number | null;
  completionRate: number | null;
  streaks: {
    currentRunStreak: number;
    longestRunStreak: number;
  };
  summary: string;
}

export interface MonthlyReport {
  month: string;
  totalDistanceKm: number;
  totalDurationMin: number;
  runCount: number;
  avgRpe: number | null;
  avgPain: number | null;
  weekCount: number;
  weeklyReports: WeeklyReport[];
  summary: string;
}

export interface TrendReport {
  weeklyDistances: { weekStart: string; distanceKm: number }[];
  weeklyDurations: { weekStart: string; durationMin: number }[];
  weeklyRpe: { weekStart: string; avgRpe: number | null }[];
  fatigueTrend: { date: string; fatigueLevel: number }[];
  painTrend: { date: string; painLevel: number }[];
  summary: string;
}