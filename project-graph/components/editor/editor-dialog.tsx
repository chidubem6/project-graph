"use client"

import type { ReactNode, RefObject } from "react"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

interface EditorDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: string
  /** Action buttons, rendered right-aligned in the footer. */
  footer?: ReactNode
  /** Element to focus when the dialog opens. Defaults to the first tabbable one. */
  initialFocus?: RefObject<HTMLElement | null>
  children?: ReactNode
}

// The shared dialog pattern for the editor: the stock shadcn Dialog restyled with
// design tokens here, so components/ui/dialog.tsx stays as generated.
export function EditorDialog({
  open,
  onOpenChange,
  title,
  description,
  footer,
  initialFocus,
  children,
}: EditorDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        initialFocus={initialFocus}
        className="gap-5 rounded-3xl border border-surface-border bg-elevated/95 p-6 text-copy-primary ring-0 backdrop-blur-md sm:max-w-md"
      >
        <DialogHeader>
          <DialogTitle className="text-copy-primary">{title}</DialogTitle>
          {description && (
            <DialogDescription className="text-copy-muted">
              {description}
            </DialogDescription>
          )}
        </DialogHeader>

        {children}

        {footer && (
          <DialogFooter className="-mx-6 -mb-6 rounded-b-3xl border-surface-border bg-surface px-6 py-4">
            {footer}
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  )
}
