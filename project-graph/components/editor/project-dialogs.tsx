"use client"

import { useRef } from "react"

import { EditorDialog } from "@/components/editor/editor-dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import type { ProjectDialogsState } from "@/hooks/use-project-dialogs"

const RENAME_FORM_ID = "rename-project-form"

interface ProjectDialogsProps {
  dialogs: ProjectDialogsState
}

// Every project dialog, driven by one hook. Mounted once by the editor
// workspace; which one is visible follows `dialogs.activeDialog`.
export function ProjectDialogs({ dialogs }: ProjectDialogsProps) {
  const renameInputRef = useRef<HTMLInputElement>(null)
  const {
    activeDialog,
    targetProject,
    name,
    slug,
    isSubmitting,
    setName,
    closeDialog,
    submit,
  } = dialogs

  const handleOpenChange = (open: boolean) => {
    if (!open) closeDialog()
  }

  const cancelButton = (
    <Button
      variant="ghost"
      size="lg"
      onClick={closeDialog}
      className="text-copy-muted hover:text-copy-primary"
    >
      Cancel
    </Button>
  )

  return (
    <>
      <EditorDialog
        open={activeDialog === "create"}
        onOpenChange={handleOpenChange}
        title="New project"
        description="Name your architecture workspace."
        footer={
          <>
            {cancelButton}
            {/* Gated on the name, not the slug: an unsluggable name still gets a
                `project-<hash>` fallback, and gating on the slug used to leave
                this button permanently inert with nothing explaining why. */}
            <Button
              size="lg"
              onClick={submit}
              disabled={!name.trim() || isSubmitting}
            >
              Create project
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-2">
          <Label htmlFor="create-project-name" className="text-copy-secondary">
            Project name
          </Label>
          <Input
            id="create-project-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Checkout Platform"
            autoComplete="off"
            className="h-10 rounded-xl"
          />
          <p className="text-xs text-copy-muted">
            Slug{" "}
            <span className="font-mono text-copy-secondary">{slug || "—"}</span>
          </p>
        </div>
      </EditorDialog>

      <EditorDialog
        open={activeDialog === "rename"}
        onOpenChange={handleOpenChange}
        title="Rename project"
        description={
          targetProject
            ? `Currently named "${targetProject.name}".`
            : "Currently unnamed."
        }
        initialFocus={renameInputRef}
        footer={
          <>
            {cancelButton}
            <Button
              type="submit"
              form={RENAME_FORM_ID}
              size="lg"
              disabled={!name.trim() || isSubmitting}
            >
              Save name
            </Button>
          </>
        }
      >
        <form
          id={RENAME_FORM_ID}
          onSubmit={(event) => {
            event.preventDefault()
            if (!name.trim() || isSubmitting) return
            submit()
          }}
          className="flex flex-col gap-2"
        >
          <Label htmlFor="rename-project-name" className="text-copy-secondary">
            Project name
          </Label>
          <Input
            id="rename-project-name"
            ref={renameInputRef}
            value={name}
            onChange={(event) => setName(event.target.value)}
            autoComplete="off"
            className="h-10 rounded-xl"
          />
        </form>
      </EditorDialog>

      <EditorDialog
        open={activeDialog === "delete"}
        onOpenChange={handleOpenChange}
        title="Delete project"
        description={
          targetProject
            ? `"${targetProject.name}" and its canvas will be permanently deleted. This cannot be undone.`
            : "This project and its canvas will be permanently deleted. This cannot be undone."
        }
        footer={
          <>
            {cancelButton}
            <Button
              variant="destructive"
              size="lg"
              onClick={submit}
              disabled={isSubmitting}
            >
              Delete project
            </Button>
          </>
        }
      />
    </>
  )
}
