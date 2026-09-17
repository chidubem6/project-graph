/**
 * Derives a URL-safe project slug from a display name. Used for the live preview
 * in the create dialog; the server will own the canonical slug once projects are
 * persisted.
 */
export function toProjectSlug(name: string): string {
  return name
    .toLowerCase()
    // Split accented characters so the marks can be dropped: "Ünïcode" -> "unicode".
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
}
