'use client'

import { useSignIn } from '@clerk/nextjs'
import type { OAuthStrategy } from '@clerk/nextjs/types'

import React from 'react'

import { Button } from '@/components/ui/button'
import { Field, FieldError } from '@/components/ui/field'

import { getClerkErrorMessage } from './get-clerk-error-message'
import { GitHubIcon, GoogleIcon } from './social-icons'

export function SocialSignIn() {
  const [activeStrategy, setActiveStrategy] = React.useState<OAuthStrategy | null>(null)
  const [submitError, setSubmitError] = React.useState('')

  const { signIn } = useSignIn()

  const signInWith = async (strategy: OAuthStrategy) => {
    setActiveStrategy(strategy)
    setSubmitError('')

    try {
      const { error } = await signIn.sso({
        strategy,
        redirectCallbackUrl: '/sso-callback',
        redirectUrl: '/dashboard', // Learn more about session tasks at https://clerk.com/docs/guides/development/custom-flows/authentication/session-tasks
      })
      if (error) {
        // See https://clerk.com/docs/guides/development/custom-flows/error-handling
        // for more info on error handling
        setSubmitError(getClerkErrorMessage(error, "We couldn't continue with this provider."))
        console.error(JSON.stringify(error, null, 2))
        return
      }
    } catch (error) {
      console.error('Social sign-in threw before redirect:', error)
      setSubmitError(getClerkErrorMessage(error, "We couldn't continue with this provider."))
    } finally {
      setActiveStrategy(null)
    }
  }

  const handleGoogleSignIn = () => {
    signInWith('oauth_google')
  }

  const handleGitHubSignIn = () => {
    signInWith('oauth_github')
  }

  const isDisabled = activeStrategy !== null

  return (
    <>
      <Field>
        <Button
          variant="outline"
          size="lg"
          type="button"
          className="w-full"
          disabled={isDisabled}
          onClick={handleGoogleSignIn}
        >
          <GoogleIcon />
          {activeStrategy === 'oauth_google' ? 'Continuing with Google...' : 'Continue with Google'}
        </Button>
      </Field>

      <Field>
        <Button
          variant="outline"
          size="lg"
          type="button"
          className="w-full"
          disabled={isDisabled}
          onClick={handleGitHubSignIn}
        >
          <GitHubIcon />
          {activeStrategy === 'oauth_github' ? 'Continuing with GitHub...' : 'Continue with GitHub'}
        </Button>
      </Field>

      {submitError && <FieldError className="text-center">{submitError}</FieldError>}
    </>
  )
}
