'use client'

import { useSignUp } from '@clerk/nextjs'
import React, { useState } from 'react'

import { getClerkErrorMessage } from './get-clerk-error-message'
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
  const [submitError, setSubmitError] = useState('')

  const isCreateAccountDisabled = fetchStatus === 'fetching' || firstName.trim() === '' || lastName.trim() === ''

  // Submit missing requirements to complete sign-up.
  const handleMissingRequirements = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitError('')

    const trimmedFirstName = firstName.trim()
    const trimmedLastName = lastName.trim()

    if (trimmedFirstName === '' || trimmedLastName === '') {
      setNameError('First and last name are required.')
      return
    }

    setNameError('')

    const { error } = await signUp.update({
      firstName: trimmedFirstName,
      lastName: trimmedLastName,
    })
    if (error) {
      console.error(JSON.stringify(error, null, 2))
      setSubmitError(
        getClerkErrorMessage(error, "We couldn't update your account. Please try again."),
      )
      return
    }

    if (signUp.status === 'complete') {
      // Sign-up succeeded, but activating the session can still fail.
      const { error: finalizeError } = await finalizeSignUp()

      if (finalizeError) {
        console.error(JSON.stringify(finalizeError, null, 2))
        setSubmitError(
          getClerkErrorMessage(
            finalizeError,
            "We couldn't complete account creation. Please try again.",
          ),
        )
      }
    } else if (signUp.status === 'missing_requirements') {
      // Still missing other fields
      console.error('Additional fields still required:', signUp.missingFields)
      setSubmitError("We still need more information before creating your account.")
    } else {
      console.error('Unexpected sign-up status:', signUp.status)
      setSubmitError("We couldn't complete account creation. Please try again.")
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
              onChange={(e) => {
                setNameError('')
                setSubmitError('')
                setFirstName(e.target.value)
              }}
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
              onChange={(e) => {
                setNameError('')
                setSubmitError('')
                setLastName(e.target.value)
              }}
              autoComplete="family-name"
              className="h-9"
              required
            />
            <FieldError>{nameError}</FieldError>
          </Field>

          {submitError && <FieldError>{submitError}</FieldError>}

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
