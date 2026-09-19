"use client"

import { useParams, useRouter } from "next/navigation"
import { useCallback, useMemo, useRef, useState } from "react"

import { createProjectIdSuffix, toProjectId } from "@/lib/projects/id"
import {
  ApiError,
  createProject,
  deleteProject,
  renameProject,
} from "@/lib/projects/requests"
import type { Project } from "@/types/project"

/** The project dialogs the actions hook can open */
export type ProjectDialogKind = "create" | "rename" | "delete"

/** Dialog state and handlers returned by `useProjectActions` */
export interface ProjectActionsState {
  /** Which dialog is currently open, or null when none is. */
  activeDialog: ProjectDialogKind | null
  /** The project a rename or delete acts on; null while creating. */
  targetProject: Project | null
  /** Shared name input value for the create and rename forms. */
  name: string
  /** Live project/room ID derived from `name`; what create will submit. */
  roomId: string
  isSubmitting: boolean
  /** The last failed request's message, shown in the open dialog. */
  error: string | null
  setName: (name: string) => void
  openCreate: () => void
  openRename: (project: Project) => void
  openDelete: (project: Project) => void
  closeDialog: () => void
  submit: () => Promise<void>
}

/**
 * Owns the dialog, form and loading state for project create/rename/delete, and
 * sends each one to the project API. Kept out of the sidebar and the editor home
 * so both can open the same dialogs.
 */
export function useProjectActions(): ProjectActionsState {
  const router = useRouter()

  /* Only set inside /editor/[projectId], so deleting that project can leave the page */
  const { projectId: activeProjectId } = useParams<{ projectId?: string }>()

  /* Track which dialog is open, what it targets, and the form's state */
  const [activeDialog, setActiveDialog] = useState<ProjectDialogKind | null>(
    null
  )
  const [targetProject, setTargetProject] = useState<Project | null>(null)
  const [name, setName] = useState("")
  /* Drawn once per create dialog, so the previewed room ID is the one submitted */
  const [idSuffix, setIdSuffix] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  /* Preview the room ID the new project will get as the user types */
  const roomId = useMemo(() => toProjectId(name, idSuffix), [name, idSuffix])

  /*
   * Set for the whole request. Blocks same-frame double clicks that `disabled` and
   * stale `isSubmitting` miss, and locks the dialog so a pending completion can
   * only ever close the dialog that started it.
   */
  const inFlight = useRef(false)

  /** Close the open dialog, keeping form values so the exit animation doesn't flicker */
  const closeDialog = useCallback(() => {
    /* Cancel, Escape and the backdrop all land here; ignore them mid-request */
    if (inFlight.current) return
    setActiveDialog(null)
  }, [])

  /** Open the create dialog with an empty name and a fresh room ID */
  const openCreate = useCallback(() => {
    if (inFlight.current) return
    setTargetProject(null)
    setName("")
    setIdSuffix(createProjectIdSuffix())
    setIsSubmitting(false)
    setError(null)
    setActiveDialog("create")
  }, [])

  /** Open the rename dialog prefilled with the project's current name */
  const openRename = useCallback((project: Project) => {
    if (inFlight.current) return
    setTargetProject(project)
    setName(project.name)
    setIsSubmitting(false)
    setError(null)
    setActiveDialog("rename")
  }, [])

  /** Open the delete confirmation for the given project */
  const openDelete = useCallback((project: Project) => {
    if (inFlight.current) return
    setTargetProject(project)
    setIsSubmitting(false)
    setError(null)
    setActiveDialog("delete")
  }, [])

  /** Send the open dialog's action; on success `isSubmitting` stays set until the next open */
  const submit = useCallback(async () => {
    /* Ignore repeat submits and submits with no dialog open */
    if (inFlight.current || activeDialog === null) return
    inFlight.current = true
    setIsSubmitting(true)
    setError(null)

    try {
      if (activeDialog === "create") {
        /* Create the project, then open it in the editor */
        const project = await createProject({ id: roomId, name })
        setActiveDialog(null)
        router.push(`/editor/${project.id}`)
      } else if (targetProject && activeDialog === "rename") {
        /* Rename the project, then refresh to show the new name */
        await renameProject(targetProject.id, name)
        setActiveDialog(null)
        router.refresh()
      } else if (targetProject && activeDialog === "delete") {
        /* Delete the project, leaving its workspace if it's the one open */
        await deleteProject(targetProject.id)
        setActiveDialog(null)
        if (targetProject.id === activeProjectId) {
          /* Replace, so Back does not return to a workspace that no longer exists */
          router.replace("/editor")
        } else {
          router.refresh()
        }
      }
    } catch (caught) {
      /* Keep the dialog open with the error and re-enable the button */
      setError(
        caught instanceof Error ? caught.message : "Something went wrong."
      )
      setIsSubmitting(false)

      /* The room ID is taken, so draw a new one for the next attempt */
      if (
        activeDialog === "create" &&
        caught instanceof ApiError &&
        caught.status === 409
      ) {
        setIdSuffix(createProjectIdSuffix())
      }
    } finally {
      /* Allow the next submit */
      inFlight.current = false
    }
  }, [activeDialog, activeProjectId, name, roomId, router, targetProject])

  return {
    activeDialog,
    targetProject,
    name,
    roomId,
    isSubmitting,
    error,
    setName,
    openCreate,
    openRename,
    openDelete,
    closeDialog,
    submit,
  }
}
