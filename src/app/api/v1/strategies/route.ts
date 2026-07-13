import { jsonCreated, jsonError, jsonOk, requireUser } from "@/lib/auth/guards";
import {
  computeStrategy,
  createStrategy,
  listStrategies,
  mapStrategy,
} from "@/lib/strategy/service";
import { computeStrategySchema } from "@/lib/validators/strategy";

export async function GET(request: Request) {
  const auth = await requireUser();
  if (auth.error) return auth.error;

  const url = new URL(request.url);
  const limit = Math.min(
    Number(url.searchParams.get("limit") ?? "50") || 50,
    100,
  );
  const offset = Math.max(
    Number(url.searchParams.get("offset") ?? "0") || 0,
    0,
  );

  const rows = await listStrategies(auth.user.id, limit, offset);
  return jsonOk({ strategies: rows.map(mapStrategy) });
}

/**
 * POST /api/v1/strategies
 * Body: { distanceType, targetTimeSec, label?, save? }
 * - save=false/omitted → pure compute (no DB write)
 * - save=true → compute + persist
 */
export async function POST(request: Request) {
  const auth = await requireUser();
  if (auth.error) return auth.error;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError(400, "INVALID_JSON", "请求体必须是 JSON");
  }

  const parsed = computeStrategySchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(
      400,
      "VALIDATION_ERROR",
      "参数校验失败",
      parsed.error.flatten(),
    );
  }

  if (parsed.data.save) {
    const row = await createStrategy(auth.user.id, parsed.data);
    return jsonCreated({ strategy: mapStrategy(row) });
  }

  const strategy = computeStrategy(
    parsed.data.distanceType,
    parsed.data.targetTimeSec,
  );
  return jsonOk({ strategy });
}
