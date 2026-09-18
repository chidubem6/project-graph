// Every API error has the same body, so clients can read `error` without
// branching on the status code first.
export interface ApiErrorBody {
  error: string
}

export function errorResponse(status: number, error: string): Response {
  return Response.json({ error } satisfies ApiErrorBody, { status })
}
