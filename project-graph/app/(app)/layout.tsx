import { auth } from "@clerk/nextjs/server"

import { SidebarNav } from "@/components/app-shell/sidebar-nav"

// proxy.ts is the actual gate — layouts and pages render in parallel, so a check
// here cannot stop a page from starting its own work. This is defence in depth,
// and it gives the tree a non-null session to read from.
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
