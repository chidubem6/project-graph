// NFD decomposes precomposed accents, but these letters carry no combining mark
// to strip, so without a map they fall into the non-alphanumeric class and turn
// into separators: "Straße" -> "stra-e", "Køge" -> "k-ge", "Łódź" -> "odz".
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
 * Derives a URL-safe project slug from a display name. Used for the live preview
 * in the create dialog; the server will own the canonical slug once projects are
 * persisted.
 *
 * A name written entirely outside ASCII — CJK, Cyrillic, Greek, emoji, or pure
 * punctuation — transliterates to nothing. Those fall back to a deterministic
 * `project-<hash>` rather than an empty string, so the create dialog can accept
 * the name instead of leaving its confirm button silently inert. The hash is
 * derived from the name, so the preview stays stable as long as the name does.
 */
export function toProjectSlug(name: string): string {
  const trimmed = name.trim()
  if (!trimmed) return ""

  const slug = trimmed
    .toLowerCase()
    .replace(/[ßøæœłđðþ]/g, (char) => LATIN_EXPANSIONS[char] ?? char)
    // Split accented characters so the marks can be dropped: "Ünïcode" -> "unicode".
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")

  return slug || `project-${hashName(trimmed)}`
}

/** djb2, base36-encoded. Deterministic and short — not a security hash. */
function hashName(value: string): string {
  let hash = 5381
  for (let index = 0; index < value.length; index += 1) {
    hash = ((hash << 5) + hash + value.charCodeAt(index)) >>> 0
  }
  return hash.toString(36)
}
