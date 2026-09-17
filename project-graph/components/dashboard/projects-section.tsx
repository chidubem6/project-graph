"use client"

import React from "react"
import { PlusIcon, SearchIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { DashboardEmptyState } from "./dashboard-empty-state"
import { ProjectCard, type DashboardProjectView } from "./project-card"

export function ProjectsSection({
  projects,
}: {
  projects: DashboardProjectView[]
}) {
  const [query, setQuery] = React.useState("")

  const trimmedQuery = query.trim()
  const needle = trimmedQuery.toLowerCase()
  const visibleProjects = needle
    ? projects.filter((project) => project.name.toLowerCase().includes(needle))
    : projects

  // With nothing to filter, the search row is noise rather than an affordance.
  if (projects.length === 0) return <DashboardEmptyState />

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <div className="relative w-full max-w-xs">
          <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search projects…"
            aria-label="Search projects"
            className="h-9 pl-8"
          />
        </div>

        {/* Inert until the project-create slice adds the name modal and its server action. */}
        <Button size="lg" className="shrink-0">
          <PlusIcon data-icon="inline-start" />
          New Project
        </Button>
      </div>

      {visibleProjects.length > 0 ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {visibleProjects.map((project) => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </div>
      ) : (
        <p
          role="status"
          className="rounded-lg border border-dashed border-border px-6 py-16 text-center text-sm text-muted-foreground"
        >
          No projects match &ldquo;{trimmedQuery}&rdquo;.
        </p>
      )}
    </div>
  )
}
