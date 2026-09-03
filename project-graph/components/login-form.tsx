"use client"

import { useSignIn, useSignUp } from '@clerk/nextjs'
import { isClerkAPIResponseError } from '@clerk/nextjs/errors'
import { useRouter } from 'next/navigation'
import React from 'react'

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldSeparator,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { InputOTP } from "@/components/ui/input-otp"
import Link from "next/link"

// Presentational only for now. Clerk's hooks get wired in behind these
// three actions (Google, GitHub, email code) in a follow-up.
export function LoginForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const { signIn, errors, fetchStatus } = useSignIn()
  const { signUp } = useSignUp()
  const router = useRouter()

  const [emailAddress, setEmailAddress] = React.useState('')
  const [code, setCode] = React.useState('')
  const [verifying, setVerifying] = React.useState(false)
  const [showMissingRequirements, setShowMissingRequirements] = React.useState(false)

  const isCodeComplete = code.length === 6 && !code.includes(' ')

  // Guard against overlapping verification attempts.
  const isVerifying = React.useRef(false)

  const finalizeSignIn = async () => {
    await signIn.finalize({
      navigate: ({ session, decorateUrl }) => {
        if (session?.currentTask) {
          // Handle pending session tasks
          // See https://clerk.com/docs/guides/development/custom-flows/authentication/session-tasks
          console.log(session?.currentTask)
          return
        }

        const url = decorateUrl('/')
        if (url.startsWith('http')) {
          window.location.href = url
        } else {
          router.push(url)
        }
      },
    })
  }

  // Helper to finalize sign-up and navigate
  const finalizeSignUp = async () => {
    await signUp.finalize({
      navigate: ({ session, decorateUrl }) => {
        if (session?.currentTask) {
          // Handle pending session tasks
          // See https://clerk.com/docs/guides/development/custom-flows/authentication/session-tasks
          console.log(session?.currentTask)
          return
        }

        const url = decorateUrl('/')
        if (url.startsWith('http')) {
          window.location.href = url
        } else {
          router.push(url)
        }
      },
    })
  }


  // Step 1: Start sign-in with signUpIfMissing and send email code
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Create sign-in for the signUpIfMissing flow.
    // The flow will proceed to verification regardless of whether an account exists or not.
    const { error: createError } = await signIn.create({
      identifier: emailAddress,
      signUpIfMissing: true,
    })
    
    if (createError) {
      console.error(JSON.stringify(createError, null, 2))
      return
    }

    // Start the verification step
    if (!createError) {
      const { error: sendError } = await signIn.emailCode.sendCode()
      if (sendError) {
        console.error(JSON.stringify(sendError, null, 2))
        return
      }

      setVerifying(true)
    }
  }

  // Step 2: Verification step. Fires when the user submits the code.
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
          // The user doesn't exist - transfer to sign-up
          await handleTransfer()
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

  const handleStartOver = () => {
    setCode('')
    setVerifying(false)
    signIn.reset()
  }

    // Step 3: Transfer to sign-up
  const handleTransfer = async () => {
    // Create sign-up using transfer.
    // This moves the verified identification from the sign-in to a new sign-up.
    const { error } = await signUp.create({ transfer: true })
    if (error) {
      console.error(JSON.stringify(error, null, 2))
      return
    }

    if (signUp.status === 'complete') {
      // No additional requirements - sign-up is complete
      await finalizeSignUp()
    } else if (signUp.status === 'missing_requirements') {
      // Additional fields are required to complete sign-up.
      // Common missing fields include legal_accepted, first_name, last_name, etc.
      // Show a form to collect the missing fields.
      setShowMissingRequirements(true)
    } else {
      console.error('Unexpected sign-up status:', signUp.status)
    }
  }


 // Step 4: Submit missing requirements to complete sign-up
  const handleMissingRequirements = async (e: React.FormEvent) => {
    e.preventDefault()

    // This example handles legal acceptance as an example.
    // You can extend this to handle other missing fields like first_name, last_name, etc.
    // by checking signUp.missingFields and collecting the appropriate values.
    const { error } = await signUp.update({
      legalAccepted: true,
    })
    if (error) {
      console.error(JSON.stringify(error, null, 2))
      return
    }

    if (signUp.status === 'complete') {
      await finalizeSignUp()
    } else if (signUp.status === 'missing_requirements') {
      // Still missing other fields
      console.error('Additional fields still required:', signUp.missingFields)
    } else {
      console.error('Unexpected sign-up status:', signUp.status)
    }
  }

  // Step 4 UI: Show missing requirements form
  if (showMissingRequirements) {
    return (
      <>
        <h1>Complete your account</h1>
        <p>Your email has been verified. Please complete the following to create your account.</p>

        <form onSubmit={handleMissingRequirements}>
          {signUp.missingFields.includes('legal_accepted') && (
            <div>
              <label>
                <input type="checkbox" required />I agree to the Terms of Service and Privacy Policy
              </label>
            </div>
          )}
          <button type="submit" disabled={fetchStatus === 'fetching'}>
            Create account
          </button>
        </form>

        <button onClick={() => signIn.reset()}>Start over</button>
      </>
    )
  }




 // Step 2 UI: six code boxes with an explicit verify button
  if (verifying) {
    return (
      <div className={cn("flex flex-col gap-6", className)} {...props}>
        <form onSubmit={handleVerify}>
          <FieldGroup>
            <div className="flex flex-col items-center gap-2 text-center">
              <Link href="/" className="text-base font-semibold tracking-tight">
                Structured.
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
                    onClick={handleStartOver}
                    className="underline underline-offset-4"
                  >
                    use a different email
                  </button>
                </>
              )}
            </FieldDescription>
          </FieldGroup>
        </form>
      </div>
    )
  }


  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
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
            <Button variant="outline" size="lg" type="button" className="w-full">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                <path
                  d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z"
                  fill="currentColor"
                />
              </svg>
              Continue with Google
            </Button>
          </Field>

          <Field>
            <Button variant="outline" size="lg" type="button" className="w-full">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                <path
                  d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"
                  fill="currentColor"
                />
              </svg>
              Continue with GitHub
            </Button>
          </Field>

          <FieldSeparator>or</FieldSeparator>

          <Field>
            <FieldLabel htmlFor="email">Email address</FieldLabel>
            <Input
              id="email"
              name="email"
              type="email"
              value={emailAddress}
              onChange={(e) => setEmailAddress(e.target.value)}
              autoComplete="email"
              placeholder="you@example.com"
              className="h-9"
              required
            />
            {errors.fields.identifier && <p>{errors.fields.identifier.message}</p>}
          </Field>

          <Field>
            <Button type="submit" size="lg"  disabled={fetchStatus === 'fetching'} className="w-full">
              Continue
            </Button>
          </Field>
        </FieldGroup>

          <div id="clerk-captcha" />
      </form>

      <FieldDescription className="px-6 text-center">
        By continuing, you agree to our <a href="#">Terms of Service</a> and{" "}
        <a href="#">Privacy Policy</a>.
      </FieldDescription>
    </div>
  )
}
