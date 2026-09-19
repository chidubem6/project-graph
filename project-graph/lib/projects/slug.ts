/* Letters NFD can't strip to ASCII, which would otherwise turn into hyphens ("Straße" -> "stra-e") */
const LATIN_EXPANSIONS: Record<string, string> = {
  ß: "ss",
  ø: "o",
  æ: "ae",
  œ: "oe",
  ł: "l",
  đ: "d",
  ð: "d",
  þ: "th",
}

/**
 * Derives a URL-safe project slug from a display name. The create dialog builds
 * the project/room ID from it (see `lib/projects/id.ts`).
 *
 * A name written entirely outside ASCII — CJK, Cyrillic, Greek, emoji, or pure
 * punctuation — transliterates to nothing. Those fall back to a deterministic
 * `project-<hash>` rather than an empty string, so the create dialog can accept
 * the name instead of leaving its confirm button silently inert. The hash is
 * derived from the name, so the preview stays stable as long as the name does.
 */
export function toProjectSlug(name: string): string {
  /* A blank name has no slug */
  const trimmed = name.trim()
  if (!trimmed) return ""

  /* Reduce the name to lowercase ASCII words joined by hyphens */
  const slug = trimmed
    .toLowerCase()
    /* Expand letters like "ß" that have no accent to strip */
    .replace(/[ßøæœłđðþ]/g, (char) => LATIN_EXPANSIONS[char] ?? char)
    /* Split accented characters so the marks can be dropped: "Ünïcode" -> "unicode" */
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    /* Turn everything else into hyphens and trim them from the ends */
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")

  /* Fall back to a hashed slug when no ASCII is left */
  return slug || `project-${hashName(trimmed)}`
}

/** djb2, base36-encoded. Deterministic and short — not a security hash. */
function hashName(value: string): string {
  /* Mix each character into the hash, kept as an unsigned 32-bit number */
  let hash = 5381
  for (let index = 0; index < value.length; index += 1) {
    hash = ((hash << 5) + hash + value.charCodeAt(index)) >>> 0
  }
  return hash.toString(36)
}
