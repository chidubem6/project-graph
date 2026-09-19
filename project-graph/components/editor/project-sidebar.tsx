"use client"

import type { LucideIcon } from "lucide-react"
import {
  FolderIcon,
  PencilIcon,
  PlusIcon,
  Trash2Icon,
  UsersIcon,
  XIcon,
} from "lucide-react"
import Link from "next/link"
import { cn } from "cn"

import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import type { Project } from "@/types/project"

interface ProjectSidebarProps {
  isOpen: boolean
  onClose: () => void
  myProjects: Project[]
  sharedProjects: Project[]
  /** The room open on /editor/[roomId], highlighted in whichever list holds it */
  activeProjectId?: string
  onCreateProject: () => void
  onRenameProject: (project: Project) => void
  onDeleteProject: (project: Project) => void
}

/** Projects panel that floats over the canvas inside the editor workspace */
export function ProjectSidebar({
  isOpen,
  onClose,
  myProjects,
  sharedProjects,
  activeProjectId,
  onCreateProject,
  onRenameProject,
  onDeleteProject,
}: ProjectSidebarProps) {
  return (
    <>
      {/* Mobile only: dims the canvas and closes the sidebar on an outside tap */}
      <div
        aria-hidden="true"
        onClick={onClose}
        className={cn(
          "absolute inset-0 z-30 bg-black/60 transition-opacity duration-200 md:hidden",
          isOpen ? "opacity-100" : "pointer-events-none opacity-0"
        )}
      />

      <aside
        aria-label="Projects"
        /* inert hides it from screen readers; aria-hidden would warn while focused */
        inert={!isOpen}
        className={cn(
          "absolute inset-y-3 left-3 z-40 flex w-72 flex-col rounded-2xl border border-surface-border bg-surface/90 backdrop-blur-md transition-transform duration-200 ease-out",
          isOpen ? "translate-x-0" : "-translate-x-[calc(100%+0.75rem)]"
        )}
      >
        {/* Header with the panel title and close button */}
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

        {/* Switch between owned and shared projects */}
        <Tabs defaultValue="my-projects" className="min-h-0 flex-1 p-3">
          <TabsList className="w-full bg-elevated">
            <TabsTrigger value="my-projects">My Projects</TabsTrigger>
            <TabsTrigger value="shared">Shared</TabsTrigger>
          </TabsList>

          {/* Projects the user owns, with rename and delete actions */}
          <TabsContent value="my-projects" className="flex min-h-0">
            {myProjects.length === 0 ? (
              <SidebarEmptyState icon={FolderIcon} message="No projects yet." />
            ) : (
              <ProjectList
                projects={myProjects}
                activeProjectId={activeProjectId}
                onRenameProject={onRenameProject}
                onDeleteProject={onDeleteProject}
              />
            )}
          </TabsContent>

          {/* Projects other people have shared with the user */}
          <TabsContent value="shared" className="flex min-h-0">
            {sharedProjects.length === 0 ? (
              <SidebarEmptyState
                icon={UsersIcon}
                message="No projects shared with you."
              />
            ) : (
              /* Collaborators cannot rename or delete, so no actions here */
              <ProjectList
                projects={sharedProjects}
                activeProjectId={activeProjectId}
              />
            )}
          </TabsContent>
        </Tabs>

        {/* Start a new project */}
        <div className="shrink-0 border-t border-surface-border p-3">
          <Button size="lg" className="w-full" onClick={onCreateProject}>
            <PlusIcon data-icon="inline-start" className="h-5 w-5" />
            New Project
          </Button>
        </div>
      </aside>
    </>
  )
}

interface ProjectListProps {
  projects: Project[]
  activeProjectId?: string
  /** Owner-only actions, omitted for shared projects */
  onRenameProject?: (project: Project) => void
  onDeleteProject?: (project: Project) => void
}

/** Scrollable list of projects that highlights the one open in the editor */
function ProjectList({
  projects,
  activeProjectId,
  onRenameProject,
  onDeleteProject,
}: ProjectListProps) {
  return (
    <ul className="flex w-full flex-col gap-1 overflow-y-auto">
      {projects.map((project) => {
        /* Mark the project currently open in the editor */
        const isActive = project.id === activeProjectId

        return (
          <li
            key={project.id}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "flex items-center gap-1 rounded-xl px-3 py-2",
              isActive ? "bg-accent-dim" : "hover:bg-subtle"
            )}
          >
            {/* Opens the project's room; works the same for owned and shared */}
            <Link
              href={`/editor/${project.id}`}
              className={cn(
                "min-w-0 flex-1 truncate rounded-md text-sm outline-none focus-visible:ring-2 focus-visible:ring-brand",
                isActive
                  ? "font-medium text-brand"
                  : "text-copy-secondary hover:text-copy-primary"
              )}
            >
              {project.name}
            </Link>

            {/* Rename and delete only appear for projects the user owns */}
            {onRenameProject && (
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => onRenameProject(project)}
                aria-label={`Rename ${project.name}`}
                className="text-copy-faint hover:text-copy-primary"
              >
                <PencilIcon className="h-4 w-4" />
              </Button>
            )}
            {onDeleteProject && (
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => onDeleteProject(project)}
                aria-label={`Delete ${project.name}`}
                className="text-copy-faint hover:text-error"
              >
                <Trash2Icon className="h-4 w-4" />
              </Button>
            )}
          </li>
        )
      })}
    </ul>
  )
}

interface SidebarEmptyStateProps {
  icon: LucideIcon
  message: string
}

/** Placeholder shown when a project tab has nothing to list */
function SidebarEmptyState({ icon: Icon, message }: SidebarEmptyStateProps) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-surface-border px-4 py-10 text-center">
      <Icon className="h-8 w-8 text-copy-faint" />
      <p className="text-sm text-copy-muted">{message}</p>
    </div>
  )
}
