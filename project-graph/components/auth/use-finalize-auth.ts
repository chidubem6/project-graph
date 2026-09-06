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

  const finalizeSignIn = () => {
    return signIn.finalize({
      navigate: ({ session, decorateUrl }) => {
        if (session?.currentTask) {
          // Not handled yet: tasks can be switched on from the Clerk dashboard
          // without a code change, so log loudly if one ever shows up here.
          // See https://clerk.com/docs/guides/development/custom-flows/authentication/session-tasks
          console.error("Unhandled session task:", session.currentTask)
          return
        }

        navigateTo(decorateUrl("/dashboard"))
      },
    })
  }

  const finalizeSignUp = () => {
    return signUp.finalize({
      navigate: ({ session, decorateUrl }) => {
        if (session?.currentTask) {
          // Not handled yet: tasks can be switched on from the Clerk dashboard
          // without a code change, so log loudly if one ever shows up here.
          // See https://clerk.com/docs/guides/development/custom-flows/authentication/session-tasks
          console.error("Unhandled session task:", session.currentTask)
          return
        }

        navigateTo(decorateUrl("/dashboard"))
      },
    })
  }

  return { finalizeSignIn, finalizeSignUp }
}
