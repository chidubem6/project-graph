"use client"

import { useSignUp } from "@clerk/nextjs"
import React, { useState } from "react"

import { getClerkErrorMessage } from "./get-clerk-error-message"
import { useFinalizeAuth } from "./use-finalize-auth"
import { Button } from "@/components/ui/button"
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"

type CompleteAccountScreenProps = {
  onStartOver?: () => void
}

export function CompleteAccountScreen({ onStartOver }: CompleteAccountScreenProps) {
  const { signUp, fetchStatus } = useSignUp()
  const { finalizeSignUp } = useFinalizeAuth()
  const [firstName, setFirstName] = useState<string | null>(null)
  const [lastName, setLastName] = useState<string | null>(null)
  const [nameError, setNameError] = useState("")
  const [submitError, setSubmitError] = useState("")
  const currentFirstName = firstName ?? signUp.firstName ?? ""
  const currentLastName = lastName ?? signUp.lastName ?? ""

  const needsFirstName = signUp.missingFields.includes("first_name")
  const needsLastName = signUp.missingFields.includes("last_name")
  const unsupportedMissingFields = signUp.missingFields.filter(
    (field) => field !== "first_name" && field !== "last_name",
  )
  const hasUnsupportedMissingFields = unsupportedMissingFields.length > 0
  const hasSupportedMissingFields = needsFirstName || needsLastName

  const isCreateAccountDisabled =
    fetchStatus === "fetching" ||
    hasUnsupportedMissingFields ||
    !hasSupportedMissingFields ||
    (needsFirstName && currentFirstName.trim() === "") ||
    (needsLastName && currentLastName.trim() === "")

  // Submit missing requirements to complete sign-up.
  const handleMissingRequirements = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitError("")

    const trimmedFirstName = currentFirstName.trim()
    const trimmedLastName = currentLastName.trim()

    if (hasUnsupportedMissingFields) {
      setSubmitError(
        `We need additional account information that this screen does not support yet: ${unsupportedMissingFields.join(", ")}.`,
      )
      return
    }

    const missingNames = [
      needsFirstName && trimmedFirstName === "" ? "first name" : "",
      needsLastName && trimmedLastName === "" ? "last name" : "",
    ].filter(Boolean)

    if (missingNames.length > 0) {
      setNameError(`${missingNames.join(" and ")} ${missingNames.length === 1 ? "is" : "are"} required.`)
      return
    }

    setNameError("")

    const updateParams: { firstName?: string; lastName?: string } = {}
    if (needsFirstName) updateParams.firstName = trimmedFirstName
    if (needsLastName) updateParams.lastName = trimmedLastName

    const { error } = await signUp.update(updateParams)
    if (error) {
      console.error(JSON.stringify(error, null, 2))
      setSubmitError(
        getClerkErrorMessage(error, "We couldn't update your account. Please try again."),
      )
      return
    }

    if (signUp.status === "complete") {
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
    } else if (signUp.status === "missing_requirements") {
      // Still missing other fields
      console.error("Additional fields still required:", signUp.missingFields)
      setSubmitError("We still need more information before creating your account.")
    } else {
      console.error("Unexpected sign-up status:", signUp.status)
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
              Please complete the following to create your account.
            </FieldDescription>
          </div>

          {needsFirstName && (
            <Field>
              <FieldLabel htmlFor="firstName">First name</FieldLabel>
              <Input
                id="firstName"
                name="firstName"
                value={currentFirstName}
                onChange={(e) => {
                  setNameError("")
                  setSubmitError("")
                  setFirstName(e.target.value)
                }}
                autoComplete="given-name"
                className="h-9"
                required
              />
            </Field>
          )}

          {needsLastName && (
            <Field>
              <FieldLabel htmlFor="lastName">Last name</FieldLabel>
              <Input
                id="lastName"
                name="lastName"
                value={currentLastName}
                onChange={(e) => {
                  setNameError("")
                  setSubmitError("")
                  setLastName(e.target.value)
                }}
                autoComplete="family-name"
                className="h-9"
                required
              />
            </Field>
          )}

          {nameError && <FieldError>{nameError}</FieldError>}

          {hasUnsupportedMissingFields && (
            <FieldError>
              We need additional account information that this screen does not support yet:{" "}
              {unsupportedMissingFields.join(", ")}.
            </FieldError>
          )}

          {!hasSupportedMissingFields && !hasUnsupportedMissingFields && (
            <FieldDescription className="text-center">
              Your account is not missing any supported profile fields.
            </FieldDescription>
          )}

          {submitError && <FieldError>{submitError}</FieldError>}

          <Field>
            <Button size="lg" className="w-full" type="submit" disabled={isCreateAccountDisabled}>
              Create account
            </Button>
          </Field>
        </FieldGroup>
      </form>

      {onStartOver && <button onClick={onStartOver}>Start over</button>}
    </>
  )
}
