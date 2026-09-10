import { LoginForm } from "@/components/auth/login-form"
import { auth } from "@clerk/nextjs/server"
import { redirect } from "next/navigation"

export default async function LogIn() {
  const { isAuthenticated } = await auth()

  if (isAuthenticated) return redirect("/dashboard")

  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-6 bg-background p-6 md:p-10">
      <div className="w-full max-w-sm">
        <LoginForm />
      </div>
    </div>
  )
}
