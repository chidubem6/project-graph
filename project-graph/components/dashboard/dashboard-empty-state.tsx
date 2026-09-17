import { PlusIcon } from "lucide-react"

import { Button } from "@/components/ui/button"

export function DashboardEmptyState() {
  return (
    <div className="flex flex-col items-center gap-4 rounded-lg border border-dashed border-border px-6 py-16 text-center">
      <p className="text-sm text-muted-foreground">
        You don&apos;t have any projects yet.
      </p>
      {/* Inert until the project-create slice adds the name modal and its server action. */}
      <Button size="lg">
        <PlusIcon data-icon="inline-start" />
        Create your first project
      </Button>
    </div>
  )
}
