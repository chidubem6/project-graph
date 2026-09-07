import { PlusIcon } from "lucide-react"

import { DashboardEmptyState } from "@/components/dashboard/dashboard-empty-state"
import { mockProjects } from "@/components/dashboard/mock-projects"
import { ProjectCard } from "@/components/dashboard/project-card"
import { Button } from "@/components/ui/button"

export default function DashboardPage() {
  // Swap for the ownership-scoped Drizzle query in the project-list slice. Set
  // this to [] to preview the empty state until then.
  const projects = mockProjects

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold tracking-tight">Your Projects</h1>

        {/* Inert until the project-create slice adds the name modal and its server action. */}
        {projects.length > 0 && (
          <Button size="lg">
            <PlusIcon data-icon="inline-start" />
            New Project
          </Button>
        )}
      </div>

      {projects.length > 0 ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </div>
      ) : (
        <DashboardEmptyState />
      )}
    </div>
  )
}
