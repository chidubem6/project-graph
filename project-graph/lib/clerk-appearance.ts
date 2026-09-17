import { dark } from "@clerk/ui/themes"

// Clerk's dark theme as the base, with its variables pointed at the design tokens in
// globals.css so the auth pages and user menu stay in sync with the rest of the app.
// colorBorder is left unset on purpose: Clerk renders it at ~10% alpha, which makes
// --border-default invisible, so borders derive from colorNeutral instead.
export const clerkAppearance = {
  theme: dark,
  variables: {
    colorPrimary: "var(--accent-primary)",
    colorPrimaryForeground: "var(--bg-base)",
    colorDanger: "var(--state-error)",
    colorSuccess: "var(--state-success)",
    colorWarning: "var(--state-warning)",
    colorNeutral: "var(--text-primary)",
    colorForeground: "var(--text-primary)",
    colorMutedForeground: "var(--text-muted)",
    colorMuted: "var(--bg-subtle)",
    colorBackground: "var(--bg-surface)",
    colorInput: "var(--bg-elevated)",
    colorInputForeground: "var(--text-primary)",
    colorRing: "var(--accent-primary-dim)",
    colorShimmer: "var(--bg-subtle)",
    colorModalBackdrop: "var(--bg-base)",
    fontFamily: "var(--font-geist-sans)",
    borderRadius: "var(--radius)",
  },
}
