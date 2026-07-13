import { jsonCreated, jsonError, jsonOk, requireUser } from "@/lib/auth/guards";
import {
  createStrengthSession,
  listStrengthSessions,
  mapStrengthSession,
  STRENGTH_TEMPLATES,
} from "@/lib/strength/service";
import { createStrengthSchema } from "@/lib/validators/strength";

export async function GET(request: Request) {
  const auth = await requireUser();
  if (auth.error) return auth.error;

  const url = new URL(request.url);
  if (url.searchParams.get("templates") === "1") {
    return jsonOk({ templates: STRENGTH_TEMPLATES });
  }

  const limit = Math.min(
    Number(url.searchParams.get("limit") ?? "50") || 50,
    100,
  );
  const offset = Math.max(
    Number(url.searchParams.get("offset") ?? "0") || 0,
    0,
  );

  const rows = await listStrengthSessions(auth.user.id, limit, offset);
  return jsonOk({ sessions: rows.map(mapStrengthSession) });
}

export async function POST(request: Request) {
  const auth = await requireUser();
  if (auth.error) return auth.error;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError(400, "INVALID_JSON", "请求体必须是 JSON");
  }

  const parsed = createStrengthSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(
      400,
      "VALIDATION_ERROR",
      "参数校验失败",
      parsed.error.flatten(),
    );
  }

  const session = await createStrengthSession(auth.user.id, parsed.data);
  return jsonCreated({ session: mapStrengthSession(session) });
}
