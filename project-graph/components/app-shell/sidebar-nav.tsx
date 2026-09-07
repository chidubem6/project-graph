"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
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
    href: "/templates",
    label: "Templates",
    icon: LayoutTemplateIcon,
    matches: (pathname) => pathname.startsWith("/templates"),
  },
  {
    href: "/settings",
    label: "Settings",
    icon: SettingsIcon,
    matches: (pathname) => pathname.startsWith("/settings"),
  },
]

export function SidebarNav() {
  const pathname = usePathname()

  return (
    <nav className="flex flex-col gap-1">
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
  )
}
