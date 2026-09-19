"use client"

import { SparklesIcon, XIcon } from "lucide-react"
import { cn } from "cn"

import { Button } from "@/components/ui/button"

/** Lets the navbar toggle point `aria-controls` at this panel */
export const AI_SIDEBAR_ID = "ai-sidebar"

interface AiSidebarProps {
  isOpen: boolean
  onClose: () => void
}

// Placeholder for the AI chat. Floats over the canvas from the right, mirroring
// the project sidebar, so it needs a `relative` workspace parent.
export function AiSidebar({ isOpen, onClose }: AiSidebarProps) {
  return (
    <aside
      id={AI_SIDEBAR_ID}
      aria-label="AI assistant"
      // `inert` hides the closed panel from focus and assistive tech.
      inert={!isOpen}
      className={cn(
        "absolute inset-y-3 right-3 z-40 flex w-80 max-w-[calc(100%-1.5rem)] flex-col rounded-2xl border border-surface-border bg-surface/90 backdrop-blur-md transition-transform duration-200 ease-out",
        isOpen ? "translate-x-0" : "translate-x-[calc(100%+0.75rem)]"
      )}
    >
      <div className="flex h-12 shrink-0 items-center justify-between border-b border-surface-border px-4">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-copy-primary">
          <SparklesIcon className="h-4 w-4 text-ai-text" aria-hidden="true" />
          AI Assistant
        </h2>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={onClose}
          aria-label="Close AI assistant"
          className="text-copy-muted hover:text-copy-primary"
        >
          <XIcon className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
        <SparklesIcon className="h-8 w-8 text-copy-faint" aria-hidden="true" />
        <p className="text-sm text-copy-muted">
          AI chat is coming soon. You&apos;ll be able to describe a system here
          and have it drawn on the canvas.
        </p>
      </div>
    </aside>
  )
}
