# Progress Tracker

Update this file whenever the current phase, active feature, or implementation state changes.

## Current Phase

- 06 Project APIs — backend REST routes for listing, creating, renaming and deleting projects (done)

## Current Goal

- Pick the next feature spec after 06 Project APIs (likely wiring the editor's project list and dialogs to the API, replacing `lib/mock-projects.ts`).

## Completed

- 01 Design system (`context/feature-specs/01-design-system.md`)
  - shadcn/ui primitives added via CLI, unmodified: Card, Dialog, Tabs, Textarea, ScrollArea (Button, Input already present).
  - `lucide-react` installed.
  - `cn()` comes straight from the `cn` npm package; there is no `lib/utils.ts` wrapper.
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
  - [x] `proxy.ts` — public routes are built from `NEXT_PUBLIC_CLERK_SIGN_IN_URL` / `NEXT_PUBLIC_CLERK_SIGN_UP_URL` (falling back to `/sign-in` / `/sign-up` when unset, with `(.*)` for nested steps) plus `/__clerk`. Everything else, including `/`, calls `auth.protect()`.
  - [x] `/` redirects to `/editor` when signed in and to `/sign-in` otherwise. The old landing page was removed.
  - [x] `/editor` — `app/editor/page.tsx` renders `components/editor/editor-workspace.tsx` (client component; owns sidebar state; mounts `EditorNavbar` + `ProjectSidebar`). `UserButton` sits in the navbar's right section.
  - [x] Env values changed, names unchanged: `NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up`, and both fallback redirects `=/editor`, in `.env.local` and `.env.example`.
  - [x] Follow-up: removed the dashboard (`app/(app)/*` incl. its layout, `components/app-shell/*`, `components/dashboard/*`); `/editor` is the only signed-in surface. App renamed to **Structured** (metadata title, auth wordmark, token comment, `package.json` name `structured`).
  - [x] Verified: `tsc`, `eslint` and `next build` pass. In a browser, signed-out `/editor` redirects to `/sign-in?redirect_url=...`. `/sign-in` shows two panels at 1440px. `/sign-up` shows the form only at 390px with no horizontal scroll. Colors come from the tokens. Not yet exercised: the signed-in path (`/` → `/editor`, `UserButton` menu), because no test account was available.

- 04 Project dialogue (`context/feature-specs/04-project-dialogue.md`)
  - [x] `components/editor/editor-home.tsx` — centered empty state on `/editor`: heading, description and a `New Project` button with a `Plus` icon. No cards, no navbar/sidebar changes.
  - [x] `hooks/use-project-dialogs.ts` — single owner of dialog kind (`create` | `rename` | `delete`), target project, shared name input, derived slug and `isSubmitting`. Closing leaves form values in place so they don't flicker during the exit animation; each open resets what it needs. `submit()` is async and holds `isSubmitting` past the close (the next open clears it), plus a ref guard against double-clicks landing in one frame — persistence lands with the project API slice at the marked `TODO`.
  - [x] `lib/project-slug.ts` — `toProjectSlug()`: lowercase, expand the non-decomposable Latin letters (`ß ø æ œ ł đ ð þ`), strip diacritics (NFD), non-alphanumerics to hyphens, trim hyphens. A name that transliterates to nothing falls back to a deterministic `project-<djb2 base36>` so the create dialog can still accept it. Checked against "Payments API v2" → `payments-api-v2`, "Ünïcode Test" → `unicode-test`, "Straße" → `strasse`, "決済基盤" → `project-<hash>`, "###" → `project-<hash>`, "" → `""`.
  - [x] `lib/mock-projects.ts` + `types/project.ts` — `MY_PROJECTS` / `SHARED_PROJECTS` stand-ins. Ownership is not a field on `Project`: it comes from the list a project is in, so the sidebar passes rename/delete handlers only for owned projects.
  - [x] `components/editor/project-dialogs.tsx` — all three dialogs in one client component driven by the hook's state; the editor workspace mounts it once as `<ProjectDialogs dialogs={dialogs} />`.
    - Create: name input plus a live `Slug <value>` line in mono that updates on every keystroke; confirm disabled while the slug is empty.
    - Rename: prefilled input, current name in the description, `initialFocus` on the input, and a `<form>` so Enter submits (the footer button uses `form="rename-project-form"`).
    - Delete: confirmation copy only, no input, `variant="destructive"` confirm.
  - [x] `project-sidebar.tsx` — project lists with per-item rename/delete icon buttons (owned tab only; the Shared tab renders names with no actions), a mobile-only backdrop scrim (`md:hidden`) that closes the sidebar on an outside tap, and `New Project` wired to the create dialog.
  - [x] `editor-dialog.tsx` — added an optional `initialFocus` prop forwarded to the Base UI popup.
  - [x] Verified: `tsc`, `eslint` and `next build` pass. Driven in a browser through a temporary public `/preview-check` route (since removed, proxy restored): editor home renders, both `New Project` entry points open the create dialog, the slug preview tracks typing, rename prefills/auto-focuses and submits on Enter, delete shows the destructive confirm, shared projects show no actions, and at 390px tapping the scrim closes the sidebar. Console clean apart from Clerk's pre-existing dev-keys warning.

- 05 Prisma (`context/feature-specs/05-prisma.md`)
  - [x] `prisma/models/project.prisma` (multi-file schema; `prisma/schema.prisma` keeps the generator and datasource). `Project`: `ownerId` (Clerk user ID), `name`, optional `description`, `status` (`ProjectStatus` enum `DRAFT` | `ARCHIVED`, default `DRAFT`), optional `canvasJsonPath`, `createdAt`/`updatedAt`; indexes on `ownerId` and `createdAt`. `ProjectCollaborator`: `project` relation with `onDelete: Cascade`, `email`, `createdAt`; unique `[projectId, email]`; indexes on `email` and `[projectId, createdAt]`. The only fields beyond the spec are the ones Prisma requires: the `cuid()` `id` on each model and the `Project.collaborators` back-relation.
  - [x] `lib/prisma.ts` exports one `prisma` instance. A `DATABASE_URL` starting with `prisma+postgres://` goes to `new PrismaClient({ accelerateUrl })` (built into Prisma 7, so no `@prisma/extension-accelerate`); anything else goes to `@prisma/adapter-pg`. Outside production the instance is cached on `globalThis`, so hot reloads reuse it. Throws if `DATABASE_URL` is unset.
  - [x] Client generated to `app/generated/prisma` (gitignored), imported as `@/app/generated/prisma/client`.
  - [x] `prisma7.config.ts` loads `.env.local` before `.env`, matching Next.js precedence. Before this change the CLI read only `.env`, which holds a local `prisma dev` URL, while the app reads the remote Prisma Postgres URL in `.env.local`, so they would have hit different databases. Chidubem chose the remote database.
  - [x] Migration `20260918035438_init` applied to the remote Prisma Postgres (the database was empty beforehand).
  - [x] Verified: `prisma validate`, `tsc`, `eslint` and `npm run build` pass. A throwaway script run against the migrated database showed that repeated imports return the same instance and it is cached on `globalThis`, `status` defaults to `DRAFT`, a duplicate project/email fails with `P2002`, and deleting a project cascades to its collaborators. The test row was removed. The Accelerate branch constructs a client, but it has not been queried because the local `prisma dev` server was not running.

- 06 Project APIs (`context/feature-specs/06-project-apis.md`)
  - [x] `app/api/projects/route.ts` — `GET` returns `{ projects }` for `ownerId = userId`, newest first (`createdAt desc`). `POST` returns `201 { project }`; `ownerId` is the Clerk user ID; no `id` is passed, so the schema's `cuid()` default assigns it. A missing, empty or whitespace-only `name` becomes `Untitled Project`; other names are trimmed.
  - [x] `app/api/projects/[projectId]/route.ts` — `PATCH` takes `{ name }` (required, trimmed, non-empty) and returns `{ project }`; `DELETE` returns `204` with no body (collaborators cascade). Both run `denyUnlessOwner` first (404 if the project doesn't exist, 403 if someone else owns it). In `PATCH` it runs before the body is parsed, so a non-owner gets 403 even when the body is invalid (a CodeRabbit finding: originally a bad body returned 400 first). The write itself also filters on `ownerId`, so a project deleted between the check and the write returns 404 (Prisma `P2025`) rather than 500.
  - [x] Shared helpers in `lib/`: `api-response.ts` (`errorResponse`, error body is always `{ error }`), `request-body.ts` (`readJsonObject`: an empty body reads as `{}`, a non-object or invalid JSON returns 400), `project-name.ts` (`DEFAULT_PROJECT_NAME`, create/rename parsing), `project-ownership.ts` (`denyUnlessOwner`, `isRecordNotFound`).
  - [x] `proxy.ts` — signed-out requests to `/api(.*)` get `401 { error: "Unauthorized" }` from the proxy. Before this, `auth.protect()` answered them with 404. Pages still use `auth.protect()`. Each handler also checks `auth()` itself, because it needs `userId`.
  - [x] Verified: `npm run build` (both routes listed as dynamic), `tsc` and `eslint` pass. Against `next start`, signed-out `GET`/`POST`/`PATCH`/`DELETE` all return `401` JSON from the proxy. The handlers were then called against the migrated database with Clerk's `auth()` stubbed to two throwaway user IDs, and all 23 checks passed: 401 when signed out; create with no body, a blank name and a trimmed name; `cuid` IDs; 400 for a non-string name, invalid JSON, an array body and an empty or missing rename; each user lists only their own projects; a non-owner's `PATCH`/`DELETE` returns 403 and leaves the row unchanged; the owner can rename (200) and delete (204); a missing project returns 404. The test rows were removed afterwards. Not exercised: a real Clerk session end to end (still no test account).

## In Progress

- None.

## Next Up

- Add the next planned feature unit here.

## Open Questions

- The Clerk instance's application name is still "Project Graph" (the sign-in card reads "Sign in to Project Graph"). Rename it to Structured in the Clerk dashboard.
- `docs/adr/0001-v1-technology-foundations.md` still lists email/password auth. Whether a password field appears is now controlled by the Clerk dashboard settings.
- The generated Prisma client (`app/generated/prisma`) is gitignored, so a fresh clone or a Vercel build only works if something runs `prisma generate` first. Common fixes are a `postinstall` script or `prisma generate && next build`. Not added, because spec 05 doesn't cover it.
- `pg` warns that `sslmode=require` in the remote `DATABASE_URL` is treated as `verify-full` today and will change meaning in pg v9. Setting `sslmode=verify-full` explicitly keeps the current behaviour.
- `GET /api/projects` returns owned projects only. Collaborator (shared) projects are matched by email, which the API would need to read from Clerk. That belongs to whichever spec wires up the Shared tab.
- Project names have no maximum length: spec 06 doesn't set one and the column is unbounded `text`. Add a limit if a later spec asks for one.
- `.env` still holds the local `prisma dev` URL. Both the CLI and the app now take `DATABASE_URL` from `.env.local`, so that value is only used if `.env.local` drops its `DATABASE_URL`.

## Architecture Decisions

- API routes answer signed-out requests with `401` JSON from `proxy.ts`, not `auth.protect()` (which returns 404 for non-page requests). The proxy still denies by default, so a new API route is guarded as soon as it exists. Handlers still call `auth()` for the `userId`. API error bodies are always `{ error: string }`. Owner-only mutations call `denyUnlessOwner` and also scope the write to `{ id, ownerId }`.
- Prisma CLI and the Next.js app must read the same `DATABASE_URL`: `prisma7.config.ts` loads `.env.local` then `.env`, and dotenv keeps the first value, the same precedence Next.js uses. Schema files live under `prisma/` (the config points at the folder), with models in `prisma/models/*.prisma`.

- Project dialog state lives in one hook (`hooks/use-project-dialogs.ts`) rather than in the sidebar, so the editor home and the sidebar open the same dialogs. The dialogs themselves are presentational and take values plus callbacks.
- Project ownership is a list, not a flag: the sidebar renders rename/delete only for the list it is given handlers for. When the API slice lands, "owned" becomes whatever the server returns for the signed-in user.
- The project sidebar hides its closed state with `inert` alone. `aria-hidden` was removed because Chrome warns when a focused descendant is hidden that way — which now happens whenever the mobile scrim closes the sidebar while a project action button has focus.
- `cn()` is the `cn` npm package (replaces `clsx` + `tailwind-merge`, both removed). Every file imports it directly as `import { cn } from "cn"` — the `lib/utils.ts` re-export was deleted on 2026-09-17 so there is one spelling. `shadcn add` only rewrites `@/`-prefixed specifiers, so a newly added component may still arrive importing `@/lib/utils`; rewrite that line to `"cn"`. If a wrapped engine is ever needed (`createEngine`/`CnConfig`), reintroduce `lib/utils.ts` and switch every import back to it rather than having two spellings.
- Dark only: design tokens live on `:root` in `globals.css`; there is no `.dark` override block. Token utilities: `bg-base|surface|elevated|subtle`, `text-copy-primary|secondary|muted|faint`, `border-surface-border`, `border-surface-border-subtle`, `text-brand`/`bg-brand`, `bg-accent-dim`, `ai`, `ai-text`, `error`, `success`, `warning`.
- Auth UI is Clerk's prebuilt components on separate `/sign-in` and `/sign-up` pages (replacing the earlier single custom passwordless page). Clerk styling goes only through `clerkAppearance` variables; Clerk internals are not restyled.

## Session Notes

- Spec 04's loading state was initially dead: `submit()` set `isSubmitting` and then called `closeDialog()`, which cleared it in the same React batch, so no render ever observed it and every `disabled={... || isSubmitting}` was decorative. `submit()` is now async, `closeDialog()` no longer clears the flag, and the open handlers do — so the disabled wiring is real before persistence arrives rather than needing a rewrite after.
- The create dialog gates on `name.trim()`, not on `slug`. Gating on the slug meant any name with no ASCII alphanumerics (CJK, Cyrillic, punctuation-only) produced an empty slug and a permanently inert confirm button with no error text, `aria-invalid` or `aria-describedby` to explain it — a dead end for every user. Rename already gated on the name, so the two dialogs now agree.
- Per spec, only the rename dialog submits on Enter; the create dialog submits from its footer button. Worth revisiting for consistency once both hit the API.
- `/editor` is behind Clerk and there is still no test account, so browser checks run through a temporary public route (`app/preview-check` + one public matcher in `proxy.ts`) that is deleted afterwards.
- Spec 03 conflicted with the existing custom auth flow, the single-page sign-in decision and the missing `/editor` route. Resolved with Chidubem: use Clerk components, add a separate `/sign-up`, and create a minimal `/editor`.
- Spec 02 does not define an editor route, so the chrome components are not mounted anywhere yet. (Superseded by 03: `/editor` now mounts them.)
- Spec 01 referred to an "existing dark theme in `globals.css`", but the file still had shadcn's stock light theme; the dark tokens were taken from `ui-context.md`. Existing auth/dashboard pages (both since replaced/removed) switched to dark as a result.
- Installing Dialog prompts to overwrite `button.tsx`; answer no. `components/ui/input-otp.tsx` carries custom OTP cell styling from the auth PR, so never re-add it with `--overwrite`.
