import { auth } from "@clerk/nextjs/server"

import { errorResponse } from "@/lib/http/api-response"
import { readJsonObject } from "@/lib/http/request-body"
import { isRecordNotFound, prisma } from "@/lib/prisma"
import { parseProjectRename } from "@/lib/projects/name"
import { denyUnlessOwner } from "@/lib/projects/ownership"

export async function PATCH(request: Request, ctx: RouteContext<"/api/projects/[projectId]">) {
  const { userId } = await auth()
  if (!userId) {
    return errorResponse(401, "Unauthorized")
  }

  // Ownership first, so a non-owner gets 403 whatever the body holds.
  const { projectId } = await ctx.params
  const denied = await denyUnlessOwner(projectId, userId)
  if (denied) {
    return denied
  }

  const body = await readJsonObject(request)
  if (!body) {
    return errorResponse(400, "Request body must be a JSON object")
  }
  const name = parseProjectRename(body.name)
  if (!name.ok) {
    return errorResponse(400, name.error)
  }

  // The write also filters on `ownerId`, so a project deleted between the owner
  // check and here surfaces as P2025 rather than touching another row.
  try {
    const project = await prisma.project.update({
      where: { id: projectId, ownerId: userId },
      data: { name: name.name },
    })
    return Response.json({ project })
  } catch (error) {
    if (isRecordNotFound(error)) {
      return errorResponse(404, "Project not found")
    }
    throw error
  }
}

export async function DELETE(_request: Request, ctx: RouteContext<"/api/projects/[projectId]">) {
  const { userId } = await auth()
  if (!userId) {
    return errorResponse(401, "Unauthorized")
  }

  const { projectId } = await ctx.params
  const denied = await denyUnlessOwner(projectId, userId)
  if (denied) {
    return denied
  }

  try {
    // Collaborators go with it through the schema's `onDelete: Cascade`.
    await prisma.project.delete({
      where: { id: projectId, ownerId: userId },
    })
  } catch (error) {
    if (isRecordNotFound(error)) {
      return errorResponse(404, "Project not found")
    }
    throw error
  }
  return new Response(null, { status: 204 })
}
