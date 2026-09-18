"use client"

import { useCallback, useMemo, useRef, useState } from "react"

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
  submit: () => Promise<void>
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

  // `disabled` only takes effect once a render commits, so two clicks landing in
  // the same frame would both get through. The ref closes that window; reading
  // `isSubmitting` here instead would see a stale value from the click handler's
  // closure.
  const inFlight = useRef(false)

  // Closing leaves the form values in place so they do not flicker during the
  // dialog's exit animation; every open resets what it needs. `isSubmitting` is
  // deliberately not cleared here — see `submit`.
  const closeDialog = useCallback(() => {
    setActiveDialog(null)
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

  // Persistence lands with the project API slice; the await point below is the
  // only thing still missing. `isSubmitting` stays set past the close and is
  // cleared by the next open rather than here, because clearing it in the same
  // batch that sets it would mean no render ever observes it — which would make
  // every `disabled={... || isSubmitting}` on the confirm buttons decorative.
  const submit = useCallback(async () => {
    if (inFlight.current) return
    inFlight.current = true
    setIsSubmitting(true)

    try {
      // TODO(project-api): await the create/rename/delete request here.
    } finally {
      inFlight.current = false
      setActiveDialog(null)
    }
  }, [])

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
