import { eq } from "drizzle-orm";
import { loadEnvFiles } from "./load-env";
import { db } from "./index";
import { users } from "./schema";
import { hashPassword } from "../lib/auth/password";

loadEnvFiles();

async function main() {
  const username = process.env.ADMIN_USERNAME ?? "admin";
  const password = process.env.ADMIN_PASSWORD ?? "change-me-admin";

  const existing = await db.query.users.findFirst({
    where: eq(users.username, username),
  });

  if (existing) {
    console.log(`Admin user "${username}" already exists (${existing.id}).`);
    process.exit(0);
  }

  const passwordHash = await hashPassword(password);
  const [admin] = await db
    .insert(users)
    .values({
      username,
      passwordHash,
      role: "admin",
      isActive: true,
    })
    .returning();

  console.log(`Created admin user "${admin.username}" (${admin.id}).`);
  console.log("Please change the default password immediately.");
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
