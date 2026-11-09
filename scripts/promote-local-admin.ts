import { existsSync } from "node:fs";
import { loadEnvFile } from "node:process";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

if (existsSync(".env.local")) loadEnvFile(".env.local");
const connection = process.env.DATABASE_URL ? new URL(process.env.DATABASE_URL) : null;
const [email, confirmation] = process.argv.slice(2);
if (!connection || !["127.0.0.1", "localhost", "[::1]"].includes(connection.hostname) ||
    !/^\/fairy_(dev|test)(_[a-z0-9]+)?$/.test(connection.pathname) ||
    !email || !/^[^\s@]+@fairy\.test$/.test(email) || confirmation !== "--confirm-local-promotion") {
  throw new Error("After verifying the test identity, run npm run db:promote-local-admin -- user@fairy.test --confirm-local-promotion against an isolated local FAIRY database.");
}
const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: connection.href }) });

async function promote() {
  const changed = await db.$transaction(async (tx) => {
    const user = await tx.user.findUnique({ where: { email }, select: { id: true, role: true } });
    if (!user) throw new Error("The verified local test user does not exist.");
    if (user.role === "ADMIN") return false;
    await tx.user.update({ where: { id: user.id }, data: { role: "ADMIN" } });
    await tx.auditLog.create({ data: {
      action: "LOCAL_ADMIN_PROMOTED", targetType: "User", targetId: user.id,
      details: { from: user.role, to: "ADMIN", source: "local-operator" },
    } });
    return true;
  }, { isolationLevel: "Serializable" });
  console.log(changed ? "Local test user promoted and recorded in the audit log." : "Local test user already has administrator access.");
}

promote().catch(() => {
  console.error("Promotion did not complete. Confirm the test identity exists and the local database is reachable.");
  process.exitCode = 1;
}).finally(() => db.$disconnect());

