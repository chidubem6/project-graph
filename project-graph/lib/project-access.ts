import { currentUser } from "@clerk/nextjs/server"

import { prisma } from "@/lib/prisma"
import { normalizeEmail } from "@/lib/projects/email"
import type { Project } from "@/types/project"

/** Who is asking for a project: the owner check uses `userId`, the collaborator check `email` */
export interface ProjectIdentity {
  userId: string
  /** Primary email, or null when missing or unverified, since anyone can add unverified ones */
  email: string | null
}

/** Read the signed-in user's Clerk ID and primary email, or null when signed out */
export async function getCurrentIdentity(): Promise<ProjectIdentity | null> {
  /* Each call is a Clerk Backend API request, so callers fetch once and pass it on */
  const user = await currentUser()

  /* Stop when no one is signed in */
  if (!user) return null

  /* Only a verified primary email may unlock collaborator access; normalized
     the same way invites store collaborator emails */
  const primary = user.primaryEmailAddress
  const email =
    primary?.verification?.status === "verified"
      ? normalizeEmail(primary.emailAddress)
      : null

  return { userId: user.id, email }
}

/** Return the project if the identity owns it or collaborates on it; null if missing or denied */
export async function findAccessibleProject(
  projectId: string,
  identity: ProjectIdentity
): Promise<Project | null> {
  /* One query, so a missing project and a forbidden one look the same to the caller */
  return prisma.project.findFirst({
    where: {
      id: projectId,
      /* Let in the owner, or a collaborator matched by verified email */
      OR: [
        { ownerId: identity.userId },
        ...(identity.email
          ? [{ collaborators: { some: { email: identity.email } } }]
          : []),
      ],
    },
    select: { id: true, name: true },
  })
}
