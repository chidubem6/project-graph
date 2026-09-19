import type { User } from "@clerk/nextjs/server"

import { prisma } from "@/lib/prisma"
import type { Project } from "@/types/project"

export interface ProjectLists {
  myProjects: Project[]
  sharedProjects: Project[]
}

/* Only fetch the fields the sidebar lists need */
const projectSummary = { id: true, name: true } as const

/** Retrieve the sidebar's owned and shared project lists, newest first */
export async function getProjectLists(user: User): Promise<ProjectLists> {
  /* Collect the user's verified emails, since anyone can add unverified ones */
  const emails = user.emailAddresses
    .filter((address) => address.verification?.status === "verified")
    .map((address) => address.emailAddress)

  /* Load both lists at once, skipping shared if no verified email */
  const [myProjects, sharedProjects] = await Promise.all([
    /* Owned projects match on the Clerk user ID */
    prisma.project.findMany({
      where: { ownerId: user.id },
      select: projectSummary,
      orderBy: { createdAt: "desc" },
    }),

    /* Shared projects match on a collaborator email the user owns */
    emails.length === 0
      ? []
      : prisma.project.findMany({
          where: {
            ownerId: { not: user.id },
            collaborators: { some: { email: { in: emails } } },
          },
          select: projectSummary,
          orderBy: { createdAt: "desc" },
        }),
  ])

  return { myProjects, sharedProjects }
}
