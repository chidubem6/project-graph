# ADR-0001: Build V1 on Next.js, Clerk, Postgres and React Flow

| | |
|---|---|
| **Status** | Accepted |
| **Date** | 2026-09-02 |
| **Deciders** | Chidubem Okafor |
| **Supersedes** | PRD §46.12 (Authentication row) |
| **Superseded by** | — |

## Context

V1 delivers one loop: create project → build graph → save → return. It is built by a
single developer on a greenfield codebase, so every choice below is weighted toward
things one person can hold in their head and operate.

Four constraints did most of the narrowing, and none of them are preferences:

- **Postgres is required.** §46.2's single-parent rule is a partial unique index and
  §46.3's `data` column is JSONB. A database without both cannot express the schema.
- **Nodes must render as React components.** §19's detail card, tag colours (§46.7),
  status and progress chips (§46.4) and cycle warnings (§46.11) are where the interface
  work lives, and they are React.
- **Authentication must be provider-managed.** We build the sign-in and sign-up screens
  ourselves; we do not want to own token issuance, session rotation or password storage.
  Owning that surface is how a solo project acquires a security incident.
- **The whole graph is loaded in one query and traversed in memory** (§46.4). This is
  what makes several of the choices below cheap, and it is the assumption most likely to
  expire.

The PRD contradicted itself on authentication. §397, §899 and §1744 specify Clerk;
§46.12 specifies Supabase Auth. §46 is the correcting section, so Supabase Auth was
technically the decision of record while the application was in fact being built on
Clerk. **This ADR ends that conflict in favour of Clerk.**

## Decision

We will build V1 on the following stack:

| Concern | Choice |
|---|---|
| Framework | Next.js (App Router), React, TypeScript |
| Authentication | **Clerk** — Google, GitHub, email/password |
| Database | Postgres, hosted on Supabase |
| Query layer | Drizzle |
| Graph canvas | React Flow (xyflow) |
| UI | Tailwind + shadcn |
| Architecture | A single Next.js application |
| Data model | Projects contain nodes and edges. Containment is an edge type, not a column. One containment parent per node in V1. Dependencies are a separate edge type. |

Authentication was the only contested choice. Clerk is taken because it manages the
entire credential surface, its free tier (50,000 monthly retained users as of February
2026) comfortably covers V1, its Core 3 hooks support fully custom UI, and it is the
strongest option should the React Native client mentioned in the PRD become real.

We build all authentication screens ourselves with shadcn components and drive them with
Clerk's hooks. We do not use Clerk's prebuilt `<SignIn />` and `<SignUp />` components.

## Alternatives considered

### Authentication — Supabase Auth

The strongest alternative, and the previous decision of record. Its real advantage is that
`auth.uid()` is available inside Postgres, so ownership becomes a row-level security policy
the database enforces, eliminating a whole class of bug where a route handler forgets a
`WHERE` clause.

It lost because that advantage is one this architecture had already declined to use. §46.4
loads an entire project graph in one query and traverses it in memory, so the authorisation
decision happens once, in the server layer, not per row in Postgres. With the RLS argument
neutralised, Clerk's larger free tier, better account-management tooling and React Native
support decided it.

### Authentication — Better Auth

Production-ready and genuinely good, with a first-class Drizzle adapter and users living in
our own database. Rejected because it inverts the third constraint: the library handles
hashing and sessions, but nobody is on call for it except us. We explicitly wanted a
provider on the hook.

### Authentication — Auth.js / NextAuth

Rejected outright. Its Credentials provider does not manage user records or hash passwords —
that would be our code. Since email/password is a V1 requirement, choosing Auth.js means
hand-writing the exact surface this ADR exists to avoid owning.

### Database host — Neon

Considered seriously once Clerk was chosen, because with authentication no longer coming
from Supabase we run the whole Supabase platform for a single Postgres instance, and Neon's
per-branch databases suit a schema with a load-bearing partial index.

Rejected for V1 only because the Phase 1 plan already tests against a real Postgres started
by `supabase start`; switching hosts now means rewriting how the test database comes up, for
a benefit that is real but not urgent. See consequences.

### Query layer — Prisma and Kysely

Prisma is viable — version 7 is Rust-free and the old serverless size penalty is gone.
Rejected because this schema's correctness depends on a partial unique index, and a SQL-first
layer keeps that index visible rather than behind a schema DSL. Kysely is a good query
builder but stops at queries; we would add a migration tool beside it.

### Graph canvas — Cytoscape.js, vis-network, D3

Cytoscape.js is a graph computing library with far richer built-in layouts, but its nodes are
canvas drawings rather than React trees, which would make every chip and detail card custom
rendering. vis-network is shaped for exploratory network views, not authoring. D3 provides
primitives and no node widgets. Authoring points to React Flow; analysis points to Cytoscape,
and this is an authoring tool.

### UI — Mantine and MUI

Both ship far more out of the box, but styling happens through their theming rather than by
editing component source, which fights an application built around custom node rendering.

### Data model — parent_id, closure table, ltree

A `parent_id` column is simpler to read but requires an edges table for dependencies anyway,
leaving two mechanisms for "node relates to node" and turning V2 multi-parent into a migration
rather than an index drop. A closure table answers ancestor queries in one hop but fans out on
every write and moves the invariant into application code — built for deep trees queried
constantly, where we load the whole graph instead. Postgres `ltree` is elegant for pure trees,
and this graph is not one: dependencies cut across the hierarchy.

## Consequences

### What this makes easier

- Credential handling, session rotation, OAuth token exchange and password reset are Clerk's
  problem, not ours. The security surface we own shrinks to "did this route check ownership".
- Sign-in and sign-up are ordinary React screens built from components we own outright, so
  they can look like the product rather than like an auth vendor.
- Containment and dependency are the same shape, so one table and one traversal serve both,
  and relaxing to multiple parents in V2 is dropping an index.
- Adding an OAuth provider is a dashboard toggle, not a code change.

### What this costs

- **Users are not a table.** `owner_id` holds a Clerk user id — a string from another system,
  with no foreign key and no referential integrity. Deleting a user in Clerk leaves rows
  pointing at nothing unless we handle it.
- **The server layer is the only authorisation boundary.** Clerk's identity does not reach
  Postgres, so there is no row-level security backstop. A route handler that forgets its
  ownership check leaks another user's graph and the database will not stop it. Every
  data-access path must go through the server layer.
- **Two vendors hold the system.** Identity is at Clerk, data is at Supabase, and the join
  between them exists only in our code.
- **The cost curve is steeper than the alternatives.** Roughly $1,825/mo at 100,000 users
  against roughly $187/mo for Supabase Auth. Irrelevant at V1 scale, and a known shape.
- **"Secured by Clerk" appears until we pay.** Removing it requires Pro, around $25/mo.
  Hiding it with CSS on the free plan is a terms violation and is not an option.
- **We render the flow state machine ourselves.** `signIn.create()` returns statuses —
  `complete`, `needs_first_factor`, `needs_second_factor` — and an unhandled status is a form
  that silently does nothing. The prebuilt component handled these; we no longer have it.
- **shadcn components have no upgrade path.** Copied components do not improve unless we
  re-copy and re-merge our edits.

### Assumption that would reopen this

The data model is cheap because the whole graph is loaded at once (§46.4). If a project ever
grows beyond what can reasonably be loaded in one query, that assumption breaks and the
hierarchy representation needs revisiting — recursive CTEs or a closure table become relevant
again. This is the single most likely reason a future ADR supersedes part of this one.

### Follow-on work

- Move the login page out of `app/(auth)/page.tsx`, which currently collides with
  `app/page.tsx` — both resolve to `/`. It becomes `app/(auth)/sign-in/page.tsx`.
- Add `app/(auth)/sign-up/page.tsx` and a shared `app/(auth)/layout.tsx`.
- Add `app/(auth)/sign-in/sso-callback/page.tsx` for the Google and GitHub redirects.
- Wire `components/login-form.tsx` to Clerk's hooks. It currently has no password field — add
  one, or switch to the email-code strategy.
- Enable Google and GitHub providers in the Clerk dashboard.
- Replace the bare `clerkMiddleware()` in `proxy.ts` with a `createRouteMatcher` gate that
  treats `/sign-in(.*)` and `/sign-up(.*)` as public and protects everything else.
- Set `NEXT_PUBLIC_CLERK_SIGN_IN_URL`, `NEXT_PUBLIC_CLERK_SIGN_UP_URL` and the two
  `FALLBACK_REDIRECT_URL` variables in `.env.local`.
- Add `<div id="clerk-captcha" />` to the sign-up screen, or bot protection has nowhere to
  mount.

### Deliberately not decided here

- **Whether to move Postgres to Neon.** Revisit if the Supabase platform stays unused beyond
  the database itself. Would be its own ADR.
- **Whether to add RLS as defence in depth** by bridging Clerk's JWT into Supabase as a
  third-party provider. Would be its own ADR.

## Note on scope

This ADR records eight choices as one unit because they were decided together as V1's
foundation. A later ADR may supersede a single row of the decision table without disturbing
the rest — it should name which row, and this file should be left unedited.
