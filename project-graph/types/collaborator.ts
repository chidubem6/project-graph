// Collaborators are stored by email only (there is no local user table). `name`
// and `imageUrl` come from the Clerk user holding that email as a verified
// address, and are null when no such user exists, so the UI shows the email.
export interface Collaborator {
  id: string
  email: string
  name: string | null
  imageUrl: string | null
}
