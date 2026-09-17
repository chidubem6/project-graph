# Progress Tracker

Update this file whenever the current phase, active feature, or implementation state changes.

## Current Phase

- Auth — Clerk wiring (done)

## Current Goal

- Pick the next feature spec after 03 Auth.

## Completed

- 01 Design system (`context/feature-specs/01-design-system.md`)
  - shadcn/ui primitives added via CLI, unmodified: Card, Dialog, Tabs, Textarea, ScrollArea (Button, Input already present).
  - `lucide-react` installed.
  - `lib/utils.ts` exports `cn()` (re-export of shadcn's `cn` package).
  - `app/globals.css` now holds the `ui-context.md` dark tokens; shadcn semantic variables map onto them; light theme removed.
  - `<html>` carries the `dark` class so components' `dark:` variants apply.
  - Verified: `tsc`, `eslint` and `next build` pass with a page importing all seven primitives; `cn()` merge checks pass; `/sign-in` renders dark (body `#080809`, `color-scheme: dark`).

- 02 Editor chrome (`context/feature-specs/02-editor.md`)
  - [x] `components/editor/editor-navbar.tsx` — `h-14` grid bar with left/center/right sections; left holds the sidebar toggle (`PanelLeftOpen` / `PanelLeftClose`, `aria-expanded`); center and right empty; `bg-base` + `border-surface-border` bottom border. Props: `isSidebarOpen`, `onToggleSidebar`.
  - [x] `components/editor/project-sidebar.tsx` — `absolute` overlay (needs a `relative` workspace parent), slides in from the left via `translate-x`, `inert` + `aria-hidden` when closed; `isOpen` / `onClose` props; `Projects` header + close button; Tabs (My Projects, Shared) with empty placeholders; full-width `New Project` button with `Plus` icon (no handler yet).
  - [x] Dialog pattern — `components/editor/editor-dialog.tsx` (`EditorDialog`): wraps the stock shadcn Dialog with token styling (`rounded-3xl`, `bg-elevated`, backdrop blur); props `open`, `onOpenChange`, `title`, `description?`, `footer?`, `children`. No concrete dialogs built.
  - [x] Verified: `tsc` and `eslint` pass, `next build` passes; on a temporary page (since removed) the sidebar opened/closed without shifting content, tabs and empty states rendered, and the dialog showed title, description and footer actions.

- 03 Auth (`context/feature-specs/03-auth.md`)
  - [x] `@clerk/ui` installed. `lib/clerk-appearance.ts` exports `clerkAppearance`: Clerk's `dark` theme plus variables that point at `globals.css` tokens (`var(--accent-primary)`, `var(--bg-surface)`, ...). `ClerkProvider` in `app/layout.tsx` takes it, so the auth pages and `UserButton` share it. `colorBorder` is left unset on purpose (Clerk renders it at ~10% alpha, which hid `--border-default`), so borders come from `colorNeutral`.
  - [x] Custom passwordless flow removed (`components/auth/*`, `/sso-callback`, `/sign-in/continue`). `app/(auth)/sign-in/[[...sign-in]]` and `app/(auth)/sign-up/[[...sign-up]]` render stock `<SignIn>` / `<SignUp>`, and Clerk handles SSO callbacks under those catch-alls.
  - [x] `app/(auth)/layout.tsx` — two panels on `lg+` (wordmark, tagline and a text-only feature list on `bg-surface`; form centered on the right); form only below `lg`. No gradients or cards.
  - [x] `proxy.ts` — public routes are built from `NEXT_PUBLIC_CLERK_SIGN_IN_URL` / `NEXT_PUBLIC_CLERK_SIGN_UP_URL` (with `(.*)` for nested steps) plus `/__clerk`. Everything else, including `/`, calls `auth.protect()`.
  - [x] `/` redirects to `/editor` when signed in and to `/sign-in` otherwise. The old landing page was removed.
  - [x] `/editor` — `app/editor/page.tsx` renders `components/editor/editor-workspace.tsx` (client component; owns sidebar state; mounts `EditorNavbar` + `ProjectSidebar`). `UserButton` sits in the navbar's right section.
  - [x] Env values changed, names unchanged: `NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up`, and both fallback redirects `=/editor`, in `.env.local` and `.env.example`.
  - [x] Follow-up: removed the dashboard (`app/(app)/*` incl. its layout, `components/app-shell/*`, `components/dashboard/*`); `/editor` is the only signed-in surface. App renamed to **Structured** (metadata title, auth wordmark, token comment, `package.json` name `structured`).
  - [x] Verified: `tsc`, `eslint` and `next build` pass. In a browser, signed-out `/editor` redirects to `/sign-in?redirect_url=...`. `/sign-in` shows two panels at 1440px. `/sign-up` shows the form only at 390px with no horizontal scroll. Colors come from the tokens. Not yet exercised: the signed-in path (`/` → `/editor`, `UserButton` menu), because no test account was available.

## In Progress

- None.

## Next Up

- Add the next planned feature unit here.

## Open Questions

- The Clerk instance's application name is still "Project Graph" (the sign-in card reads "Sign in to Project Graph"). Rename it to Structured in the Clerk dashboard.
- `docs/adr/0001-v1-technology-foundations.md` still lists email/password auth. Whether a password field appears is now controlled by the Clerk dashboard settings.

## Architecture Decisions

- `cn()` is backed by shadcn's `cn` npm package (replaces `clsx` + `tailwind-merge`, both removed). Since Sept 2026 the shadcn registry generates `import { cn } from "cn"`; older components import `@/lib/utils`, which re-exports the same function, so both paths use one implementation.
- Dark only: design tokens live on `:root` in `globals.css`; there is no `.dark` override block. Token utilities: `bg-base|surface|elevated|subtle`, `text-copy-primary|secondary|muted|faint`, `border-surface-border`, `border-surface-border-subtle`, `text-brand`/`bg-brand`, `bg-accent-dim`, `ai`, `ai-text`, `error`, `success`, `warning`.
- Auth UI is Clerk's prebuilt components on separate `/sign-in` and `/sign-up` pages (replacing the earlier single custom passwordless page). Clerk styling goes only through `clerkAppearance` variables; Clerk internals are not restyled.

## Session Notes

- Spec 03 conflicted with the existing custom auth flow, the single-page sign-in decision and the missing `/editor` route. Resolved with Chidubem: use Clerk components, add a separate `/sign-up`, and create a minimal `/editor`.
- Spec 02 does not define an editor route, so the chrome components are not mounted anywhere yet. (Superseded by 03: `/editor` now mounts them.)
- Spec 01 referred to an "existing dark theme in `globals.css`", but the file still had shadcn's stock light theme; the dark tokens were taken from `ui-context.md`. Existing auth/dashboard pages (both since replaced/removed) switched to dark as a result.
- Installing Dialog prompts to overwrite `button.tsx`; answer no. `components/ui/input-otp.tsx` carries custom OTP cell styling from the auth PR, so never re-add it with `--overwrite`.
