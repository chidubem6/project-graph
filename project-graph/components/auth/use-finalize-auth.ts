'use client'

import { useSignIn, useSignUp } from '@clerk/nextjs'
import { useRouter } from 'next/navigation'
import React from 'react'

// Both flows end in the same place, so the only thing that differs between
// the two helpers is which resource is being finalized.
export function useFinalizeAuth() {
  const { signIn } = useSignIn()
  const { signUp } = useSignUp()
  const router = useRouter()

  const navigateTo = React.useCallback(
    (url: string) => {
      if (url.startsWith('http')) {
        window.location.href = url
      } else {
        router.push(url)
      }
    },
    [router],
  )

  const finalizeSignIn = React.useCallback(async () => {
    await signIn.finalize({
      navigate: ({ session, decorateUrl }) => {
        if (session?.currentTask) {
          // Handle pending session tasks
          // See https://clerk.com/docs/guides/development/custom-flows/authentication/session-tasks
          console.log(session?.currentTask)
          return
        }

        navigateTo(decorateUrl('/dashboard'))
      },
    })
  }, [signIn, navigateTo])

  const finalizeSignUp = React.useCallback(async () => {
    await signUp.finalize({
      navigate: ({ session, decorateUrl }) => {
        if (session?.currentTask) {
          // Handle pending session tasks
          // See https://clerk.com/docs/guides/development/custom-flows/authentication/session-tasks
          console.log(session?.currentTask)
          return
        }

        navigateTo(decorateUrl('/dashboard'))
      },
    })
  }, [signUp, navigateTo])

  return { finalizeSignIn, finalizeSignUp }
}
