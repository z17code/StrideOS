import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { jsonOk, requireAdmin } from "@/lib/auth/guards";

export async function GET() {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  const list = await db
    .select({
      id: users.id,
      username: users.username,
      email: users.email,
      adminNote: users.adminNote,
      role: users.role,
      isActive: users.isActive,
      createdAt: users.createdAt,
    })
    .from(users)
    .orderBy(desc(users.createdAt));

  return jsonOk({ users: list });
}
