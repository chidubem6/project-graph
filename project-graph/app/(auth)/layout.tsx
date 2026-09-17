const features = [
  "Describe a system in plain English",
  "AI maps it onto a shared canvas",
  "Refine the design with collaborators",
  "Generate a technical spec from the graph",
]

export default function AuthLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <div className="grid min-h-svh grid-cols-1 bg-base lg:grid-cols-2">
      <aside className="hidden flex-col justify-center gap-8 border-r border-surface-border bg-surface px-16 lg:flex">
        <span className="text-base font-semibold tracking-tight text-copy-primary">
          Structured<span className="text-brand">.</span>
        </span>

        <div className="flex max-w-sm flex-col gap-3">
          <h1 className="text-2xl font-semibold tracking-tight text-copy-primary">
            Turn a product description into a plan you can build from.
          </h1>
          <ul className="flex flex-col gap-2 text-sm text-copy-muted">
            {features.map((feature) => (
              <li key={feature}>{feature}</li>
            ))}
          </ul>
        </div>
      </aside>

      <main className="flex items-center justify-center px-4 py-6 sm:p-6">
        {children}
      </main>
    </div>
  )
}
