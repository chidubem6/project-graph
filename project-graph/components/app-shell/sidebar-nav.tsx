import Link from "next/link"
import { UserButton } from "@clerk/nextjs"

import { NavLinks } from "@/components/app-shell/nav-links"

export function SidebarNav() {
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

      <div className="mt-4 flex-1 overflow-y-auto">
        <NavLinks />
      </div>

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
