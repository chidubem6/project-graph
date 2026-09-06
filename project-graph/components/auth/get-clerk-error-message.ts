import { isClerkAPIResponseError } from '@clerk/nextjs/errors'

export function getClerkErrorMessage(error: unknown, fallback: string) {
  if (isClerkAPIResponseError(error)) {
    const clerkError = error.errors[0]

    return clerkError?.longMessage ?? clerkError?.message ?? fallback
  }

  if (error instanceof Error) {
    return error.message
  }

  return fallback
}
