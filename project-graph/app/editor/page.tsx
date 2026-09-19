import { auth } from "@clerk/nextjs/server"

import { EditorWorkspace } from "@/components/editor/editor-workspace"
import { getCurrentIdentity } from "@/lib/project-access"
import { getProjectLists } from "@/lib/projects/queries"

/** Show the editor home with no project open */
export default async function EditorPage() {
  /* Send signed-out visitors to the sign-in page */
  const identity = await getCurrentIdentity()
  if (!identity) {
    return (await auth()).redirectToSignIn()
  }

  const { myProjects, sharedProjects } = await getProjectLists(identity)

  return (
    <EditorWorkspace myProjects={myProjects} sharedProjects={sharedProjects} />
  )
}
