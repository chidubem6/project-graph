'use client'

import { useSignIn } from '@clerk/nextjs'
import Link from 'next/link'
import React from 'react'

import { Button } from '@/components/ui/button'
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Spinner } from '@/components/ui/spinner'

import { getClerkErrorMessage } from './get-clerk-error-message'

type EmailStepProps = {
  emailAddress: string
  onEmailChange: (emailAddress: string) => void
  onCodeSent: () => void
}

export function EmailStep({ emailAddress, onEmailChange, onCodeSent }: EmailStepProps) {
  const { signIn, fetchStatus } = useSignIn()
  const [submitError, setSubmitError] = React.useState('')

  // Start sign-in with signUpIfMissing and send the email code.
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitError('')

    // Create sign-in for the signUpIfMissing flow.
    // The flow will proceed to verification regardless of whether an account exists or not.
    const { error: createError } = await signIn.create({
      identifier: emailAddress,
      signUpIfMissing: true,
    })

    if (createError) {
      console.error(JSON.stringify(createError, null, 2))
      setSubmitError(
        getClerkErrorMessage(createError, "We couldn't start sign-in. Please try again."),
      )
      return
    }

    // Start the verification step
    const { error: sendError } = await signIn.emailCode.sendCode()
    if (sendError) {
      console.error(JSON.stringify(sendError, null, 2))
      setSubmitError(
        getClerkErrorMessage(sendError, "We couldn't send your code. Please try again."),
      )
      return
    }

    onCodeSent()
  }

  return (
    <>
      <form onSubmit={handleSubmit}>
        <FieldGroup>
          <div className="flex flex-col items-center gap-2 text-center">
            <Link href="/" className="text-base font-semibold tracking-tight">
              Structred.
            </Link>
            <h1 className="text-xl font-bold">Continue to Structred</h1>
            <FieldDescription>Sign in or create an account</FieldDescription>
          </div>

          <Field>
            <FieldLabel htmlFor="email">Email address</FieldLabel>
            <Input
              id="email"
              name="email"
              type="email"
              value={emailAddress}
              onChange={(e) => {
                setSubmitError('')
                onEmailChange(e.target.value)
              }}
              autoComplete="email"
              placeholder="you@example.com"
              className="h-9"
              required
            />
            {submitError && <FieldError>{submitError}</FieldError>}
          </Field>

          <Field>
            {fetchStatus === 'fetching' ? (
              <div className="flex h-10 items-center justify-center">
                <Spinner />
              </div>
            ) : (
              <Button type="submit" size="lg" className="w-full">
                Continue
              </Button>
            )}
          </Field>
        </FieldGroup>
      </form>

      <FieldDescription className="px-6 text-center">
        By continuing, you agree to our <a href="#">Terms of Service</a> and{" "}
        <a href="#">Privacy Policy</a>.
      </FieldDescription>
    </>
  )
}
