'use client'

import { useClerk, useSignIn, useSignUp } from '@clerk/nextjs'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useRef, useState } from 'react'

import { getClerkErrorMessage } from '@/components/auth/get-clerk-error-message'
import { useFinalizeAuth } from '@/components/auth/use-finalize-auth'
import { Button } from '@/components/ui/button'

export default function Page() {
  const clerk = useClerk()
  const { signIn } = useSignIn()
  const { signUp } = useSignUp()
  const router = useRouter()
  const { finalizeSignIn, finalizeSignUp, navigateToDashboard } = useFinalizeAuth()
  const hasRun = useRef(false)
  const [callbackError, setCallbackError] = useState('')

  const navigateToSignIn = useCallback(() => {
    router.push('/sign-in')
  }, [router])

  const handleCallbackError = useCallback((error: unknown, fallback: string) => {
    console.error('SSO callback failed:', error)
    setCallbackError(getClerkErrorMessage(error, fallback))
  }, [])

  useEffect(() => {
    ;(async () => {
      try {
        if (!clerk.loaded || hasRun.current) {
          return
        }
        // Prevent Next.js from re-running this effect when the page is re-rendered during session activation.
        hasRun.current = true

        // If this was a sign-in, and it's complete, there's nothing else to do.
        if (signIn.status === 'complete') {
          const { error } = await finalizeSignIn()
          if (error) {
            handleCallbackError(error, "We couldn't complete sign-in. Please try again.")
          }
          return
        }

        // If the sign-up used an existing account, transfer it to a sign-in.
        if (signUp.isTransferable) {
          const { error: transferError } = await signIn.create({ transfer: true })
          if (transferError) {
            handleCallbackError(transferError, "We couldn't connect this account. Please try again.")
            return
          }

          const signInStatus = signIn.status as typeof signIn.status | 'complete'
          if (signInStatus === 'complete') {
            const { error } = await finalizeSignIn()
            if (error) {
              handleCallbackError(error, "We couldn't complete sign-in. Please try again.")
            }
            return
          }

          // If sign-in is not complete, additional information is needed
          // For this example, we'll navigate back to the sign-in page assuming that it handles these cases
          return navigateToSignIn()
        }

        if (
          signIn.status === 'needs_first_factor' &&
          !signIn.supportedFirstFactors?.every((f) => f.strategy === 'enterprise_sso')
        ) {
          // The sign-in requires the use of a configured first factor, so navigate to the sign-in page
          return navigateToSignIn()
        }

        // If the sign-in used an external account not associated with an existing user, create a sign-up.
        if (signIn.isTransferable) {
          const { error: transferError } = await signUp.create({ transfer: true })
          if (transferError) {
            handleCallbackError(transferError, "We couldn't create your account. Please try again.")
            return
          }

          if (signUp.status === 'complete') {
            const { error } = await finalizeSignUp()
            if (error) {
              handleCallbackError(error, "We couldn't complete account creation. Please try again.")
            }
            return
          }

          if (signUp.status === 'missing_requirements') {
            // See https://clerk.com/docs/guides/development/custom-flows/authentication/oauth-connections#handle-missing-requirements
            return router.push('/sign-in/continue')
          }

          handleCallbackError(
            new Error(`Unexpected sign-up status after transfer: ${signUp.status}`),
            "We couldn't complete account creation. Please try again.",
          )
          return
        }

        // If sign-up is complete, finalize it.
        if (signUp.status === 'complete') {
          const { error } = await finalizeSignUp()
          if (error) {
            handleCallbackError(error, "We couldn't complete account creation. Please try again.")
          }
          return
        }

        // If the sign-in requires MFA or a new password
        // For this example, we'll navigate back to the sign-in page assuming that it handles these cases
        if (signIn.status === 'needs_second_factor' || signIn.status === 'needs_new_password') {
          return navigateToSignIn()
        }

        // The external account used to sign-in or sign-up was already associated with an existing user and active
        // session on this client, so activate the session and navigate to the application.
        if (signIn.existingSession || signUp.existingSession) {
          const sessionId = signIn.existingSession?.sessionId || signUp.existingSession?.sessionId
          if (sessionId) {
            // Because we're activating a session that's not the result of a sign-in or sign-up, we need to use the
            // Clerk `setActive` API instead of the `finalize` API.
            await clerk.setActive({
              session: sessionId,
              navigate: async ({ session, decorateUrl }) => {
                // Handle session tasks
                // See https://clerk.com/docs/guides/development/custom-flows/authentication/session-tasks
                if (session?.currentTask) {
                  handleCallbackError(
                    new Error(`Unhandled session task: ${session.currentTask.key}`),
                    'Your account needs an additional setup step before continuing.',
                  )
                  return
                }

                navigateToDashboard(decorateUrl)
              },
            })
            return
          }
        }

        handleCallbackError(
          new Error(
            `Unhandled SSO callback state: signIn=${signIn.status ?? 'null'}, signUp=${signUp.status ?? 'null'}`,
          ),
          "We couldn't complete sign-in. Please try again.",
        )
      } catch (error) {
        handleCallbackError(error, "We couldn't complete sign-in. Please try again.")
      }
    })()
  }, [
    clerk,
    finalizeSignIn,
    finalizeSignUp,
    handleCallbackError,
    navigateToDashboard,
    navigateToSignIn,
    router,
    signIn,
    signUp,
  ])

  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-4 bg-background p-6 text-center">
      {callbackError && (
        <div className="flex w-full max-w-sm flex-col gap-4">
          <div className="space-y-2">
            <h1 className="text-xl font-bold">Couldn&apos;t continue sign-in</h1>
            <p className="text-sm text-muted-foreground">{callbackError}</p>
          </div>
          <Button type="button" size="lg" onClick={navigateToSignIn}>
            Back to sign in
          </Button>
        </div>
      )}
      {/* Because a sign-in transferred to a sign-up might require captcha verification, make sure to render the
captcha element. */}
      <div id="clerk-captcha"></div>
    </div>
  )
}
