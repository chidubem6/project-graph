import { Prisma } from "@/app/generated/prisma/client"
import { errorResponse } from "@/lib/api-response"
import { prisma } from "@/lib/prisma"

// Returns the response to send when `userId` may not mutate the project, or
// null when they own it. A missing project is 404; someone else's is 403.
export async function denyUnlessOwner(projectId: string, userId: string): Promise<Response | null> {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { ownerId: true },
  })

  if (!project) {
    return errorResponse(404, "Project not found")
  }
  if (project.ownerId !== userId) {
    return errorResponse(403, "Forbidden")
  }
  return null
}

// Mutations also filter on `ownerId`, so a project deleted between the owner
// check and the write surfaces as P2025 rather than touching another row.
export function isRecordNotFound(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025"
}
