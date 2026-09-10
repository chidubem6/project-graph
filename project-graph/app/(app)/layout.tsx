import { auth } from "@clerk/nextjs/server"

import { SidebarNav } from "@/components/app-shell/sidebar-nav"

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
    <div className="flex min-h-svh">
      <SidebarNav />
      <main className="min-w-0 flex-1 px-6 py-8">{children}</main>
    </div>
  )
}
