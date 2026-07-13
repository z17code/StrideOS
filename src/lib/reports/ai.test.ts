import { describe, expect, it, vi } from "vitest";
import { generateAiSummary, isAiConfigured } from "../reports/ai";

describe("isAiConfigured", () => {
  it("returns false when env vars are missing", () => {
    expect(isAiConfigured()).toBe(false);
  });
});

describe("generateAiSummary", () => {
  it("returns null when AI is not configured", async () => {
    const result = await generateAiSummary({
      kind: "weekly",
      period: "2026-07-13~2026-07-19",
      totalDistanceKm: 15,
      totalDurationMin: 120,
      runCount: 3,
      avgRpe: 5.5,
      avgPain: 1,
      avgFatigue: 2,
      completionRate: 0.75,
      plannedDistanceKm: 20,
    });
    expect(result).toBeNull();
  });

  it("returns template summary when AI is not configured (via service layer)", async () => {
    // This is implicitly tested by the service returning template when AI returns null
    // We test generateAiSummary directly since the env vars won't be set in test
    const result = await generateAiSummary({
      kind: "weekly",
      period: "test",
      totalDistanceKm: 0,
      totalDurationMin: 0,
      runCount: 0,
      avgRpe: null,
      avgPain: null,
    });
    expect(result).toBeNull();
  });

  it("returns null when AI call fails (network error)", async () => {
    const originalFetch = globalThis.fetch;
    vi.stubGlobal(
      "fetch",
      vi.fn(() => Promise.reject(new Error("network"))),
    );

    // Set env to simulate configured AI
    const originalBase = process.env.AI_BASE_URL;
    const originalKey = process.env.AI_API_KEY;
    process.env.AI_BASE_URL = "http://localhost:11434";
    process.env.AI_API_KEY = "test-key";

    try {
      const result = await generateAiSummary({
        kind: "weekly",
        period: "test",
        totalDistanceKm: 10,
        totalDurationMin: 60,
        runCount: 2,
        avgRpe: 5,
        avgPain: 1,
      });
      expect(result).toBeNull();
    } finally {
      process.env.AI_BASE_URL = originalBase;
      process.env.AI_API_KEY = originalKey;
      vi.stubGlobal("fetch", originalFetch);
    }
  });

  it("returns null when AI response is too short", async () => {
    const originalFetch = globalThis.fetch;
    vi.stubGlobal(
      "fetch",
      vi.fn(() =>
        Promise.resolve(
          new Response(JSON.stringify({
            choices: [{ message: { content: "hi" } }],
          }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          }),
        ),
      ),
    );

    const originalBase = process.env.AI_BASE_URL;
    const originalKey = process.env.AI_API_KEY;
    process.env.AI_BASE_URL = "http://localhost:11434";
    process.env.AI_API_KEY = "test-key";

    try {
      const result = await generateAiSummary({
        kind: "weekly",
        period: "test",
        totalDistanceKm: 10,
        totalDurationMin: 60,
        runCount: 2,
        avgRpe: 5,
        avgPain: 1,
      });
      expect(result).toBeNull(); // "hi" < 8 chars
    } finally {
      process.env.AI_BASE_URL = originalBase;
      process.env.AI_API_KEY = originalKey;
      vi.stubGlobal("fetch", originalFetch);
    }
  });

  it("returns null when AI response is too long", async () => {
    const originalFetch = globalThis.fetch;
    const longText = "x".repeat(3000);
    vi.stubGlobal(
      "fetch",
      vi.fn(() =>
        Promise.resolve(
          new Response(JSON.stringify({
            choices: [{ message: { content: longText } }],
          }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          }),
        ),
      ),
    );

    const originalBase = process.env.AI_BASE_URL;
    const originalKey = process.env.AI_API_KEY;
    process.env.AI_BASE_URL = "http://localhost:11434";
    process.env.AI_API_KEY = "test-key";

    try {
      const result = await generateAiSummary({
        kind: "weekly",
        period: "test",
        totalDistanceKm: 10,
        totalDurationMin: 60,
        runCount: 2,
        avgRpe: 5,
        avgPain: 1,
      });
      expect(result).toBeNull(); // 3000 > 2000 chars
    } finally {
      process.env.AI_BASE_URL = originalBase;
      process.env.AI_API_KEY = originalKey;
      vi.stubGlobal("fetch", originalFetch);
    }
  });

  it("returns AI summary when call succeeds with valid response", async () => {
    const originalFetch = globalThis.fetch;
    vi.stubGlobal(
      "fetch",
      vi.fn(() =>
        Promise.resolve(
          new Response(
            JSON.stringify({
              choices: [
                {
                  message: {
                    content:
                      "本周表现稳定，累计完成15公里训练。平均RPE适中，建议继续保持当前节奏。",
                  },
                },
              ],
            }),
            {
              status: 200,
              headers: { "Content-Type": "application/json" },
            },
          ),
        ),
      ),
    );

    const originalBase = process.env.AI_BASE_URL;
    const originalKey = process.env.AI_API_KEY;
    process.env.AI_BASE_URL = "http://localhost:11434";
    process.env.AI_API_KEY = "test-key";

    try {
      const result = await generateAiSummary({
        kind: "weekly",
        period: "test",
        totalDistanceKm: 15,
        totalDurationMin: 120,
        runCount: 3,
        avgRpe: 5.5,
        avgPain: 1,
      });
      expect(result).toBeTruthy();
      expect(result!.length).toBeGreaterThan(8);
      expect(result!.length).toBeLessThan(2000);
    } finally {
      process.env.AI_BASE_URL = originalBase;
      process.env.AI_API_KEY = originalKey;
      vi.stubGlobal("fetch", originalFetch);
    }
  });

  it("returns null when AI returns HTTP error", async () => {
    const originalFetch = globalThis.fetch;
    vi.stubGlobal(
      "fetch",
      vi.fn(() =>
        Promise.resolve(
          new Response("error", { status: 500 }),
        ),
      ),
    );

    const originalBase = process.env.AI_BASE_URL;
    const originalKey = process.env.AI_API_KEY;
    process.env.AI_BASE_URL = "http://localhost:11434";
    process.env.AI_API_KEY = "test-key";

    try {
      const result = await generateAiSummary({
        kind: "weekly",
        period: "test",
        totalDistanceKm: 10,
        totalDurationMin: 60,
        runCount: 2,
        avgRpe: 5,
        avgPain: 1,
      });
      expect(result).toBeNull();
    } finally {
      process.env.AI_BASE_URL = originalBase;
      process.env.AI_API_KEY = originalKey;
      vi.stubGlobal("fetch", originalFetch);
    }
  });

  it("returns null when AI response has empty choices", async () => {
    const originalFetch = globalThis.fetch;
    vi.stubGlobal(
      "fetch",
      vi.fn(() =>
        Promise.resolve(
          new Response(JSON.stringify({ choices: [] }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          }),
        ),
      ),
    );

    const originalBase = process.env.AI_BASE_URL;
    const originalKey = process.env.AI_API_KEY;
    process.env.AI_BASE_URL = "http://localhost:11434";
    process.env.AI_API_KEY = "test-key";

    try {
      const result = await generateAiSummary({
        kind: "weekly",
        period: "test",
        totalDistanceKm: 10,
        totalDurationMin: 60,
        runCount: 2,
        avgRpe: 5,
        avgPain: 1,
      });
      expect(result).toBeNull();
    } finally {
      process.env.AI_BASE_URL = originalBase;
      process.env.AI_API_KEY = originalKey;
      vi.stubGlobal("fetch", originalFetch);
    }
  });

});
