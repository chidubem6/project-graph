import { auth } from "@clerk/nextjs/server"
import { redirect } from "next/navigation"

export default async function RootPage() {
  const { isAuthenticated } = await auth()

  redirect(isAuthenticated ? "/editor" : "/sign-in")
}
