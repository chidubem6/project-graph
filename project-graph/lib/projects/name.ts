export const DEFAULT_PROJECT_NAME = "Untitled Project"

export type ProjectNameResult = { ok: true; name: string } | { ok: false; error: string }

// Create: a missing or blank name falls back to the default.
export function parseNewProjectName(value: unknown): ProjectNameResult {
  if (value === undefined) {
    return { ok: true, name: DEFAULT_PROJECT_NAME }
  }
  if (typeof value !== "string") {
    return { ok: false, error: "name must be a string" }
  }
  return { ok: true, name: value.trim() || DEFAULT_PROJECT_NAME }
}

// Rename: the new name is required, since there is nothing to fall back to.
export function parseProjectRename(value: unknown): ProjectNameResult {
  if (typeof value !== "string") {
    return { ok: false, error: "name is required" }
  }
  const name = value.trim()
  if (!name) {
    return { ok: false, error: "name must not be empty" }
  }
  return { ok: true, name }
}
