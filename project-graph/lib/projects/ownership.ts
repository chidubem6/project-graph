import { errorResponse } from "@/lib/http/api-response"
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
