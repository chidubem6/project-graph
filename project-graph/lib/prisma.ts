import { PrismaPg } from "@prisma/adapter-pg"

import { Prisma, PrismaClient } from "@/app/generated/prisma/client"

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

// `update` and `delete` throw P2025 when their `where` matches no row, which
// callers usually want to answer as a 404 rather than let through as a 500.
export function isRecordNotFound(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025"
}

// P2003: a write referenced a row that doesn't exist, e.g. a collaborator for a
// project deleted since the ownership check.
export function isForeignKeyViolation(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2003"
}

// P2002: a `create` or `update` collided with a unique constraint.
export function isUniqueConstraintViolation(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002"
}
