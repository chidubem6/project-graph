export type JsonObject = Record<string, unknown>

// An empty body reads as `{}` so optional fields can simply be left out.
// Returns null when there is a body but it isn't a JSON object.
export async function readJsonObject(request: Request): Promise<JsonObject | null> {
  const text = await request.text()
  if (text.trim() === "") {
    return {}
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch {
    return null
  }

  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    return null
  }
  return parsed as JsonObject
}
