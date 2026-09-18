import type { Project } from "@/types/project"

/* Browser-side /api/projects calls; failures throw ApiError with the API's message and status */

/** Error from a failed API request, with its status for handling cases like 409 */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string
  ) {
    super(message)
    this.name = "ApiError"
  }
}

/** Create a project with the given id and name, and return it */
export async function createProject(input: {
  id: string
  name: string
}): Promise<Project> {
  /* Send the new project to the API */
  const response = await sendJson("/api/projects", "POST", input)

  /* Return the project the API saved */
  const { project } = (await response.json()) as { project: Project }
  return project
}

/** Rename the project with the given id */
export async function renameProject(id: string, name: string): Promise<void> {
  await sendJson(`/api/projects/${encodeURIComponent(id)}`, "PATCH", { name })
}

/** Delete the project with the given id */
export async function deleteProject(id: string): Promise<void> {
  await sendJson(`/api/projects/${encodeURIComponent(id)}`, "DELETE")
}

/* Send a request with an optional JSON body, throwing ApiError on failure */
async function sendJson(
  url: string,
  method: string,
  body?: unknown
): Promise<Response> {
  /* Send the request, adding the JSON body and header only when there is a body */
  const response = await fetch(url, {
    method,
    headers:
      body === undefined ? undefined : { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  })

  /* Turn a failed response into an ApiError with the API's message */
  if (!response.ok) {
    throw new ApiError(response.status, await readErrorMessage(response))
  }
  return response
}

/* Get the API's error message from a failed response, or a generic fallback */
async function readErrorMessage(response: Response): Promise<string> {
  /* Use the `{ error }` message from the response body when there is one */
  try {
    const body: unknown = await response.json()
    if (
      typeof body === "object" &&
      body !== null &&
      "error" in body &&
      typeof body.error === "string"
    ) {
      return body.error
    }
  } catch {
    /* Not JSON (e.g. a proxy error page), so fall back to the generic message */
  }

  /* Otherwise describe the failure by its status code */
  return `Request failed (${response.status})`
}
