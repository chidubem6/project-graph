"use client"

import { PlusIcon } from "lucide-react"

import { Button } from "@/components/ui/button"

interface EditorHomeProps {
  onCreateProject: () => void
}

// The editor's empty state: shown until a project is opened on the canvas.
export function EditorHome({ onCreateProject }: EditorHomeProps) {
  return (
    <div className="flex h-full items-center justify-center px-6">
      <div className="flex max-w-md flex-col items-center gap-3 text-center">
        <h1 className="text-xl font-semibold text-copy-primary">
          Create a project or open an existing one
        </h1>
        <p className="text-sm text-copy-muted">
          Start a new architecture workspace, or choose a project from the
          sidebar.
        </p>
        <Button size="lg" onClick={onCreateProject} className="mt-2">
          <PlusIcon data-icon="inline-start" className="h-5 w-5" />
          New Project
        </Button>
      </div>
    </div>
  )
}
