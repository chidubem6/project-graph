"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { FolderIcon, LayoutTemplateIcon, SettingsIcon } from "lucide-react"

import { cn } from "@/lib/utils"

type NavItem = {
  href: string
  label: string
  icon: React.ComponentType<{ className?: string }>
}

// Settings and Templates sit under /dashboard so an exact href comparison is
// enough to pick the active tab — no route prefix overlaps with another.
const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Projects", icon: FolderIcon },
  {
    href: "/dashboard/templates",
    label: "Templates",
    icon: LayoutTemplateIcon,
  },
  { href: "/dashboard/settings", label: "Settings", icon: SettingsIcon },
]

export function NavLinks() {
  const pathname = usePathname()

  return (
    <nav className="flex flex-col gap-1">
      {NAV_ITEMS.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          aria-current={pathname === link.href ? "page" : undefined}
          // The label is the only affordance once the rail collapses.
          title={link.label}
          className={cn(
            "flex h-9 items-center gap-2.5 rounded-lg px-2.5 text-sm font-medium transition-colors outline-none max-md:justify-center",
            "focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
            "text-muted-foreground hover:bg-muted hover:text-foreground",
            {
              "bg-muted text-foreground hover:text-foreground":
                pathname === link.href,
            }
          )}
        >
          <link.icon className="size-4 shrink-0" />
          <span className="max-md:hidden">{link.label}</span>
        </Link>
      ))}
    </nav>
  )
}
