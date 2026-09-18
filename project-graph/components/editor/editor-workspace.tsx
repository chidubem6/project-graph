"use client"

import { useState } from "react"

import { EditorHome } from "@/components/editor/editor-home"
import { EditorNavbar } from "@/components/editor/editor-navbar"
import { ProjectDialogs } from "@/components/editor/project-dialogs"
import { ProjectSidebar } from "@/components/editor/project-sidebar"
import { useProjectActions } from "@/hooks/use-project-actions"
import type { Project } from "@/types/project"

interface EditorWorkspaceProps {
  myProjects: Project[]
  sharedProjects: Project[]
  /** The open project on /editor/[projectId]; omitted on the editor home. */
  activeProject?: Project
}

export function EditorWorkspace({
  myProjects,
  sharedProjects,
  activeProject,
}: EditorWorkspaceProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const actions = useProjectActions()

  return (
    <div className="flex h-svh flex-col bg-base">
      <EditorNavbar
        isSidebarOpen={isSidebarOpen}
        onToggleSidebar={() => setIsSidebarOpen((open) => !open)}
        projectName={activeProject?.name}
      />
      <div className="relative flex-1 overflow-hidden">
        {/* The canvas mounts here in a later spec; until then an open project
            shows an empty workspace. */}
        {!activeProject && <EditorHome onCreateProject={actions.openCreate} />}
        <ProjectSidebar
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
          myProjects={myProjects}
          sharedProjects={sharedProjects}
          onCreateProject={actions.openCreate}
          onRenameProject={actions.openRename}
          onDeleteProject={actions.openDelete}
        />
      </div>

      <ProjectDialogs dialogs={actions} />
    </div>
  )
}
