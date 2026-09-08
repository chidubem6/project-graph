'use client'

import { useSignIn } from '@clerk/nextjs'
import type { OAuthStrategy } from '@clerk/nextjs/types'

import React from 'react'

import { Button } from '@/components/ui/button'
import { Field, FieldError } from '@/components/ui/field'

import { getClerkErrorMessage } from './get-clerk-error-message'
import { GitHubIcon, GoogleIcon } from './social-icons'

export function SocialSignIn() {
  const { signIn } = useSignIn()
  const [activeStrategy, setActiveStrategy] = React.useState<OAuthStrategy | null>(null)
  const [submitError, setSubmitError] = React.useState('')

  const signInWith = async (strategy: OAuthStrategy) => {
    setActiveStrategy(strategy)
    setSubmitError('')

    try {
      const { error } = await signIn.create({
        strategy,
        redirectUrl: '/sso-callback',
        actionCompleteRedirectUrl: '/dashboard',
      })

      if (error) {
        setSubmitError(getClerkErrorMessage(error, "We couldn't continue with this provider."))
        return
      }

      const redirectUrl = signIn.firstFactorVerification.externalVerificationRedirectURL
      if (redirectUrl) {
        window.location.href = redirectUrl.toString()
        return
      }

      setSubmitError("We couldn't continue with this provider. Please try again.")
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
