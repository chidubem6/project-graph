export type CollaboratorEmailResult = { ok: true; email: string } | { ok: false; error: string }

// The longest address SMTP can deliver to (RFC 5321's 256-octet path minus the brackets).
const MAX_EMAIL_LENGTH = 254

// Deliberately loose: one `@`, no whitespace, a dot in the domain. Anything
// stricter rejects real addresses; whether it exists is Clerk's problem.
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/** Trim and lowercase an email, so stored collaborators and sign-in emails compare equal */
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}

/** Validate an invite's email and return it normalized for storage */
export function parseCollaboratorEmail(value: unknown): CollaboratorEmailResult {
  if (typeof value !== "string") {
    return { ok: false, error: "email is required" }
  }
  const email = normalizeEmail(value)
  if (!email) {
    return { ok: false, error: "email must not be empty" }
  }
  if (email.length > MAX_EMAIL_LENGTH || !EMAIL_PATTERN.test(email)) {
    return { ok: false, error: "Enter a valid email address" }
  }
  return { ok: true, email }
}
