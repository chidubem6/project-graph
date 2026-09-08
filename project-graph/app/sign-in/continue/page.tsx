"use client"

import { useClerk, useSignIn, useSignUp } from "@clerk/nextjs"
import { useRouter } from "next/navigation"
import { useEffect } from "react"

import { CompleteAccountScreen } from "@/components/auth/complete-account-screen"

export default function ContinuePage() {
  const clerk = useClerk()
  const { signIn } = useSignIn()
  const { signUp } = useSignUp()
  const router = useRouter()
  const hasMissingRequirements =
    signUp.status === "missing_requirements" && signUp.missingFields.length > 0

  useEffect(() => {
    if (!clerk.loaded) return

    if (!hasMissingRequirements) {
      router.replace("/sign-in")
    }
  }, [clerk.loaded, hasMissingRequirements, router])

  const handleStartOver = async () => {
    await signIn.reset()
    await signUp.reset()
    router.replace("/sign-in")
  }

  if (!clerk.loaded || !hasMissingRequirements) {
    return null
  }

  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-6 bg-background p-6 md:p-10">
      <div className="w-full max-w-sm">
        <CompleteAccountScreen onStartOver={handleStartOver} />
        <div id="clerk-captcha" />
      </div>
    </div>
  )
}
