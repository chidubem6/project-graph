"use client"

import type { LucideIcon } from "lucide-react"
import { FolderIcon, PlusIcon, UsersIcon, XIcon } from "lucide-react"
import { cn } from "cn"

import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

interface ProjectSidebarProps {
  isOpen: boolean
  onClose: () => void
}

// Positioned against the nearest `relative` ancestor (the editor workspace), so it
// floats over the canvas instead of taking space in the layout.
export function ProjectSidebar({ isOpen, onClose }: ProjectSidebarProps) {
  return (
    <aside
      aria-label="Projects"
      aria-hidden={!isOpen}
      inert={!isOpen}
      className={cn(
        "absolute inset-y-3 left-3 z-40 flex w-72 flex-col rounded-2xl border border-surface-border bg-surface/90 backdrop-blur-md transition-transform duration-200 ease-out",
        isOpen ? "translate-x-0" : "-translate-x-[calc(100%+0.75rem)]"
      )}
    >
      <div className="flex h-12 shrink-0 items-center justify-between border-b border-surface-border px-4">
        <h2 className="text-sm font-semibold text-copy-primary">Projects</h2>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={onClose}
          aria-label="Close sidebar"
          className="text-copy-muted hover:text-copy-primary"
        >
          <XIcon className="h-4 w-4" />
        </Button>
      </div>

      <Tabs defaultValue="my-projects" className="min-h-0 flex-1 p-3">
        <TabsList className="w-full bg-elevated">
          <TabsTrigger value="my-projects">My Projects</TabsTrigger>
          <TabsTrigger value="shared">Shared</TabsTrigger>
        </TabsList>
        <TabsContent value="my-projects" className="flex">
          <SidebarEmptyState icon={FolderIcon} message="No projects yet." />
        </TabsContent>
        <TabsContent value="shared" className="flex">
          <SidebarEmptyState
            icon={UsersIcon}
            message="No projects shared with you."
          />
        </TabsContent>
      </Tabs>

      <div className="shrink-0 border-t border-surface-border p-3">
        {/* Inert until the project-create slice adds the name dialog and its server action. */}
        <Button size="lg" className="w-full">
          <PlusIcon data-icon="inline-start" className="h-5 w-5" />
          New Project
        </Button>
      </div>
    </aside>
  )
}

interface SidebarEmptyStateProps {
  icon: LucideIcon
  message: string
}

function SidebarEmptyState({ icon: Icon, message }: SidebarEmptyStateProps) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-surface-border px-4 py-10 text-center">
      <Icon className="h-8 w-8 text-copy-faint" />
      <p className="text-sm text-copy-muted">{message}</p>
    </div>
  )
}
