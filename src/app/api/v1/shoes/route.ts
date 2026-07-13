import { jsonCreated, jsonError, jsonOk, requireUser } from "@/lib/auth/guards";
import {
  createShoe,
  listActiveShoes,
  listAllShoes,
  mapShoe,
} from "@/lib/shoes/service";
import { createShoeSchema } from "@/lib/validators/shoe";

export async function GET(request: Request) {
  const auth = await requireUser();
  if (auth.error) return auth.error;

  const url = new URL(request.url);
  const activeOnly = url.searchParams.get("active") === "1";
  const rows = activeOnly
    ? await listActiveShoes(auth.user.id)
    : await listAllShoes(auth.user.id);
  return jsonOk({ shoes: rows.map(mapShoe) });
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

  const parsed = createShoeSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(
      400,
      "VALIDATION_ERROR",
      "参数校验失败",
      parsed.error.flatten(),
    );
  }

  const shoe = await createShoe(auth.user.id, parsed.data);
  return jsonCreated({ shoe: mapShoe(shoe) });
}
