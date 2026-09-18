# Development Workflow

## Approach

Build this project incrementally using a spec-driven workflow. Context files define what to build, how to build it, and what the current state of progress is. Always implement against these specs — do not infer or invent behavior from scratch.

## Scoping Rules

- Work on one feature unit or subsystem at a time.
- Prefer small, verifiable increments over large speculative changes.
- Do not combine unrelated system boundaries in a single implementation step.

## When To Split Work

Split an implementation step if it combines:

- UI changes and background task changes
- Real-time canvas state and database persistence
- Multiple unrelated API routes
- Behavior that is not clearly defined in the context files

If a change cannot be verified end to end quickly, the scope is too broad — split it.

## Handling Missing Requirements

- Do not invent product behavior that is not defined in the context files.
- If a requirement is ambiguous, resolve it in the relevant context file before implementing.
- If a requirement is missing, add it as an open question in `progress-tracker.md` before continuing.

## Protected Foundation Components

Do not modify generated third-party foundation components unless explicitly instructed.

This includes:

- `components/ui/*` (shadcn/ui components)
- third-party library internals

These should remain default and reusable.

Project-specific styling, layout changes, and feature logic must be implemented in app-level components instead of modifying foundation components.

Only modify these files when a task explicitly requires it.

## Keeping Docs In Sync

Update the relevant context file whenever implementation changes:

- System architecture or boundaries
- Storage model decisions
- Code conventions or standards
- Feature scope

Progress state must reflect the actual state of the implementation, not the intended state.

## Before Moving To The Next Unit

1. The current unit works end to end within its defined scope.
2. No invariant defined in `architecture-context.md` was violated.
3. `progress-tracker.md` reflects the completed work.

## Branching And Merging

Work happens on the long-lived `development` branch and lands on `master`
through pull requests.

**PRs are merged with a merge commit — never squashed or rebased.** The repo is
configured to allow only merge commits, so this is enforced rather than
remembered.

The reason: squash and rebase both replace a branch's commits with new ones on
`master`. Those new commits are not ancestors of the originals, so a branch that
keeps living after the merge carries orphaned history. Git compares ancestry
rather than content, so the next PR reports every shared file as `add/add`
"added in both" even when the contents are perfectly compatible. This happened
on PR #5, which came back `CONFLICTING` on seven files for that reason alone.

A merge commit preserves ancestry, so `development` can live indefinitely and
each PR starts from a shared ancestor. The trade is that `master` records one
commit per commit rather than one per PR, which is accepted.
