import Link from "next/link"
import { Show, UserButton } from "@clerk/nextjs"

import { Button } from "@/components/ui/button"

export default function LandingPage() {
  return (
    <div className="flex min-h-svh flex-col">
      <header className="flex h-16 items-center justify-between px-6">
        <Link href="/" className="text-base font-semibold tracking-tight">
          Structred.
        </Link>
        <nav className="flex items-center gap-2">
          <Show when="signed-out">
            <Button
              size="lg"
              render={<Link href="/sign-in" />}
              nativeButton={false}
            >
              Get started
            </Button>
          </Show>
          <Show when="signed-in">
            <UserButton />
          </Show>
        </nav>
      </header>

      <main className="flex flex-1 flex-col items-center justify-center gap-6 px-6 pb-24 text-center">
        <h1 className="max-w-2xl text-4xl font-bold tracking-tight text-balance sm:text-5xl">
          Describe the thing you want to build. Get the plan.
        </h1>
        <p className="max-w-lg text-base text-muted-foreground">
          Structred turns a product description into a graph of goals,
          capabilities, decisions and tasks — so you can see what to build next.
        </p>
        <Show when="signed-out">
          <Button
            size="lg"
            render={<Link href="/sign-in" />}
            nativeButton={false}
            className="h-11 px-6 text-base"
          >
            Get started
          </Button>
        </Show>
        <Show when="signed-in">
          <Button
            size="lg"
            render={<Link href="/dashboard" />}
            nativeButton={false}
            className="h-11 px-6 text-base"
          >
            Go to dashboard
          </Button>
        </Show>
      </main>
    </div>
  )
}
