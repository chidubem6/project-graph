import { auth } from "@clerk/nextjs/server"

import { errorResponse } from "@/lib/http/api-response"
import { removeCollaborator } from "@/lib/projects/collaborators"
import { denyUnlessOwner } from "@/lib/projects/ownership"

/* Remove a collaborator; owner only */
export async function DELETE(
  _request: Request,
  ctx: RouteContext<"/api/projects/[projectId]/collaborators/[collaboratorId]">
) {
  /* Check the request comes from a signed-in user */
  const { userId } = await auth()
  if (!userId) {
    return errorResponse(401, "Unauthorized")
  }

  /* Only the owner may remove access */
  const { projectId, collaboratorId } = await ctx.params
  const denied = await denyUnlessOwner(projectId, userId)
  if (denied) {
    return denied
  }

  /* The delete is scoped to this project and owner too, so a stale or foreign ID is a 404 */
  const removed = await removeCollaborator(projectId, collaboratorId, userId)
  if (!removed) {
    return errorResponse(404, "Collaborator not found")
  }
  return new Response(null, { status: 204 })
}
