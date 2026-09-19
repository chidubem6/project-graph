import { auth } from "@clerk/nextjs/server"

import { AccessDenied } from "@/components/editor/access-denied"
import { EditorWorkspace } from "@/components/editor/editor-workspace"
import { findAccessibleProject, getCurrentIdentity } from "@/lib/project-access"
import { getProjectLists } from "@/lib/projects/queries"

/** Open the workspace for one room, after checking the user may access it */
export default async function RoomWorkspacePage(
  props: PageProps<"/editor/[roomId]">
) {
  /* Read the room ID (the project ID) from the URL */
  const { roomId } = await props.params

  /* Send signed-out visitors to the sign-in page */
  const identity = await getCurrentIdentity()
  if (!identity) {
    return (await auth()).redirectToSignIn()
  }

  /* Check access and load the sidebar lists together */
  const [activeProject, { myProjects, sharedProjects }] = await Promise.all([
    findAccessibleProject(roomId, identity),
    getProjectLists(identity),
  ])

  /* Missing and forbidden projects look the same, so existence stays hidden */
  if (!activeProject) {
    return <AccessDenied />
  }

  /* Render the workspace with this room open */
  return (
    <EditorWorkspace
      myProjects={myProjects}
      sharedProjects={sharedProjects}
      activeProject={activeProject}
    />
  )
}
