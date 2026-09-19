"use client"

import { useState } from "react"

import { AiSidebar } from "@/components/editor/ai-sidebar"
import { CanvasPlaceholder } from "@/components/editor/canvas-placeholder"
import { EditorHome } from "@/components/editor/editor-home"
import { EditorNavbar } from "@/components/editor/editor-navbar"
import { ProjectDialogs } from "@/components/editor/project-dialogs"
import { ProjectSidebar } from "@/components/editor/project-sidebar"
import { ShareDialog } from "@/components/editor/share-dialog"
import { useProjectActions } from "@/hooks/use-project-actions"
import { useShareDialog } from "@/hooks/use-share-dialog"
import type { Project } from "@/types/project"

interface EditorWorkspaceProps {
  myProjects: Project[]
  sharedProjects: Project[]
  /** The open room on /editor/[roomId]; omitted on the editor home. */
  activeProject?: Project
}

export function EditorWorkspace({
  myProjects,
  sharedProjects,
  activeProject,
}: EditorWorkspaceProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [isAiSidebarOpen, setIsAiSidebarOpen] = useState(false)
  const actions = useProjectActions()
  const share = useShareDialog(activeProject?.id ?? null)

  /* Ownership is the list a project came from, as in the sidebar */
  const isOwner =
    activeProject !== undefined &&
    myProjects.some((project) => project.id === activeProject.id)

  return (
    <div className="flex h-svh flex-col bg-base">
      <EditorNavbar
        isSidebarOpen={isSidebarOpen}
        onToggleSidebar={() => setIsSidebarOpen((open) => !open)}
        room={
          activeProject && {
            name: activeProject.name,
            isAiSidebarOpen,
            onToggleAiSidebar: () => setIsAiSidebarOpen((open) => !open),
            onOpenShare: share.open,
          }
        }
      />
      {/* Fills the space under the navbar; both sidebars float over it. */}
      <div className="relative flex-1 overflow-hidden">
        {activeProject ? (
          <CanvasPlaceholder projectName={activeProject.name} />
        ) : (
          <EditorHome onCreateProject={actions.openCreate} />
        )}
        <ProjectSidebar
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
          myProjects={myProjects}
          sharedProjects={sharedProjects}
          activeProjectId={activeProject?.id}
          onCreateProject={actions.openCreate}
          onRenameProject={actions.openRename}
          onDeleteProject={actions.openDelete}
        />
        {activeProject && (
          <AiSidebar
            isOpen={isAiSidebarOpen}
            onClose={() => setIsAiSidebarOpen(false)}
          />
        )}
      </div>

      <ProjectDialogs dialogs={actions} />
      {activeProject && (
        <ShareDialog share={share} project={activeProject} isOwner={isOwner} />
      )}
    </div>
  )
}
