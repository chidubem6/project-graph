import { auth } from "@clerk/nextjs/server"

import { errorResponse } from "@/lib/api-response"
import { prisma } from "@/lib/prisma"
import { parseNewProjectName } from "@/lib/project-name"
import { readJsonObject } from "@/lib/request-body"

export async function GET() {
  const { userId } = await auth()
  if (!userId) {
    return errorResponse(401, "Unauthorized")
  }

  const projects = await prisma.project.findMany({
    where: { ownerId: userId },
    orderBy: { createdAt: "desc" },
  })
  return Response.json({ projects })
}

export async function POST(request: Request) {
  const { userId } = await auth()
  if (!userId) {
    return errorResponse(401, "Unauthorized")
  }

  const body = await readJsonObject(request)
  if (!body) {
    return errorResponse(400, "Request body must be a JSON object")
  }
  const name = parseNewProjectName(body.name)
  if (!name.ok) {
    return errorResponse(400, name.error)
  }

  // No `id` here: the schema's `cuid()` default assigns it.
  const project = await prisma.project.create({
    data: { ownerId: userId, name: name.name },
  })
  return Response.json({ project }, { status: 201 })
}
