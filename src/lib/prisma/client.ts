import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
  pgPool?: Pool;
};

const connectionString =
  process.env.DATABASE_URL ||
  "postgresql://placeholder:placeholder@localhost:5432/placeholder?schema=public";

const isCloudOrSsl =
  connectionString.includes("sslmode=require") ||
  connectionString.includes("sslmode=no-verify") ||
  connectionString.includes("supabase.co") ||
  connectionString.includes("neon.tech") ||
  connectionString.includes("pooler.supabase.com");

const pool =
  globalForPrisma.pgPool ??
  new Pool({
    connectionString,
    max: process.env.DB_POOL_MAX ? parseInt(process.env.DB_POOL_MAX, 10) : 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
    ssl: isCloudOrSsl ? { rejectUnauthorized: false } : undefined,
  });

pool.on("error", (err) => {
  console.error("Unexpected error on idle PostgreSQL client pool:", err);
});

const adapter = new PrismaPg(pool);

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter,
    log:
      process.env.NODE_ENV === "development"
        ? ["warn", "error"]
        : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
  globalForPrisma.pgPool = pool;
}

export { pool };
export default prisma;
