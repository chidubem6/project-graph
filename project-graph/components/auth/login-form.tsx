"use client"

import { useSignIn, useSignUp } from '@clerk/nextjs'
import React from 'react'

import { cn } from "@/lib/utils"
import { CompleteAccountScreen } from "@/components/auth/complete-account-screen"
import { EmailStep } from "@/components/auth/email-step"
import { getClerkErrorMessage } from "@/components/auth/get-clerk-error-message"
import { useFinalizeAuth } from "@/components/auth/use-finalize-auth"
import { VerificationScreen } from "@/components/auth/verification-screen"

type Step = 'email' | 'verify' | 'complete'

export function LoginForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const { signIn } = useSignIn()
  const { signUp } = useSignUp()
  const { finalizeSignUp } = useFinalizeAuth()

  const [step, setStep] = React.useState<Step>('email')
  const [emailAddress, setEmailAddress] = React.useState('')
  const [transferError, setTransferError] = React.useState('')

  // Seam between the two flows: the code was verified but no user exists,
  // so the verified identification moves from the sign-in to a new sign-up.
  const handleTransfer = async () => {
    setTransferError('')

    const { error } = await signUp.create({ transfer: true })
    if (error) {
      console.error(JSON.stringify(error, null, 2))
      setTransferError(
        getClerkErrorMessage(error, "We couldn't create your account. Please try again."),
      )
      return
    }

    if (signUp.status === 'complete') {
      // No additional requirements, but activating the session can still fail.
      const { error: finalizeError } = await finalizeSignUp()

      if (finalizeError) {
        console.error(JSON.stringify(finalizeError, null, 2))
        setTransferError(
          getClerkErrorMessage(
            finalizeError,
            "We couldn't complete account creation. Please try again.",
          ),
        )
      }
    } else if (signUp.status === 'missing_requirements') {
      // Additional fields are required to complete sign-up.
      // Common missing fields include legal_accepted, first_name, last_name, etc.
      setStep('complete')
    } else {
      console.error('Unexpected sign-up status:', signUp.status)
      setTransferError("We couldn't complete account creation. Please try again.")
    }
  }

  const handleStartOver = () => {
    signIn.reset()
    signUp.reset()
    setTransferError('')
    setStep('email')
  }

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      {step === 'email' && (
        <EmailStep
          emailAddress={emailAddress}
          onEmailChange={setEmailAddress}
          onCodeSent={() => setStep('verify')}
        />
      )}

      {step === 'verify' && (
        <VerificationScreen
          emailAddress={emailAddress}
          flowError={transferError}
          onNeedsSignUp={handleTransfer}
          onStartOver={handleStartOver}
        />
      )}

      {step === 'complete' && <CompleteAccountScreen onStartOver={handleStartOver} />}

      {/* Clerk renders its bot-protection challenge into this node. It stays
          mounted across every step so the sign-up transfer can still use it
          after the first screen is gone. */}
      <div id="clerk-captcha" />
    </div>
  )
}
