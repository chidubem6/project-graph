"use client"

import { useCallback, useMemo, useState } from "react"

import { toProjectSlug } from "@/lib/project-slug"
import type { Project } from "@/types/project"

export type ProjectDialogKind = "create" | "rename" | "delete"

export interface ProjectDialogsState {
  /** Which dialog is currently open, or null when none is. */
  activeDialog: ProjectDialogKind | null
  /** The project a rename or delete acts on; null while creating. */
  targetProject: Project | null
  /** Shared name input value for the create and rename forms. */
  name: string
  /** Live slug derived from `name`. */
  slug: string
  isSubmitting: boolean
  setName: (name: string) => void
  openCreate: () => void
  openRename: (project: Project) => void
  openDelete: (project: Project) => void
  closeDialog: () => void
  submit: () => void
}

/**
 * Owns the dialog, form and loading state for project create/rename/delete.
 * State is deliberately kept out of the sidebar and the editor home so both can
 * open the same dialogs.
 */
export function useProjectDialogs(): ProjectDialogsState {
  const [activeDialog, setActiveDialog] = useState<ProjectDialogKind | null>(
    null
  )
  const [targetProject, setTargetProject] = useState<Project | null>(null)
  const [name, setName] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  const slug = useMemo(() => toProjectSlug(name), [name])

  // Closing leaves the form values in place so they do not flicker during the
  // dialog's exit animation; every open resets what it needs.
  const closeDialog = useCallback(() => {
    setActiveDialog(null)
    setIsSubmitting(false)
  }, [])

  const openCreate = useCallback(() => {
    setTargetProject(null)
    setName("")
    setIsSubmitting(false)
    setActiveDialog("create")
  }, [])

  const openRename = useCallback((project: Project) => {
    setTargetProject(project)
    setName(project.name)
    setIsSubmitting(false)
    setActiveDialog("rename")
  }, [])

  const openDelete = useCallback((project: Project) => {
    setTargetProject(project)
    setIsSubmitting(false)
    setActiveDialog("delete")
  }, [])

  // Persistence lands with the project API slice. Until then submitting only
  // flips the loading flag and dismisses the dialog.
  const submit = useCallback(() => {
    setIsSubmitting(true)
    closeDialog()
  }, [closeDialog])

  return {
    activeDialog,
    targetProject,
    name,
    slug,
    isSubmitting,
    setName,
    openCreate,
    openRename,
    openDelete,
    closeDialog,
    submit,
  }
}
