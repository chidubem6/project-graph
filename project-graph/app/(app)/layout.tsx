import Link from "next/link"
import { UserButton } from "@clerk/nextjs"
import { auth } from "@clerk/nextjs/server"

// Guarding the route group rather than the individual page means /projects/[projectId]
// is protected the moment it lands, without repeating the check.
export default async function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const { isAuthenticated, redirectToSignIn } = await auth()
  if (!isAuthenticated) return redirectToSignIn()

  return (
    <div className="flex min-h-svh flex-col">
      <header className="flex h-16 shrink-0 items-center justify-between border-b border-border px-6">
        <Link
          href="/dashboard"
          className="text-base font-semibold tracking-tight"
        >
          Structred.
        </Link>
        <UserButton />
      </header>

      <main className="flex-1 px-6 py-8">{children}</main>
    </div>
  )
}
