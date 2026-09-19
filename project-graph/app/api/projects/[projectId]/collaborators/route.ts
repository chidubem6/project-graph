import { errorResponse } from "@/lib/http/api-response"
import { readJsonObject } from "@/lib/http/request-body"
import { isForeignKeyViolation, isUniqueConstraintViolation } from "@/lib/prisma"
import { findAccessibleProject, getCurrentIdentity } from "@/lib/project-access"
import { addCollaborator, getCollaborators } from "@/lib/projects/collaborators"
import { parseCollaboratorEmail } from "@/lib/projects/email"
import { denyUnlessOwner } from "@/lib/projects/ownership"

/* List a project's collaborators; the owner and collaborators may both read it */
export async function GET(_request: Request, ctx: RouteContext<"/api/projects/[projectId]/collaborators">) {
  /* Check the request comes from a signed-in user */
  const identity = await getCurrentIdentity()
  if (!identity) {
    return errorResponse(401, "Unauthorized")
  }

  /* Same check as opening the room; missing and forbidden both answer 404 */
  const { projectId } = await ctx.params
  const project = await findAccessibleProject(projectId, identity)
  if (!project) {
    return errorResponse(404, "Project not found")
  }

  const collaborators = await getCollaborators(projectId)
  return Response.json({ collaborators })
}

/* Invite a collaborator by email; owner only */
export async function POST(request: Request, ctx: RouteContext<"/api/projects/[projectId]/collaborators">) {
  /* Check the request comes from a signed-in user; the email is needed to refuse self-invites */
  const identity = await getCurrentIdentity()
  if (!identity) {
    return errorResponse(401, "Unauthorized")
  }

  /* Ownership first, so a non-owner gets 403 whatever the body holds */
  const { projectId } = await ctx.params
  const denied = await denyUnlessOwner(projectId, identity.userId)
  if (denied) {
    return denied
  }

  /* Validate and normalize the email */
  const body = await readJsonObject(request)
  if (!body) {
    return errorResponse(400, "Request body must be a JSON object")
  }
  const email = parseCollaboratorEmail(body.email)
  if (!email.ok) {
    return errorResponse(400, email.error)
  }
  if (email.email === identity.email) {
    return errorResponse(400, "You already own this project")
  }

  try {
    const collaborator = await addCollaborator(projectId, email.email)
    return Response.json({ collaborator }, { status: 201 })
  } catch (error) {
    /* The unique [projectId, email] index rejects a repeat invite */
    if (isUniqueConstraintViolation(error)) {
      return errorResponse(409, "Already a collaborator")
    }
    /* The project was deleted between the owner check and the insert */
    if (isForeignKeyViolation(error)) {
      return errorResponse(404, "Project not found")
    }
    throw error
  }
}
