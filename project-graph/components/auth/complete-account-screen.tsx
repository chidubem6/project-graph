'use client'

import { useSignUp } from '@clerk/nextjs'
import React, { useState } from 'react'

import { useFinalizeAuth } from './use-finalize-auth'
import { Button } from '@/components/ui/button'
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field'
import { Input } from '@/components/ui/input'

type CompleteAccountScreenProps = {
  onStartOver: () => void
}

export function CompleteAccountScreen({ onStartOver }: CompleteAccountScreenProps) {
  const { signUp, fetchStatus } = useSignUp()
  const { finalizeSignUp } = useFinalizeAuth()
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [nameError, setNameError] = useState('')

  const isCreateAccountDisabled = fetchStatus === 'fetching' || firstName.trim() === '' || lastName.trim() === ''

  // Submit missing requirements to complete sign-up.
  const handleMissingRequirements = async (e: React.FormEvent) => {
    e.preventDefault()

    const trimmedFirstName = firstName.trim()
    const trimmedLastName = lastName.trim()

    if (trimmedFirstName === '' || trimmedLastName === '') {
      setNameError('First and last name are required.')
      return
    }

    setNameError('')

    // This example handles legal acceptance as an example.
    // You can extend this to handle other missing fields like first_name, last_name, etc.
    // by checking signUp.missingFields and collecting the appropriate values.
    const { error } = await signUp.update({
      firstName: trimmedFirstName,
      lastName: trimmedLastName,
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
      <form onSubmit={handleMissingRequirements}>
        <FieldGroup>
          <div className="flex flex-col items-center gap-2 text-center">
            <h1 className="text-xl font-bold">Complete your account</h1>
            <FieldDescription>
              Your email has been verified. Please complete the following to create your account.
            </FieldDescription>
          </div>

          <Field>
            <FieldLabel htmlFor="firstName">First name</FieldLabel>
            <Input
              id="firstName"
              name="firstName"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              autoComplete="given-name"
              className="h-9"
              required
            />
          </Field>

          <Field>
            <FieldLabel htmlFor="lastName">Last name</FieldLabel>
            <Input
              id="lastName"
              name="lastName"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              autoComplete="family-name"
              className="h-9"
              required
            />
            <FieldError>{nameError}</FieldError>
          </Field>

          {signUp.missingFields.includes('legal_accepted') && (
            <Field>
              <FieldLabel>
                <input type="checkbox" required />
                I agree to the Terms of Service and Privacy Policy
              </FieldLabel>
            </Field>
          )}

          <Field>
            <Button size="lg" className="w-full" type="submit" disabled={isCreateAccountDisabled}>
              Create account
            </Button>
          </Field>
        </FieldGroup>
      </form>

      <button onClick={onStartOver}>Start over</button>
    </>
  )
}
