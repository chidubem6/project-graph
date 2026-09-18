import { auth, currentUser } from "@clerk/nextjs/server"
import { notFound } from "next/navigation"

import { EditorWorkspace } from "@/components/editor/editor-workspace"
import { getProjectLists } from "@/lib/projects/queries"

/** Open the editor workspace on one project the user can access */
export default async function ProjectWorkspacePage(
  props: PageProps<"/editor/[projectId]">
) {
  /* Read the project ID from the URL */
  const { projectId } = await props.params

  /* Send signed-out visitors to the sign-in page */
  const user = await currentUser()
  if (!user) {
    return (await auth()).redirectToSignIn()
  }

  /* Load the user's own and shared projects for the sidebar */
  const { myProjects, sharedProjects } = await getProjectLists(user)

  /* Find the requested project among those the user belongs to */
  const activeProject = [...myProjects, ...sharedProjects].find(
    (project) => project.id === projectId
  )

  /* Show non-members a 404 so the project's existence stays hidden */
  if (!activeProject) {
    notFound()
  }

  /* Render the workspace with this project open */
  return (
    <EditorWorkspace
      myProjects={myProjects}
      sharedProjects={sharedProjects}
      activeProject={activeProject}
    />
  )
}
