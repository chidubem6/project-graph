import Link from "next/link"

export type DashboardProjectView = {
  id: string
  name: string
  description: string
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
    </Link>
  )
}
