import { WorkflowIcon } from "lucide-react"

interface CanvasPlaceholderProps {
  projectName: string
}

// Stands in for the React Flow canvas until the canvas spec. Fills the workspace
// area; the dot grid hints at the canvas background it will become.
export function CanvasPlaceholder({ projectName }: CanvasPlaceholderProps) {
  return (
    <section
      aria-label="Canvas"
      className="flex h-full items-center justify-center bg-base bg-[radial-gradient(var(--border-default)_1px,transparent_1px)] bg-size-[24px_24px] px-6"
    >
      <div className="flex max-w-sm flex-col items-center gap-3 rounded-2xl bg-base px-6 py-5 text-center">
        <WorkflowIcon className="h-8 w-8 text-copy-faint" aria-hidden="true" />
        <p className="text-sm font-medium text-copy-secondary">
          Canvas coming soon
        </p>
        <p className="text-sm text-copy-muted">
          The collaborative canvas for {projectName} will appear here.
        </p>
      </div>
    </section>
  )
}
