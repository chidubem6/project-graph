import Link from "next/link"

export type DashboardProjectView = {
  id: string
  name: string
  description: string
  updatedAtISO: string
  // Pre-formatted on the server. Formatting relative to a client clock would
  // re-render "12 minutes ago" against a slightly different now and trip a
  // hydration mismatch, since the grid is filtered client-side.
  updatedLabel: string
}

export function ProjectCard({ project }: { project: DashboardProjectView }) {
  return (
    <Link
      href={`/projects/${project.id}`}
      className="flex min-h-36 flex-col gap-1.5 rounded-lg border border-border bg-card p-4 transition-colors outline-none hover:bg-muted focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
    >
      <span className="font-medium text-card-foreground">{project.name}</span>

      {/* Clamped rather than truncated so descriptions of different lengths still
          leave every card the same height across a row. */}
      <span className="line-clamp-3 text-sm text-muted-foreground">
        {project.description}
      </span>

      <span className="mt-auto pt-2 text-xs text-muted-foreground">
        Updated <time dateTime={project.updatedAtISO}>{project.updatedLabel}</time>
      </span>
    </Link>
  )
}
