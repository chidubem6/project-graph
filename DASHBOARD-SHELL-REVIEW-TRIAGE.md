# Dashboard shell PR triage — `feat/dashboard-shell` (#3)

Follow-ups from the review of PR #3, squash-merged to `master` as `8e27968` on 2026-09-17. Two review
subagents (auth/routing, UI) plus a manual pass found nothing blocking, so everything below was deferred
past the merge — except #0, which the review missed and was found after the merge.
Working through one at a time: tick the box, fill in **Decision**, move on.

Legend: `[ ]` open · `[x]` done · `[~]` won't fix / deferred

`tsc --noEmit`, `eslint` and `next build` were clean at merge. The repo has no CI checks.

---

## Blocking — found after merge

### [ ] 0. Proxy blocks `/sso-callback`, breaking social sign-in on `master`
**Where:** `project-graph/proxy.ts:6-11`

The branch was cut from `b2f0f31`. PR #2 (social auth, `171e4d8`) landed on `master` afterwards and added
`app/(auth)/sso-callback/page.tsx`. GitHub reported the squash merge as clean — no textual conflict — but
the two changes conflict semantically. Deny-by-default only allows `/`, `/sign-in(.*)` and `/__clerk(.*)`.
`social-sign-in.tsx:27` sends the provider round trip back to `/sso-callback`, which is where
`finalizeSignIn()` activates the session, so the user has no session on arrival. `auth.protect()`
therefore redirects them to `/sign-in` before the callback page renders, and the OAuth flow never
completes. `/sign-in/continue` is unaffected — `(auth)` is a route group, so its URL already falls under
`/sign-in(.*)`.

Why the review missed it: both it and the subagents reviewed `git diff master...HEAD` (three-dot), which
excludes changes that landed on `master` after the branch point. The branch was never rebased or built
against current `master` before merging. Worth changing the habit: rebase (or check out the merge result)
and review/build that before squash-merging.

The auth subagent's conclusions ("no other public route needed; social buttons removed per auth triage
#3") were true of the branch and false of `master`.

**Fix sketch:** add `'/sso-callback'` to `isPublicRoute`. Then check a Google/GitHub sign-in end to end
in a signed-out browser.

**Decision:**

---

## Should-fix

### [ ] 1. Clerk may override the Tailwind classes on `UserButton`
**Where:** `project-graph/components/app-shell/sidebar-nav.tsx:26-33`

Tailwind v4 emits utilities inside `@layer utilities`. Clerk injects its styles unlayered, and unlayered
CSS always beats layered CSS regardless of specificity. The root `ClerkProvider` (`app/layout.tsx:32`)
sets no `appearance.cssLayerName`, so wherever Clerk sets the same property, `px-2.5 py-2`,
`justify-start` and `max-md:justify-center` silently do nothing.

The mechanism is certain; which properties Clerk actually sets is not — its UI loads from CDN and is not
in `node_modules`. **Verify in a browser first**, at both `md` and collapsed widths.

**Fix sketch:** `appearance={{ cssLayerName: "clerk" }}` on `ClerkProvider`, plus
`@layer theme, base, clerk, components, utilities;` at the top of `globals.css`.

**Decision:**

---

### [ ] 2. "Last updated" was removed but the spec requires it
**Where:** `9d45141` — `project-card.tsx`, `mock-projects.ts`, `dashboard/page.tsx`, deleted
`lib/format-relative-time.ts`

`docs/Structured v0.1 Build Specification.md` (`/dashboard` section) says each card shows name, **last
updated time**, and a link. The label was dropped in the last commit of the PR. Either the spec changes
or the label comes back.

If it comes back: the deleted version formatted on the server and passed `updatedLabel` down as a string,
which is what avoided a hydration mismatch in the client-filtered grid — keep that shape. It is in
history at `b368570:project-graph/lib/format-relative-time.ts`.

**Decision:**

---

### [ ] 3. `redirect_url` handling now comes due with the next route
**Where:** `project-graph/proxy.ts`; see `AUTH-REVIEW-TRIAGE.md` #12

The proxy is now deny-by-default, so any new route under `(app)` is protected the moment it lands — and
from then on a signed-out user who follows a deep link signs in and is dumped on `/dashboard`. #12 said
"not worth fixing until there is a second protected route"; this PR makes that the very next route,
and every project card already links to `/projects/[id]`. Fix before or with that page. The open-redirect
warning in #12 still applies.

**Decision:**

---

## Accessibility

### [ ] 4. Collapsed logo link is announced as "S."
**Where:** `project-graph/components/app-shell/sidebar-nav.tsx:14-15`

Below `md` the only visible text is `S.`, and the full name is `display:none`, so that is the accessible
name.

**Fix sketch:** `aria-label="Structred home"` on the `Link`.

**Decision:**

---

### [ ] 5. "No matches" may not be announced
**Where:** `project-graph/components/dashboard/projects-section.tsx:57`

The `role="status"` element is mounted together with its text. Several screen readers only announce
changes to a live region that already existed, so the message can go unread.

**Fix sketch:** always render the status element and only swap its text.

**Decision:**

---

## Leftovers from removing "last updated"

Moot if #2 restores the label.

### [ ] 6. Card sizing was built around the removed footer
**Where:** `project-graph/components/dashboard/project-card.tsx:13`, comment at `:18-19`

`min-h-36 flex-col` existed so the footer's `mt-auto` could pin to the bottom. Without it, short cards
leave dead space. The clamp comment also claims clamping keeps a row level, but grid rows stretch anyway.

**Decision:**

---

### [ ] 7. Identity `.map` and duplicate types
**Where:** `project-graph/app/(app)/dashboard/page.tsx:15-19`, `mock-projects.ts:8`, `project-card.tsx:3`

The `.map` now copies `id`/`name`/`description` unchanged, and `DashboardProject` is field-for-field
`DashboardProjectView`. Pass `mockProjects` straight through and keep one type. Probably moot once the
Drizzle query replaces the fixture.

**Decision:**

---

## Nits

### [ ] 8. `/__clerk` allowlist comment gives the wrong reason
**Where:** `project-graph/proxy.ts:9`

"Protecting it would loop" is not what happens. `clerkMiddleware.js:67-76` answers `/__clerk` requests
itself before the handler runs, so the entry is a no-op with the auto-proxy on, and there is no route
there with it off (dev keys). Harmless to keep; the comment should say why it is really there, or the
entry should go.

**Decision:**

---

### [ ] 9. `'/sign-in(.*)'` also matches `/sign-in-anything`
**Where:** `project-graph/proxy.ts:8`

No such route today, but a future `/sign-in-*` route would be public without anyone noticing — the exact
failure deny-by-default exists to prevent.

**Fix sketch:** `'/sign-in'` and `'/sign-in/(.*)'`.

**Decision:**

---

### [ ] 10. `currentUser()` hits the Backend API on every dashboard render
**Where:** `project-graph/app/(app)/dashboard/page.tsx:9`

A rate-limited network call just for `firstName`.

**Fix sketch:** add `firstName` to the session token claims in the Clerk dashboard and read it from
`auth()`.

**Decision:**

---

### [ ] 11. `focus-visible:border-ring` on borderless elements
**Where:** `nav-links.tsx:34`, `sidebar-nav.tsx:12`, `project-card.tsx:13`

No border to recolour, so the class does nothing. The ring still shows; focus is visible. Shadcn
copy-paste residue.

**Decision:**

---

### [ ] 12. Avatar overflows the collapsed trigger
**Where:** `project-graph/components/app-shell/sidebar-nav.tsx:28`

In the 40px rail, `px-2.5` (20px) plus a ~28px avatar is wider than the box; the avatar pokes ~4px past
the hover background on each side. Only real if the classes apply — see #1.

**Decision:**

---

### [ ] 13. Active nav state is exact-match only
**Where:** `project-graph/components/app-shell/nav-links.tsx`

`pathname === link.href` means "Projects" loses its highlight inside `/projects/[id]`. Not visible until
that route exists.

**Decision:**

---

## Correction to `AUTH-REVIEW-TRIAGE.md` #2

Found by the auth review subagent; information only, still unreachable while no session tasks are
enabled.

#2 predicts a redirect *loop* for a pending session. The actual behaviour differs: `createRedirect` in
`@clerk/backend` (`dist/chunk-J7OY4GB3.mjs`) sends pending sessions to `${signInUrl}/tasks`, i.e.
`/sign-in/tasks`. The allowlist lets that through, but `app/sign-in/page.tsx` is not a catch-all, so the
user gets a **404**, not a loop. With deny-by-default this now applies to every non-public route, not just
`/dashboard`.
