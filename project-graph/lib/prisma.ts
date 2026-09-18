import { PrismaPg } from "@prisma/adapter-pg"

import { PrismaClient } from "@/app/generated/prisma/client"

// Next.js re-evaluates modules on every hot reload in development; without a
// cache on `globalThis` each reload would open a fresh connection pool.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }

function createPrismaClient(): PrismaClient {
  const url = process.env.DATABASE_URL
  if (!url) {
    throw new Error("DATABASE_URL is not set")
  }

  // `prisma+postgres://` URLs are Accelerate endpoints and go over HTTP;
  // anything else is a direct Postgres connection through the pg adapter.
  if (url.startsWith("prisma+postgres://")) {
    return new PrismaClient({ accelerateUrl: url })
  }

  return new PrismaClient({ adapter: new PrismaPg({ connectionString: url }) })
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma
}
