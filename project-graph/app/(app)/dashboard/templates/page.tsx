export default function TemplatesPage() {
  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
      <h1 className="text-2xl font-semibold tracking-tight">Templates</h1>

      {/* Placeholder so the sidebar link resolves. Templates are not part of the
          v0.1 build spec, so there is nothing to build against yet. */}
      <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-border px-6 py-16 text-center">
        <p className="text-sm text-muted-foreground">
          Templates aren&apos;t available yet.
        </p>
      </div>
    </div>
  )
}
