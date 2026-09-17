# Progress Tracker

Update this file whenever the current phase, active feature, or implementation state changes.

## Current Phase

- Editor — base chrome (done)

## Current Goal

- Pick the next feature spec after 02 Editor chrome.

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

## In Progress

- None.

## Next Up

- Add the next planned feature unit here.

## Open Questions

- Add unresolved product or implementation questions here.

## Architecture Decisions

- Add decisions that affect the system design or data model.
- `cn()` is backed by shadcn's `cn` npm package (replaces `clsx` + `tailwind-merge`, both removed). Since Sept 2026 the shadcn registry generates `import { cn } from "cn"`; older components import `@/lib/utils`, which re-exports the same function, so both paths use one implementation.
- Dark only: design tokens live on `:root` in `globals.css`; there is no `.dark` override block. Token utilities: `bg-base|surface|elevated|subtle`, `text-copy-primary|secondary|muted|faint`, `border-surface-border`, `border-surface-border-subtle`, `text-brand`/`bg-brand`, `bg-accent-dim`, `ai`, `ai-text`, `error`, `success`, `warning`.

## Session Notes

- Spec 02 does not define an editor route, so the chrome components are not mounted anywhere yet.

- Spec 01 referred to an "existing dark theme in `globals.css`", but the file still had shadcn's stock light theme; the dark tokens were taken from `ui-context.md`. Existing auth/dashboard pages switched to dark as a result.
- Installing Dialog prompts to overwrite `button.tsx`; answer no. `components/ui/input-otp.tsx` carries custom OTP cell styling from the auth PR, so never re-add it with `--overwrite`.
