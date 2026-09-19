"use client"

import { CheckIcon, LinkIcon, UserMinusIcon } from "lucide-react"

import { EditorDialog } from "@/components/editor/editor-dialog"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Spinner } from "@/components/ui/spinner"
import type { ShareDialogState } from "@/hooks/use-share-dialog"
import type { Collaborator } from "@/types/collaborator"
import type { Project } from "@/types/project"

interface ShareDialogProps {
  share: ShareDialogState
  project: Project
  /** Owners manage access; collaborators only see the list. The API enforces the same. */
  isOwner: boolean
}

// The room's share dialog, driven by `useShareDialog`. Mounted once by the
// editor workspace while a room is open.
export function ShareDialog({ share, project, isOwner }: ShareDialogProps) {
  const {
    isOpen,
    collaborators,
    error,
    email,
    isInviting,
    inviteError,
    removingIds,
    isLinkCopied,
    setEmail,
    close,
    invite,
    remove,
    copyLink,
  } = share

  const doneButton = (
    <Button
      variant="ghost"
      size="lg"
      onClick={close}
      className="text-copy-muted hover:text-copy-primary"
    >
      Done
    </Button>
  )

  return (
    <EditorDialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) close()
      }}
      title="Share project"
      description={
        isOwner
          ? `Invite people to "${project.name}" by email.`
          : `People with access to "${project.name}". Only the owner can manage access.`
      }
      footer={
        isOwner ? (
          <>
            <Button variant="outline" size="lg" onClick={copyLink}>
              {isLinkCopied ? (
                <CheckIcon data-icon="inline-start" className="size-4 text-success" />
              ) : (
                <LinkIcon data-icon="inline-start" className="size-4" />
              )}
              {isLinkCopied ? "Copied!" : "Copy link"}
            </Button>
            {doneButton}
          </>
        ) : (
          doneButton
        )
      }
    >
      {/* Announces the copy, since the button's label change alone may not be read out */}
      <span aria-live="polite" className="sr-only">
        {isLinkCopied ? "Link copied" : ""}
      </span>

      {isOwner && (
        <form
          onSubmit={(event) => {
            event.preventDefault()
            invite()
          }}
          className="flex flex-col gap-2"
        >
          <Label htmlFor="invite-collaborator-email" className="text-copy-secondary">
            Email
          </Label>
          <div className="flex gap-2">
            <Input
              id="invite-collaborator-email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="teammate@company.com"
              autoComplete="off"
              aria-invalid={inviteError ? true : undefined}
              aria-describedby={inviteError ? "invite-collaborator-error" : undefined}
              className="h-10 flex-1 rounded-xl"
            />
            {/* Waits for the list, so an invite can't race the first load */}
            <Button
              type="submit"
              size="lg"
              disabled={!email.trim() || isInviting || collaborators === null}
              className="h-10 rounded-xl"
            >
              Invite
            </Button>
          </div>
          {inviteError && (
            <p id="invite-collaborator-error" role="alert" className="text-xs text-error">
              {inviteError}
            </p>
          )}
        </form>
      )}

      <section aria-labelledby="collaborators-heading" className="flex flex-col gap-2">
        <h3 id="collaborators-heading" className="text-xs font-medium text-copy-muted">
          Collaborators
        </h3>
        {error && (
          <p role="alert" className="text-xs text-error">
            {error}
          </p>
        )}
        <CollaboratorList
          collaborators={collaborators}
          removingIds={removingIds}
          onRemove={isOwner ? remove : undefined}
        />
      </section>
    </EditorDialog>
  )
}

interface CollaboratorListProps {
  collaborators: Collaborator[] | null
  removingIds: ReadonlySet<string>
  /** Omitted for collaborators, which leaves the list read-only. */
  onRemove?: (collaborator: Collaborator) => void
}

function CollaboratorList({ collaborators, removingIds, onRemove }: CollaboratorListProps) {
  if (collaborators === null) {
    return (
      <div className="flex items-center gap-2 py-3 text-sm text-copy-muted">
        <Spinner />
        Loading collaborators…
      </div>
    )
  }

  if (collaborators.length === 0) {
    return <p className="py-3 text-sm text-copy-muted">No collaborators yet.</p>
  }

  return (
    <ul className="-mx-2 flex max-h-64 flex-col overflow-y-auto">
      {collaborators.map((collaborator) => {
        const label = collaborator.name ?? collaborator.email
        const isRemoving = removingIds.has(collaborator.id)
        return (
          <li
            key={collaborator.id}
            className="flex items-center gap-3 rounded-xl px-2 py-2 hover:bg-subtle"
          >
            <Avatar className="after:border-surface-border">
              {collaborator.imageUrl && (
                <AvatarImage src={collaborator.imageUrl} alt="" />
              )}
              <AvatarFallback className="bg-subtle text-xs text-copy-secondary">
                {initialsOf(label)}
              </AvatarFallback>
            </Avatar>
            <div className="flex min-w-0 flex-1 flex-col">
              <span className="truncate text-sm text-copy-primary">{label}</span>
              {/* With a Clerk name, the email moves to a second line */}
              {collaborator.name && (
                <span className="truncate text-xs text-copy-muted">{collaborator.email}</span>
              )}
            </div>
            {onRemove && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onRemove(collaborator)}
                disabled={isRemoving}
                aria-label={`Remove ${label}`}
                className="text-copy-muted hover:text-error"
              >
                {isRemoving ? <Spinner /> : <UserMinusIcon className="size-4" />}
              </Button>
            )}
          </li>
        )
      })}
    </ul>
  )
}

/* Up to two initials from a name, or the first letter of an email */
function initialsOf(label: string): string {
  const words = label.includes("@") ? [label] : label.split(/\s+/).filter(Boolean)
  return words
    .slice(0, 2)
    /* Spread by code point, so an emoji initial isn't split in half */
    .map((word) => [...word][0])
    .join("")
    .toUpperCase()
}
