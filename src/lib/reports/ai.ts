export interface AiReportMetrics {
  kind: "weekly" | "monthly" | "trends";
  period: string;
  totalDistanceKm: number;
  totalDurationMin: number;
  runCount: number;
  avgRpe: number | null;
  avgPain: number | null;
  avgFatigue?: number | null;
  completionRate?: number | null;
  plannedDistanceKm?: number | null;
}

const TIMEOUT_MS = 8_000;

export function isAiConfigured(): boolean {
  return Boolean(
    process.env.AI_BASE_URL?.trim() && process.env.AI_API_KEY?.trim(),
  );
}

export async function generateAiSummary(
  metrics: AiReportMetrics,
): Promise<string | null> {
  if (!isAiConfigured()) return null;
  const baseUrl = process.env.AI_BASE_URL!.replace(/\/$/, "");
  const apiKey = process.env.AI_API_KEY!;
  const model = process.env.AI_MODEL?.trim() || "agnes-2.0-flash";
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        temperature: 0.4,
        max_tokens: 400,
        messages: [
          {
            role: "system",
            content:
              "你是跑步教练助手。根据结构化训练指标写 2–4 句中文点评，鼓励但不夸张，不给医疗诊断，不要求修改训练计划。只输出点评正文。",
          },
          { role: "user", content: JSON.stringify(metrics) },
        ],
      }),
      signal: controller.signal,
    });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const text = data.choices?.[0]?.message?.content?.trim();
    if (!text || text.length < 8 || text.length > 2000) return null;
    return text;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

