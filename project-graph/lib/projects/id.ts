import { toProjectSlug } from "@/lib/projects/slug"

/* Project IDs double as Liveblocks room IDs, shaped `<slug>-<suffix>` in lowercase with single hyphens */
const PROJECT_ID_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
export const MAX_PROJECT_ID_LENGTH = 64

/* Suffixes are six random lowercase letters or digits */
const SUFFIX_LENGTH = 6
const SUFFIX_ALPHABET = "abcdefghijklmnopqrstuvwxyz0123456789"

/** Generate a random suffix that keeps same-named projects apart */
export function createProjectIdSuffix(): string {
  /* Pick six random bytes from a secure source */
  const bytes = crypto.getRandomValues(new Uint8Array(SUFFIX_LENGTH))

  /* Map each byte to a character; slight modulo skew is fine since the database enforces uniqueness */
  return Array.from(
    bytes,
    (byte) => SUFFIX_ALPHABET[byte % SUFFIX_ALPHABET.length]
  ).join("")
}

/** Build the project/room ID from a name and suffix, or "" for a blank name */
export function toProjectId(name: string, suffix: string): string {
  /* Slugify the name, cut short so the whole ID fits the length limit */
  const slug = toProjectSlug(name)
    .slice(0, MAX_PROJECT_ID_LENGTH - suffix.length - 1)
    .replace(/-+$/, "")

  /* Join slug and suffix, or return "" when the name had nothing usable */
  return slug ? `${slug}-${suffix}` : ""
}

/* Outcome of validating a client-supplied project ID */
export type ProjectIdResult =
  | { ok: true; id: string | undefined }
  | { ok: false; error: string }

/** Validate the ID sent when creating a project */
export function parseNewProjectId(value: unknown): ProjectIdResult {
  /* Leave an omitted ID to the schema's cuid() default */
  if (value === undefined) {
    return { ok: true, id: undefined }
  }

  /* Reject anything that isn't a short lowercase hyphenated slug */
  if (
    typeof value !== "string" ||
    value.length > MAX_PROJECT_ID_LENGTH ||
    !PROJECT_ID_PATTERN.test(value)
  ) {
    return {
      ok: false,
      error: `id must be lowercase letters, digits and single hyphens, at most ${MAX_PROJECT_ID_LENGTH} characters`,
    }
  }

  return { ok: true, id: value }
}
