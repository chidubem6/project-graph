export default function SettingsPage() {
  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
      <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>

      {/* Placeholder so the sidebar link resolves. Account settings live in Clerk's
          UserButton popover for now; app-level settings arrive with the features
          that need them. */}
      <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-border px-6 py-16 text-center">
        <p className="text-sm text-muted-foreground">
          There aren&apos;t any settings to change yet.
        </p>
      </div>
    </div>
  )
}
