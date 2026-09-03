'use client'

import { useSignIn, useSignUp } from '@clerk/nextjs'
import React from 'react'

import { useFinalizeAuth } from './use-finalize-auth'

type CompleteAccountScreenProps = {
  onStartOver: () => void
}

export function CompleteAccountScreen({ onStartOver }: CompleteAccountScreenProps) {
  const { signUp } = useSignUp()
  const { fetchStatus } = useSignIn()
  const { finalizeSignUp } = useFinalizeAuth()

  // Submit missing requirements to complete sign-up.
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

      <button onClick={onStartOver}>Start over</button>
    </>
  )
}
