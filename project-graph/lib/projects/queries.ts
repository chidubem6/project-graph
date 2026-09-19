import type { ProjectIdentity } from "@/lib/project-access"
import { prisma } from "@/lib/prisma"
import type { Project } from "@/types/project"

export interface ProjectLists {
  myProjects: Project[]
  sharedProjects: Project[]
}

/* Only fetch the fields the sidebar lists need */
const projectSummary = { id: true, name: true } as const

/** Retrieve the sidebar's owned and shared project lists, newest first */
export async function getProjectLists(
  identity: ProjectIdentity
): Promise<ProjectLists> {
  /* Load both lists at once, skipping shared if no verified primary email */
  const [myProjects, sharedProjects] = await Promise.all([
    /* Owned projects match on the Clerk user ID */
    prisma.project.findMany({
      where: { ownerId: identity.userId },
      select: projectSummary,
      orderBy: { createdAt: "desc" },
    }),

    /* Shared projects match on the same email `findAccessibleProject` accepts,
       so every shared entry opens rather than showing AccessDenied */
    identity.email === null
      ? []
      : prisma.project.findMany({
          where: {
            ownerId: { not: identity.userId },
            collaborators: { some: { email: identity.email } },
          },
          select: projectSummary,
          orderBy: { createdAt: "desc" },
        }),
  ])

  return { myProjects, sharedProjects }
}
