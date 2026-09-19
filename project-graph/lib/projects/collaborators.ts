import { clerkClient } from "@clerk/nextjs/server"

import { prisma } from "@/lib/prisma"
import { normalizeEmail } from "@/lib/projects/email"
import type { Collaborator } from "@/types/collaborator"

/* Clerk's `emailAddress` filter accepts at most 100 addresses per request */
const CLERK_EMAIL_FILTER_LIMIT = 100

/** What Clerk adds to a stored collaborator email */
interface ClerkProfile {
  name: string | null
  imageUrl: string
}

/* Only the columns the share dialog needs */
const collaboratorRow = { id: true, email: true } as const

/** List a project's collaborators, oldest invite first, with Clerk names and avatars where available */
export async function getCollaborators(projectId: string): Promise<Collaborator[]> {
  const rows = await prisma.projectCollaborator.findMany({
    where: { projectId },
    select: collaboratorRow,
    orderBy: { createdAt: "asc" },
  })
  const profiles = await findClerkProfiles(rows.map((row) => row.email))
  return rows.map((row) => toCollaborator(row, profiles))
}

/** Store a collaborator by (already normalized) email; a duplicate throws Prisma's P2002 */
export async function addCollaborator(projectId: string, email: string): Promise<Collaborator> {
  const row = await prisma.projectCollaborator.create({
    data: { projectId, email },
    select: collaboratorRow,
  })
  const profiles = await findClerkProfiles([row.email])
  return toCollaborator(row, profiles)
}

/** Remove a collaborator from a project the given user owns; false when nothing matched */
export async function removeCollaborator(
  projectId: string,
  collaboratorId: string,
  ownerId: string
): Promise<boolean> {
  /* Scoped to the project and its owner, so an ID from another project never matches */
  const { count } = await prisma.projectCollaborator.deleteMany({
    where: { id: collaboratorId, projectId, project: { ownerId } },
  })
  return count > 0
}

/* Attach the Clerk profile for a row's email, or leave the email to stand alone */
function toCollaborator(
  row: { id: string; email: string },
  profiles: Map<string, ClerkProfile>
): Collaborator {
  const profile = profiles.get(normalizeEmail(row.email))
  return {
    id: row.id,
    email: row.email,
    name: profile?.name ?? null,
    imageUrl: profile?.imageUrl ?? null,
  }
}

/*
 * Look up Clerk users by email, keyed by normalized address. Only verified
 * addresses count, so nobody can borrow another person's name by adding their
 * email unverified. A Clerk failure degrades to "no profiles" (emails only)
 * rather than failing the whole request.
 */
async function findClerkProfiles(emails: string[]): Promise<Map<string, ClerkProfile>> {
  const profiles = new Map<string, ClerkProfile>()
  if (emails.length === 0) return profiles

  /* Split into batches the filter accepts */
  const batches: string[][] = []
  for (let start = 0; start < emails.length; start += CLERK_EMAIL_FILTER_LIMIT) {
    batches.push(emails.slice(start, start + CLERK_EMAIL_FILTER_LIMIT))
  }

  try {
    const client = await clerkClient()
    const results = await Promise.all(
      batches.map((batch) =>
        /* `limit` defaults to 10; each email belongs to at most one user */
        client.users.getUserList({ emailAddress: batch, limit: batch.length })
      )
    )

    for (const { data: users } of results) {
      for (const user of users) {
        const profile = { name: user.fullName ?? user.username, imageUrl: user.imageUrl }
        for (const address of user.emailAddresses) {
          if (address.verification?.status === "verified") {
            profiles.set(normalizeEmail(address.emailAddress), profile)
          }
        }
      }
    }
  } catch (error) {
    /* Nothing was added yet: the map is filled only after every batch resolves */
    console.error("Clerk profile lookup failed; showing collaborator emails only", error)
  }

  return profiles
}
