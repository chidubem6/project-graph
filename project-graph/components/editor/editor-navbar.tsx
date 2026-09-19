"use client"

import { UserButton } from "@clerk/nextjs"
import { PanelLeftCloseIcon, PanelLeftOpenIcon } from "lucide-react"

import { Button } from "@/components/ui/button"

interface EditorNavbarProps {
  isSidebarOpen: boolean
  onToggleSidebar: () => void
  /** Shown in the center while a project is open. */
  projectName?: string
}

export function EditorNavbar({
  isSidebarOpen,
  onToggleSidebar,
  projectName,
}: EditorNavbarProps) {
  const ToggleIcon = isSidebarOpen ? PanelLeftCloseIcon : PanelLeftOpenIcon

  return (
    <header className="grid h-14 shrink-0 grid-cols-[1fr_auto_1fr] items-center border-b border-surface-border bg-base px-3">
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggleSidebar}
          aria-label={isSidebarOpen ? "Close sidebar" : "Open sidebar"}
          aria-expanded={isSidebarOpen}
          className="text-copy-muted hover:text-copy-primary"
        >
          <ToggleIcon className="h-5 w-5" />
        </Button>
      </div>

      <div className="flex min-w-0 items-center justify-center gap-2">
        {projectName && (
          // The center column is `auto`, so it needs its own cap to truncate.
          <span className="max-w-[40vw] truncate text-sm font-medium text-copy-primary">
            {projectName}
          </span>
        )}
      </div>

      <div className="flex items-center justify-end gap-2">
        <UserButton />
      </div>
    </header>
  )
}
