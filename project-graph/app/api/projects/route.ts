import { auth } from "@clerk/nextjs/server"

import { errorResponse } from "@/lib/http/api-response"
import { readJsonObject } from "@/lib/http/request-body"
import { isUniqueConstraintViolation, prisma } from "@/lib/prisma"
import { parseNewProjectId } from "@/lib/projects/id"
import { parseNewProjectName } from "@/lib/projects/name"

/* Retrieve the signed-in user's projects */
export async function GET() {
  /* Check the request comes from a signed-in user */
  const { userId } = await auth()
  if (!userId) {
    return errorResponse(401, "Unauthorized")
  }

  /* Find all of the user's projects, newest first */
  const projects = await prisma.project.findMany({
    where: { ownerId: userId },
    orderBy: { createdAt: "desc" },
  })
  return Response.json({ projects })
}

/* Create a new project for the signed-in user */
export async function POST(request: Request) {
  /* Check the request comes from a signed-in user */
  const { userId } = await auth()
  if (!userId) {
    return errorResponse(401, "Unauthorized")
  }

  /* Make sure the body is a JSON object */
  const body = await readJsonObject(request)
  if (!body) {
    return errorResponse(400, "Request body must be a JSON object")
  }

  /* Validate the project name */
  const name = parseNewProjectName(body.name)
  if (!name.ok) {
    return errorResponse(400, name.error)
  }

  /* Validate the optional id sent by the editor */
  const id = parseNewProjectId(body.id)
  if (!id.ok) {
    return errorResponse(400, id.error)
  }

  /* Save the project; the editor's id is reused for its Liveblocks room, otherwise the schema generates one */
  try {
    const project = await prisma.project.create({
      data: { id: id.id, ownerId: userId, name: name.name },
    })
    return Response.json({ project }, { status: 201 })
  } catch (error) {
    /* Reject a duplicate id */
    if (isUniqueConstraintViolation(error)) {
      return errorResponse(409, "A project with this id already exists")
    }
    throw error
  }
}
