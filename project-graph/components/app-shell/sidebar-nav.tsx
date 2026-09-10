"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { UserButton } from "@clerk/nextjs"
import { FolderIcon, LayoutTemplateIcon, SettingsIcon } from "lucide-react"

import { cn } from "@/lib/utils"

type NavItem = {
  href: string
  label: string
  icon: React.ComponentType<{ className?: string }>
  // Matching is per-item rather than a plain href comparison because Projects
  // has to stay selected inside a project workspace, which lives under
  // /projects/[projectId] rather than under the list route itself.
  matches: (pathname: string) => boolean
}

const NAV_ITEMS: NavItem[] = [
  {
    href: "/dashboard",
    label: "Projects",
    icon: FolderIcon,
    matches: (pathname) =>
      pathname === "/dashboard" || pathname.startsWith("/projects"),
  },
  {
    href: "/dashboard/templates",
    label: "Templates",
    icon: LayoutTemplateIcon,
    matches: (pathname) => pathname.startsWith("/dashboard/templates"),
  },
  {
    href: "/dashboard/settings",
    label: "Settings",
    icon: SettingsIcon,
    matches: (pathname) => pathname.startsWith("/dashboard/settings"),
  },
]

export function SidebarNav() {
  const pathname = usePathname()

  return (
    // Collapses to an icon rail below md rather than into a drawer, so the nav
    // stays reachable on a phone without any open/close state to manage.
    <aside className="sticky top-0 flex h-svh w-14 shrink-0 flex-col border-r border-border p-2 md:w-60 md:p-3">
      <Link
        href="/dashboard"
        className="flex h-10 shrink-0 items-center rounded-lg px-2.5 text-base font-semibold tracking-tight outline-none max-md:justify-center focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        <span className="md:hidden">S.</span>
        <span className="max-md:hidden">Structred.</span>
      </Link>

      <nav className="mt-4 flex flex-1 flex-col gap-1 overflow-y-auto">
        {NAV_ITEMS.map(({ href, label, icon: Icon, matches }) => {
          const isActive = matches(pathname)

          return (
            <Link
              key={href}
              href={href}
              aria-current={isActive ? "page" : undefined}
              // The label is the only affordance once the rail collapses.
              title={label}
              className={cn(
                "flex h-9 items-center gap-2.5 rounded-lg px-2.5 text-sm font-medium transition-colors outline-none max-md:justify-center",
                "focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
                isActive
                  ? "bg-muted text-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <Icon className="size-4 shrink-0" />
              <span className="max-md:hidden">{label}</span>
            </Link>
          )
        })}
      </nav>

      <div className="shrink-0 border-t border-border pt-2">
        <UserButton
          showName
          appearance={{
            elements: {
              rootBox: "w-full",
              userButtonTrigger:
                "w-full justify-start gap-2.5 rounded-lg px-2.5 py-2 hover:bg-muted max-md:justify-center",
              // The name would overflow the collapsed rail, so it drops with the
              // other labels and the avatar carries the affordance alone.
              userButtonOuterIdentifier: "truncate text-sm max-md:hidden",
            },
          }}
        />
      </div>
    </aside>
  )
}
