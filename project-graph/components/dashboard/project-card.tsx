import Link from "next/link"

import { formatRelativeTime } from "@/lib/format-relative-time"
import type { DashboardProject } from "./mock-projects"

export function ProjectCard({ project }: { project: DashboardProject }) {
  return (
    <Link
      href={`/projects/${project.id}`}
      className="flex flex-col gap-1 rounded-lg border border-border bg-card p-4 transition-colors outline-none hover:bg-muted focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
    >
      <span className="font-medium text-card-foreground">{project.name}</span>
      <span className="text-sm text-muted-foreground">
        Updated{" "}
        <time dateTime={project.updatedAt.toISOString()}>
          {formatRelativeTime(project.updatedAt)}
        </time>
      </span>
    </Link>
  )
}
