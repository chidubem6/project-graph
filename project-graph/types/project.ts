// Ownership is not carried on the record: the editor resolves it from the list a
// project came from (owned vs. shared), matching the owner/collaborator model in
// context/architecture-context.md.
export interface Project {
  id: string
  name: string
  slug: string
}
