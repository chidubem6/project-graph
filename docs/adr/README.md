# Architecture Decision Records

One file per decision: what was chosen, what forced the choice, and what it costs.

## Why these exist

The PRD describes what the product *is*. It is a living document — it gets
rewritten, and rewriting it erases the reasoning behind choices that were
superseded along the way.

ADRs are the opposite. Once an ADR is Accepted it is never edited. A decision
that changes is replaced by a *new* ADR, and the old one stays in place marked
superseded. The result is a permanent record of why things are the way they
are, including the paths not taken and the ones later reversed.

§46 of the [PRD](../Product%20Requirements%20Document.md) is currently doing
this job informally, with its "Corrects §12" / "Corrects §31" markers. New
decisions go here instead. Where an accepted ADR and the PRD disagree, the ADR
wins — it carries a date and a status, the PRD does not.

## Convention

- Filename `NNNN-short-title.md` — four digits, zero-padded, sequential.
  Numbers are never reused, even if an ADR is rejected or withdrawn.
- Copy [0000-template.md](0000-template.md) to start.
- Title states the decision as an action: "Use Drizzle as the query layer",
  not "Query layer".
- One decision per file. If it needs two headings under Decision, it is
  probably two ADRs.

## Status lifecycle

| Status | Meaning |
|---|---|
| `Proposed` | Written but not agreed. Argue with it freely. |
| `Accepted` | In force. **The file is now immutable** — typo fixes only. |
| `Superseded by ADR-NNNN` | Replaced by a later decision. Kept, never deleted. |
| `Deprecated` | No longer applies, and nothing replaced it. |

Editing the substance of an Accepted ADR is the one move not allowed. That
immutability is the whole point — it is what makes a decision *locked in*
rather than quietly drifting.

## When to write one

Write an ADR when the choice is expensive to reverse, when a credible
alternative was rejected, or when someone will ask "why is it like this?" in
six months. Skip it when a reader can infer the answer from the code.

## Index

| ADR | Title | Status |
|---|---|---|
| [0001](0001-v1-technology-foundations.md) | Build V1 on Next.js, Clerk, Postgres and React Flow | Accepted |

## Open decisions

Deferred by ADR-0001 and worth their own record if they come up:

- **Postgres host.** ADR-0001 keeps Supabase, but with authentication at Clerk
  the platform is running for one database. Neon was the live alternative.
- **RLS as defence in depth.** ADR-0001 leaves the server layer as the only
  authorisation boundary. Bridging Clerk's JWT into Supabase would add a
  database-level backstop.

Note that PRD §397, §899 and §1744 still name Clerk while §46.12 names Supabase
Auth. ADR-0001 resolves this in favour of Clerk; the PRD has not been edited,
and per the precedence rule above the ADR is what counts.
