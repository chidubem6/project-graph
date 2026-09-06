'use client'

import { useSignIn } from '@clerk/nextjs'
import { isClerkAPIResponseError } from '@clerk/nextjs/errors'
import Link from 'next/link'
import React from 'react'

import { Button } from '@/components/ui/button'
import { Field, FieldDescription, FieldError, FieldGroup } from '@/components/ui/field'
import { InputOTP } from '@/components/ui/input-otp'

import { getClerkErrorMessage } from './get-clerk-error-message'
import { useFinalizeAuth } from './use-finalize-auth'

type VerificationScreenProps = {
  emailAddress: string
  flowError?: string
  onClearFlowError?: () => void
  onNeedsSignUp: () => Promise<void> | void
  onStartOver: () => void
}

export function VerificationScreen({
  emailAddress,
  flowError,
  onClearFlowError,
  onNeedsSignUp,
  onStartOver,
}: VerificationScreenProps) {
  const { signIn, fetchStatus } = useSignIn()
  const { finalizeSignIn } = useFinalizeAuth()

  const [code, setCode] = React.useState('')
  const [submitError, setSubmitError] = React.useState('')

  // Both errors describe the last attempt, so both go stale the moment a new
  // one starts or the user edits the code. flowError belongs to the parent,
  // hence the callback rather than a setter.
  const clearErrors = () => {
    setSubmitError('')
    onClearFlowError?.()
  }

  const isCodeComplete = code.length === 6 && !code.includes(' ')

  // One action at a time. The ref is the guard: it flips synchronously, so two
  // actions cannot both pass no matter when React re-renders. The states carry
  // the same fact into rendering, and isSubmitting stays true through the
  // sign-up transfer since onNeedsSignUp is awaited below.
  const isActionInFlight = React.useRef(false)
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [isResending, setIsResending] = React.useState(false)

  const isVerifyInProgress = fetchStatus === 'fetching' || isSubmitting
  const isVerifyDisabled = isVerifyInProgress || !isCodeComplete

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isCodeComplete) return
    if (isActionInFlight.current) return
    isActionInFlight.current = true
    setIsSubmitting(true)
    clearErrors()

    try {
      const { error } = await signIn.emailCode.verifyCode({ code })

      // When the user doesn't exist, verifyCode returns an error with
      // the code 'sign_up_if_missing_transfer'. Check for this error
      // to determine if we need to transfer to sign-up.
      if (error) {
        if (isClerkAPIResponseError(error) && error.errors[0]?.code === 'sign_up_if_missing_transfer') {
          // The user doesn't exist - hand off to the sign-up transfer. If it fails
          // the user is left on this screen with an empty code, so resending is the
          // recovery path rather than re-submitting a spent code.
          await onNeedsSignUp()
          return
        }

        // Some other error occurred.
        console.error(JSON.stringify(error, null, 2))
        setSubmitError(getClerkErrorMessage(error, "That code didn't work. Please try again."))
        return
      }

      // The user exists and verification succeeded
      if (signIn.status === 'complete') {
        // Verification succeeded, but activating the session can still fail.
        const { error: finalizeError } = await finalizeSignIn()

        if (finalizeError) {
          console.error(JSON.stringify(finalizeError, null, 2))
          setSubmitError(
            getClerkErrorMessage(finalizeError, "We couldn't complete sign-in. Please try again."),
          )
        }
      } else if (signIn.status === 'needs_second_factor') {
        // Handle MFA if required
        // See https://clerk.com/docs/guides/development/custom-flows/authentication/multi-factor-authentication
        setSubmitError('Additional verification is required, but this flow does not support it yet.')
      } else if (signIn.status === 'needs_client_trust') {
        // Handle Device Trust if required
        // See https://clerk.com/docs/guides/development/custom-flows/authentication/device-trust
        setSubmitError('This device needs additional verification before signing in.')
      } else {
        // Check why the sign-in is not complete
        console.error('Sign-in attempt not complete:', signIn.status)
        setSubmitError("We couldn't complete sign-in. Please try again.")
      }
    } finally {
      isActionInFlight.current = false
      setIsSubmitting(false)
      // However this ended, the code has been submitted and is spent, so never
      // leave it behind a live Verify button.
      setCode('')
    }
  }

  const handleResend = async () => {
    if (isActionInFlight.current) return
    isActionInFlight.current = true
    setIsResending(true)
    clearErrors()
    setCode('')

    try {
      const { error } = await signIn.emailCode.sendCode()

      if (error) {
        console.error(JSON.stringify(error, null, 2))
        setSubmitError(
          getClerkErrorMessage(error, "We couldn't resend your code. Please try again."),
        )
      }
    } finally {
      isActionInFlight.current = false
      setIsResending(false)
    }
  }

  return (
    <form onSubmit={handleVerify}>
      <FieldGroup>
        <div className="flex flex-col items-center gap-2 text-center">
          <Link href="/" className="text-base font-semibold tracking-tight">
            Structred.
          </Link>
          <h1 className="text-xl font-bold">Check your email</h1>
          <FieldDescription>
            Enter the 6-digit code sent to <strong>{emailAddress}</strong>
          </FieldDescription>
        </div>

        <Field>
          <InputOTP
            value={code}
            onChange={(value) => {
              clearErrors()
              setCode(value)
            }}
            disabled={isVerifyInProgress}
            className="justify-center"
            autoFocus
          />
          {submitError && <FieldError className="text-center">{submitError}</FieldError>}
          {flowError && <FieldError className="text-center">{flowError}</FieldError>}
        </Field>

        <Field>
          <Button
            type="submit"
            size="lg"
            disabled={isVerifyDisabled}
            className="w-full"
          >
            Verify
          </Button>
        </Field>

        <FieldDescription className="text-center">
          {isResending ? (
            'Sending a new code...'
          ) : isVerifyInProgress ? (
            'Verifying...'
          ) : (
            <>
              Didn&apos;t get it?{' '}
              <button
                type="button"
                onClick={handleResend}
                className="underline underline-offset-4"
              >
                Resend code
              </button>{' '}
              or{' '}
              <button
                type="button"
                onClick={onStartOver}
                className="underline underline-offset-4"
              >
                use a different email
              </button>
            </>
          )}
        </FieldDescription>
      </FieldGroup>
    </form>
  )
}
