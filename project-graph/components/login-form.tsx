"use client"

import { useSignIn, useSignUp } from '@clerk/nextjs'
import React from 'react'

import { cn } from "@/lib/utils"
import { CompleteAccountScreen } from "@/components/auth/complete-account-screen"
import { EmailStep } from "@/components/auth/email-step"
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

  // Seam between the two flows: the code was verified but no user exists,
  // so the verified identification moves from the sign-in to a new sign-up.
  const handleTransfer = async () => {
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
      setStep('complete')
    } else {
      console.error('Unexpected sign-up status:', signUp.status)
    }
  }

  const handleStartOver = () => {
    signIn.reset()
    signUp.reset()
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
