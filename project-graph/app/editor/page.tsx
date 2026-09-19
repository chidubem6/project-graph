import { auth, currentUser } from "@clerk/nextjs/server"

import { EditorWorkspace } from "@/components/editor/editor-workspace"
import { getProjectLists } from "@/lib/projects/queries"

/** Show the editor home with no project open */
export default async function EditorPage() {
  /* Send signed-out visitors to the sign-in page */
  const user = await currentUser()
  if (!user) {
    return (await auth()).redirectToSignIn()
  }

  const { myProjects, sharedProjects } = await getProjectLists(user)

  return (
    <EditorWorkspace myProjects={myProjects} sharedProjects={sharedProjects} />
  )
}
