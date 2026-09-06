"use client"

import Link from "next/link"

import { FieldDescription, FieldGroup } from "@/components/ui/field"

import { EmailForm } from "./email-form"

type IdentifyScreenProps = {
  emailAddress: string
  onEmailChange: (emailAddress: string) => void
  onCodeSent: () => void
}

// Owns the shape of the first step: the heading, the order of the ways in, and
// the legal footer. Each way in owns its own submission and its own errors.
export function IdentifyScreen({ emailAddress, onEmailChange, onCodeSent }: IdentifyScreenProps) {
  return (
    <>
      <FieldGroup>
        <div className="flex flex-col items-center gap-2 text-center">
          <Link href="/" className="text-base font-semibold tracking-tight">
            Structred.
          </Link>
          <h1 className="text-xl font-bold">Continue to Structred</h1>
          <FieldDescription>Sign in or create an account</FieldDescription>
        </div>

        <EmailForm
          emailAddress={emailAddress}
          onEmailChange={onEmailChange}
          onCodeSent={onCodeSent}
        />
      </FieldGroup>

      <FieldDescription className="px-6 text-center">
        By continuing, you agree to our <a href="#">Terms of Service</a> and{" "}
        <a href="#">Privacy Policy</a>.
      </FieldDescription>
    </>
  )
}
