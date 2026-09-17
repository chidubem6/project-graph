"use client"

import { UserButton } from "@clerk/nextjs"
import { PanelLeftCloseIcon, PanelLeftOpenIcon } from "lucide-react"

import { Button } from "@/components/ui/button"

interface EditorNavbarProps {
  isSidebarOpen: boolean
  onToggleSidebar: () => void
}

export function EditorNavbar({
  isSidebarOpen,
  onToggleSidebar,
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

      <div className="flex items-center justify-center gap-2" />

      <div className="flex items-center justify-end gap-2">
        <UserButton />
      </div>
    </header>
  )
}
