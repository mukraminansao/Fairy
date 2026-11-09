import "server-only";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client";

const globalDatabase = globalThis as typeof globalThis & { fairyDatabase?: PrismaClient };

export function databaseConfigured() {
  return Boolean(process.env.DATABASE_URL);
}

export function database() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("FAIRY_DATABASE_UNCONFIGURED");
  return globalDatabase.fairyDatabase ??= new PrismaClient({
    adapter: new PrismaPg({ connectionString, connectionTimeoutMillis: 3000 }),
  });
}
