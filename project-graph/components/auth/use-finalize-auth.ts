"use client"

import { useSignIn, useSignUp } from "@clerk/nextjs"
import { useRouter } from "next/navigation"

// Both flows end in the same place, so the only thing that differs between
// the two helpers is which resource is being finalized. Both return finalize's
// `{ error }` so the calling screen can surface it in its own wording.
export function useFinalizeAuth() {
  const { signIn } = useSignIn()
  const { signUp } = useSignUp()
  const router = useRouter()

  const navigateTo = (url: string) => {
    if (url.startsWith("http")) {
      window.location.href = url
    } else {
      router.push(url)
    }
  }

  const navigateToDashboard = (decorateUrl: (url: string) => string) => {
    navigateTo(decorateUrl("/dashboard"))
  }

  const finalizeSignIn = () => {
    return signIn.finalize({
      navigate: ({ session, decorateUrl }) => {
        if (session?.currentTask) {
          // Session tasks are not enabled for this app right now, so this path
          // is unexpected. Keep it loud instead of routing to task UI that does
          // not exist yet.
          // See https://clerk.com/docs/guides/development/custom-flows/authentication/session-tasks
          console.error("Unhandled session task:", session.currentTask)
          return
        }

        navigateToDashboard(decorateUrl)
      },
    })
  }

  const finalizeSignUp = () => {
    return signUp.finalize({
      navigate: ({ session, decorateUrl }) => {
        if (session?.currentTask) {
          // Session tasks are not enabled for this app right now, so this path
          // is unexpected. Keep it loud instead of routing to task UI that does
          // not exist yet.
          // See https://clerk.com/docs/guides/development/custom-flows/authentication/session-tasks
          console.error("Unhandled session task:", session.currentTask)
          return
        }

        navigateToDashboard(decorateUrl)
      },
    })
  }

  return { finalizeSignIn, finalizeSignUp, navigateToDashboard }
}
