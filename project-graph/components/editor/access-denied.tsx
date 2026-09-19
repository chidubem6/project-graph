import { LockIcon } from "lucide-react"
import Link from "next/link"

import { buttonVariants } from "@/components/ui/button"

// Shown for missing and unauthorized rooms alike, so the copy never confirms
// that a project exists.
export function AccessDenied() {
  return (
    <main className="flex h-svh items-center justify-center bg-base px-6">
      <div className="flex max-w-sm flex-col items-center gap-3 text-center">
        <LockIcon className="h-8 w-8 text-copy-muted" aria-hidden="true" />
        <h1 className="text-xl font-semibold text-copy-primary">
          You don&apos;t have access to this project
        </h1>
        <p className="text-sm text-copy-muted">
          It may have been deleted, or its owner hasn&apos;t shared it with you.
        </p>
        <Link
          href="/editor"
          className={buttonVariants({ size: "lg", className: "mt-2" })}
        >
          Back to projects
        </Link>
      </div>
    </main>
  )
}
