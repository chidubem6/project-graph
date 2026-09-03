'use client'

import { useSignIn } from '@clerk/nextjs'
import { isClerkAPIResponseError } from '@clerk/nextjs/errors'
import Link from 'next/link'
import React from 'react'

import { Button } from '@/components/ui/button'
import { Field, FieldDescription, FieldGroup } from '@/components/ui/field'
import { InputOTP } from '@/components/ui/input-otp'

import { useFinalizeAuth } from './use-finalize-auth'

type VerificationScreenProps = {
  emailAddress: string
  onNeedsSignUp: () => Promise<void> | void
  onStartOver: () => void
}

export function VerificationScreen({
  emailAddress,
  onNeedsSignUp,
  onStartOver,
}: VerificationScreenProps) {
  const { signIn, errors, fetchStatus } = useSignIn()
  const { finalizeSignIn } = useFinalizeAuth()

  const [code, setCode] = React.useState('')

  const isCodeComplete = code.length === 6 && !code.includes(' ')

  // Guard against overlapping verification attempts.
  const isVerifying = React.useRef(false)

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isCodeComplete) return
    if (isVerifying.current) return
    isVerifying.current = true

    try {
      const { error } = await signIn.emailCode.verifyCode({ code })

      // When the user doesn't exist, verifyCode returns an error with
      // the code 'sign_up_if_missing_transfer'. Check for this error
      // to determine if we need to transfer to sign-up.
      if (error) {
        if (isClerkAPIResponseError(error) && error.errors[0]?.code === 'sign_up_if_missing_transfer') {
          // The user doesn't exist - hand off to the sign-up transfer.
          await onNeedsSignUp()
          return
        }

        // Some other error occurred. Clear the boxes so the next submission
        // triggers a fresh attempt.
        console.error(JSON.stringify(error, null, 2))
        setCode('')
        return
      }

      // The user exists and verification succeeded
      if (signIn.status === 'complete') {
        await finalizeSignIn()
      } else if (signIn.status === 'needs_second_factor') {
        // Handle MFA if required
        // See https://clerk.com/docs/guides/development/custom-flows/authentication/multi-factor-authentication
      } else if (signIn.status === 'needs_client_trust') {
        // Handle Device Trust if required
        // See https://clerk.com/docs/guides/development/custom-flows/authentication/device-trust
      } else {
        // Check why the sign-in is not complete
        console.error('Sign-in attempt not complete:', signIn.status)
        setCode('')
      }
    } finally {
      isVerifying.current = false
    }
  }

  const handleResend = async () => {
    setCode('')
    await signIn.emailCode.sendCode()
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
            onChange={setCode}
            disabled={fetchStatus === 'fetching'}
            className="justify-center"
            autoFocus
          />
          {errors.fields.code && (
            <p className="text-center text-sm text-destructive">
              {errors.fields.code.message}
            </p>
          )}
        </Field>

        <Field>
          <Button
            type="submit"
            size="lg"
            disabled={fetchStatus === 'fetching' || !isCodeComplete}
            className="w-full"
          >
            Verify
          </Button>
        </Field>

        <FieldDescription className="text-center">
          {fetchStatus === 'fetching' ? (
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
