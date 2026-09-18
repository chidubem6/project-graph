// Ownership is not carried on the record: the editor resolves it from the list a
// project came from (owned vs. shared), matching the owner/collaborator model in
// context/architecture-context.md. `id` is also the project's Liveblocks room ID.
export interface Project {
  id: string
  name: string
}
