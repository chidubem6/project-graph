"use client"

import { useCallback, useEffect, useRef, useState } from "react"

import {
  fetchCollaborators,
  inviteCollaborator,
  removeCollaborator,
} from "@/lib/projects/requests"
import type { Collaborator } from "@/types/collaborator"

/* How long the copy button reads "Copied!" */
const COPIED_FEEDBACK_MS = 2000

/** Share dialog state and handlers returned by `useShareDialog` */
export interface ShareDialogState {
  isOpen: boolean
  /** Null until the first load for this room finishes. */
  collaborators: Collaborator[] | null
  /** A failed load, removal or copy; shown above the list. */
  error: string | null
  /** Invite form input. */
  email: string
  isInviting: boolean
  /** A failed invite; shown under the form. */
  inviteError: string | null
  /** Collaborators with a removal in flight. */
  removingIds: ReadonlySet<string>
  /** True for a moment after the link is copied. */
  isLinkCopied: boolean
  setEmail: (email: string) => void
  open: () => void
  close: () => void
  invite: () => Promise<void>
  remove: (collaborator: Collaborator) => Promise<void>
  copyLink: () => Promise<void>
}

/**
 * Owns the share dialog for the open room: its collaborator list, the invite
 * form and the copy-link feedback. Every open reloads the list, since other
 * people may have changed it. `projectId` is null outside a room, where the
 * handlers do nothing.
 */
export function useShareDialog(projectId: string | null): ShareDialogState {
  const [isOpen, setIsOpen] = useState(false)
  const [collaborators, setCollaborators] = useState<Collaborator[] | null>(
    null
  )
  const [error, setError] = useState<string | null>(null)
  const [email, setEmail] = useState("")
  const [isInviting, setIsInviting] = useState(false)
  const [inviteError, setInviteError] = useState<string | null>(null)
  const [removingIds, setRemovingIds] = useState<ReadonlySet<string>>(
    () => new Set()
  )
  const [isLinkCopied, setIsLinkCopied] = useState(false)

  /*
   * Bumped by every load and every successful change, so a list fetched before
   * an invite or removal can't land afterwards and undo it.
   */
  const listVersion = useRef(0)
  /* Blocks same-frame double submits that a stale `isInviting` would miss */
  const inviteInFlight = useRef(false)
  const copiedTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  /* Stop the copied timer if the workspace unmounts mid-feedback */
  useEffect(
    () => () => {
      if (copiedTimer.current) clearTimeout(copiedTimer.current)
    },
    []
  )

  /** Open the dialog and reload the collaborator list */
  const open = useCallback(() => {
    if (!projectId) return
    setIsOpen(true)
    setError(null)
    setInviteError(null)

    /* Keep showing the previous list while the fresh one loads */
    const version = ++listVersion.current
    fetchCollaborators(projectId).then(
      (list) => {
        if (version === listVersion.current) setCollaborators(list)
      },
      (caught: unknown) => {
        if (version === listVersion.current) setError(messageOf(caught))
      }
    )
  }, [projectId])

  /** Close the dialog; in-flight requests still finish and update the list */
  const close = useCallback(() => setIsOpen(false), [])

  /** Invite the typed email, then add them to the list and clear the form */
  const invite = useCallback(async () => {
    /* Wait for the first load: appending to nothing would discard it */
    if (!projectId || collaborators === null) return
    if (inviteInFlight.current || !email.trim()) return
    inviteInFlight.current = true
    setIsInviting(true)
    setInviteError(null)

    try {
      const collaborator = await inviteCollaborator(projectId, email)
      listVersion.current++
      setCollaborators((list) => [...(list ?? []), collaborator])
      setEmail("")
    } catch (caught) {
      setInviteError(messageOf(caught))
    } finally {
      inviteInFlight.current = false
      setIsInviting(false)
    }
  }, [collaborators, email, projectId])

  /** Remove a collaborator, then drop them from the list */
  const remove = useCallback(
    async (collaborator: Collaborator) => {
      if (!projectId || removingIds.has(collaborator.id)) return
      setRemovingIds((ids) => new Set(ids).add(collaborator.id))
      setError(null)

      try {
        await removeCollaborator(projectId, collaborator.id)
        listVersion.current++
        setCollaborators(
          (list) => list?.filter(({ id }) => id !== collaborator.id) ?? null
        )
      } catch (caught) {
        setError(messageOf(caught))
      } finally {
        setRemovingIds((ids) => {
          const next = new Set(ids)
          next.delete(collaborator.id)
          return next
        })
      }
    },
    [projectId, removingIds]
  )

  /** Copy the room's URL and show "Copied!" briefly */
  const copyLink = useCallback(async () => {
    if (!projectId) return
    const link = `${window.location.origin}/editor/${encodeURIComponent(projectId)}`

    try {
      await navigator.clipboard.writeText(link)
    } catch {
      /* Denied permission or an insecure context */
      setError("Couldn't copy the link. Copy it from the address bar instead.")
      return
    }

    /* Restart the timer so repeated clicks keep the feedback up */
    if (copiedTimer.current) clearTimeout(copiedTimer.current)
    setIsLinkCopied(true)
    copiedTimer.current = setTimeout(
      () => setIsLinkCopied(false),
      COPIED_FEEDBACK_MS
    )
  }, [projectId])

  return {
    isOpen,
    collaborators,
    error,
    email,
    isInviting,
    inviteError,
    removingIds,
    isLinkCopied,
    setEmail,
    open,
    close,
    invite,
    remove,
    copyLink,
  }
}

/* A request error's message, or a generic one for anything else thrown */
function messageOf(caught: unknown): string {
  return caught instanceof Error ? caught.message : "Something went wrong."
}
