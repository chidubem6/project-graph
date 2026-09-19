"use client"

import { UserButton } from "@clerk/nextjs"
import {
  PanelLeftCloseIcon,
  PanelLeftOpenIcon,
  Share2Icon,
  SparklesIcon,
} from "lucide-react"

import { AI_SIDEBAR_ID } from "@/components/editor/ai-sidebar"
import { Button } from "@/components/ui/button"

/** The open room's name and the actions that only exist inside a room */
interface NavbarRoom {
  name: string
  isAiSidebarOpen: boolean
  onToggleAiSidebar: () => void
  onOpenShare: () => void
}

interface EditorNavbarProps {
  isSidebarOpen: boolean
  onToggleSidebar: () => void
  /** Set on /editor/[roomId]; omitted on the editor home. */
  room?: NavbarRoom
}

export function EditorNavbar({
  isSidebarOpen,
  onToggleSidebar,
  room,
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
        {room && (
          // The center column is `auto`, so it needs its own cap to truncate.
          <h1 className="max-w-[40vw] truncate text-sm font-medium text-copy-primary">
            {room.name}
          </h1>
        )}
      </div>

      <div className="flex items-center justify-end gap-2">
        {room && (
          <>
            {/* Owners and collaborators both open it; only owners get the controls. */}
            <Button
              variant="outline"
              onClick={room.onOpenShare}
              aria-haspopup="dialog"
            >
              <Share2Icon data-icon="inline-start" className="size-4" />
              Share
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={room.onToggleAiSidebar}
              aria-label={
                room.isAiSidebarOpen
                  ? "Close AI assistant"
                  : "Open AI assistant"
              }
              aria-expanded={room.isAiSidebarOpen}
              aria-controls={AI_SIDEBAR_ID}
              // aria-expanded:, so it replaces ghost's aria-expanded:text-foreground.
              className="text-copy-muted hover:text-ai-text aria-expanded:text-ai-text"
            >
              {/* size-5, not h-5 w-5: the button's own size-4 rule would win. */}
              <SparklesIcon className="size-5" />
            </Button>
          </>
        )}
        <UserButton />
      </div>
    </header>
  )
}
