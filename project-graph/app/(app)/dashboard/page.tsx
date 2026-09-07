import { currentUser } from "@clerk/nextjs/server"

import { mockProjects } from "@/components/dashboard/mock-projects"
import { ProjectsSection } from "@/components/dashboard/projects-section"
import { formatRelativeTime } from "@/lib/format-relative-time"

export default async function DashboardPage() {
  // The layout has already established there is a session; this call is only for
  // the display name, so a null user degrades to the bare greeting rather than
  // redirecting a second time.
  const user = await currentUser()

  // Swap for the ownership-scoped Drizzle query in the project-list slice. Set
  // this to [] to preview the empty state until then.
  const projects = mockProjects.map((project) => ({
    id: project.id,
    name: project.name,
    description: project.description,
    updatedAtISO: project.updatedAt.toISOString(),
    updatedLabel: formatRelativeTime(project.updatedAt),
  }))

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
      <div className="flex flex-col gap-1">
        <p className="text-sm text-muted-foreground">
          {user?.firstName ? `Hello, ${user.firstName}` : "Hello"}
        </p>
        <h1 className="text-2xl font-semibold tracking-tight">Projects</h1>
      </div>

      <ProjectsSection projects={projects} />
    </div>
  )
}
