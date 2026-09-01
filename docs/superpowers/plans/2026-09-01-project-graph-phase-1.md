# Project Graph — Phase 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a complete, working project-graph application with no AI in it — create a project, build the graph by hand, tag it, track progress, and ask it what to work on next.

**Architecture:** Three layers. A pure **domain** layer of functions over an in-memory graph, with no database and no React — progress, cycles, next-task and layout all live here and are tested without infrastructure. A **server** layer that loads a whole project graph in one query and applies mutations. A **Next.js UI** built on React Flow. The domain layer can be pure because §46.4 computes progress on read from a graph that is already fully loaded to render the canvas, so nothing interesting needs a round trip.

**Tech Stack:** TypeScript, Next.js (App Router), Postgres via Supabase, Drizzle ORM, React Flow, dagre, Vitest, Playwright.

**Spec:** `Product Requirements Document.md` — §46 in particular. Every task cites the section it implements.

## Global Constraints

- **Database must be Postgres.** §46.2 needs a partial unique index and §46.3 needs JSONB; neither has a portable equivalent. Note that §46.12 also lists recursive queries, but this design does not use them — the whole graph is loaded once and traversed in memory (§46.4), so descendant walks happen in `src/domain/graph.ts` rather than in SQL.
- **No AI in Phase 1.** No calls to any model provider. Anything needing one is Phase 2 (§46.1).
- **Soft delete everywhere.** `nodes` and `edges` carry `deleted_at`. Every read filters `deleted_at IS NULL` in the shared query layer, never ad hoc (§46.9).
- **TypeScript strict mode.** `strict: true`, `noUncheckedIndexedAccess: true`.
- **Node 20 or later.**
- **The domain layer imports nothing.** No `drizzle`, no `react`, no `next`. If a domain file needs a database, the design is wrong.
- **Tests run against a real Postgres** started by `supabase start`. The one-parent index and recursive queries cannot be meaningfully mocked.
- **All timestamps are `timestamp with time zone`.**
- **Ownership is checked on every server call.** A user may only touch projects whose `owner_id` matches their session user id.

---

## File Structure

```text
src/
├── db/
│   ├── schema.ts          Drizzle table definitions and indexes
│   └── client.ts          Connection, exported as `db`
├── domain/                PURE. No db, no react, no next.
│   ├── types.ts           NodeType, NodeStatus, EdgeType, GraphNode, GraphEdge, ProjectGraph
│   ├── graph.ts           Graph class — children, parent, descendants, dependencies
│   ├── status.ts          isResolved, legalStatuses
│   ├── progress.ts        progressOf
│   ├── cycles.ts          findDependencyCycles
│   ├── nextTask.ts        recommendNextTask
│   └── layout.ts          computeLayout
├── server/                Data access. Every function takes a userId.
│   ├── auth.ts            requireUser, assertOwnsProject
│   ├── projects.ts        listProjects, createProject, deleteProject
│   ├── graphLoad.ts       loadProjectGraph
│   ├── nodes.ts           createNode, updateNode, moveNode, deleteNode, undoDelete
│   ├── edges.ts           createEdge, deleteEdge
│   └── tags.ts            createTag, tagNode, untagNode, tagBranch, reorderTags
├── app/
│   ├── login/page.tsx
│   ├── dashboard/page.tsx
│   └── project/[id]/page.tsx
└── components/
    ├── canvas/            Canvas, NodeCard, Toolbar
    ├── panel/             DetailPanel and its sections
    └── tags/              TagBar, TagEditor
tests/
├── domain/                Pure unit tests. No database.
├── server/                Integration tests against local Postgres.
└── e2e/                   Playwright.
```

Files are split by responsibility rather than by technical layer. `progress.ts` and its test change together. `nodes.ts` and `edges.ts` are separate because a reviewer could sensibly accept one and reject the other.

---

# Part A — Foundation, Domain, Data

Part A ends with a fully tested domain library and persistence layer. No UI exists yet; everything is verifiable by running the test suite.

---

### Task 1: Project foundation

**Files:**
- Create: `package.json`, `tsconfig.json`, `vitest.config.ts`, `.env.local`, `.env.local.example`
- Create: `src/db/client.ts`, `src/db/schema.ts`
- Test: `tests/setup.test.ts`

**Interfaces:**
- Consumes: nothing
- Produces: `db` (Drizzle client) exported from `src/db/client.ts`; `npm test` runs Vitest

- [ ] **Step 1: Scaffold the Next.js app**

```bash
npx create-next-app@latest . --typescript --app --eslint --tailwind --src-dir --import-alias "@/*"
```

- [ ] **Step 2: Install dependencies**

```bash
npm install drizzle-orm postgres @supabase/supabase-js @supabase/ssr reactflow @dagrejs/dagre
npm install -D drizzle-kit vitest @vitejs/plugin-react dotenv dotenv-cli
```

- [ ] **Step 3: Turn on strict TypeScript**

In `tsconfig.json`, inside `compilerOptions`, set both:

```json
"strict": true,
"noUncheckedIndexedAccess": true
```

- [ ] **Step 4: Add the Vitest config**

Create `vitest.config.ts`:

```ts
import { defineConfig } from 'vitest/config'
import path from 'node:path'

export default defineConfig({
  test: {
    environment: 'node',
    setupFiles: ['dotenv/config'],
    include: ['tests/**/*.test.ts'],
  },
  resolve: {
    alias: { '@': path.resolve(__dirname, 'src') },
  },
})
```

Add to the `scripts` block in `package.json`:

```json
"test": "dotenv -e .env.local -- vitest run",
"test:watch": "dotenv -e .env.local -- vitest"
```

- [ ] **Step 5: Write a failing test that proves the harness runs**

Create `tests/setup.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { db } from '@/db/client'

describe('test harness', () => {
  it('resolves the @ alias and imports the db client', () => {
    expect(db).toBeDefined()
  })
})
```

- [ ] **Step 6: Run it and watch it fail**

Run: `npm test`
Expected: FAIL — `Cannot find module '@/db/client'`

- [ ] **Step 7: Start local Postgres**

```bash
npx supabase init
npx supabase start
```

Create `.env.local` using the `DB URL` it prints:

```text
DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:54322/postgres
```

Create `.env.local.example` with the same key and an empty value. Confirm `.gitignore` contains `.env*.local`.

- [ ] **Step 8: Create the database client**

Create `src/db/schema.ts` containing only `export {}` for now, so the import resolves.

Create `src/db/client.ts`:

```ts
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from './schema'

const url = process.env.DATABASE_URL
if (!url) throw new Error('DATABASE_URL is not set')

export const db = drizzle(postgres(url), { schema })
```

- [ ] **Step 9: Run the test and watch it pass**

Run: `npm test`
Expected: PASS — 1 test

- [ ] **Step 10: Commit**

```bash
git add -A
git commit -m "chore: scaffold Next.js app, Drizzle client and Vitest harness"
```

---

### Task 2: Database schema and constraints

Implements §46.2 (edges-only hierarchy, single parent), §46.3 (one node table, JSON data), §46.7 (tags), §46.8 (positions), §46.9 (soft delete).

**Files:**
- Modify: `src/db/schema.ts`
- Create: `drizzle.config.ts`, `tests/helpers/db.ts`
- Test: `tests/server/schema.test.ts`

**Interfaces:**
- Consumes: `db` from Task 1
- Produces: tables `projects`, `nodes`, `edges`, `tags`, `nodeTags`; test helpers `resetDb()`, `makeProject()`, constant `TEST_USER`

- [ ] **Step 1: Write the failing constraint tests**

These exercise the database itself. The single-parent rule is the load-bearing guarantee behind §46.2, so it is tested directly rather than through application code.

Create `tests/server/schema.test.ts`:

```ts
import { describe, it, expect, beforeEach } from 'vitest'
import { eq } from 'drizzle-orm'
import { db } from '@/db/client'
import { nodes, edges } from '@/db/schema'
import { resetDb, makeProject } from '../helpers/db'

async function threeNodes(projectId: string) {
  const rows = await db.insert(nodes).values([
    { projectId, title: 'A', type: 'system' as const },
    { projectId, title: 'B', type: 'system' as const },
    { projectId, title: 'C', type: 'system' as const },
  ]).returning()
  return { a: rows[0]!.id, b: rows[1]!.id, c: rows[2]!.id }
}

describe('schema constraints', () => {
  beforeEach(resetDb)

  it('rejects a second contains-parent for the same node', async () => {
    const projectId = await makeProject()
    const { a, b, c } = await threeNodes(projectId)

    await db.insert(edges).values({
      projectId, sourceNodeId: a, targetNodeId: c, type: 'contains',
    })

    await expect(
      db.insert(edges).values({
        projectId, sourceNodeId: b, targetNodeId: c, type: 'contains',
      }),
    ).rejects.toThrow()
  })

  it('allows a new parent once the previous contains-edge is soft deleted', async () => {
    const projectId = await makeProject()
    const { a, b, c } = await threeNodes(projectId)

    const [first] = await db.insert(edges).values({
      projectId, sourceNodeId: a, targetNodeId: c, type: 'contains',
    }).returning()

    await db.update(edges).set({ deletedAt: new Date() }).where(eq(edges.id, first!.id))

    await expect(
      db.insert(edges).values({
        projectId, sourceNodeId: b, targetNodeId: c, type: 'contains',
      }),
    ).resolves.toBeDefined()
  })

  it('allows many depends_on edges into the same node', async () => {
    const projectId = await makeProject()
    const { a, b, c } = await threeNodes(projectId)

    await db.insert(edges).values({ projectId, sourceNodeId: a, targetNodeId: c, type: 'depends_on' })
    await expect(
      db.insert(edges).values({ projectId, sourceNodeId: b, targetNodeId: c, type: 'depends_on' }),
    ).resolves.toBeDefined()
  })

  it('defaults data to an empty object and positions to null', async () => {
    const projectId = await makeProject()
    const [n] = await db.insert(nodes)
      .values({ projectId, title: 'A', type: 'system' })
      .returning()

    expect(n!.data).toEqual({})
    expect(n!.posX).toBeNull()
    expect(n!.posY).toBeNull()
    expect(n!.status).toBe('not_started')
  })
})
```

- [ ] **Step 2: Run and watch it fail**

Run: `npm test tests/server/schema.test.ts`
Expected: FAIL — `nodes` is not exported from `@/db/schema`

- [ ] **Step 3: Write the schema**

Replace `src/db/schema.ts` entirely:

```ts
import { sql } from 'drizzle-orm'
import {
  pgTable, pgEnum, uuid, text, jsonb, real, integer,
  timestamp, uniqueIndex, index, primaryKey,
} from 'drizzle-orm/pg-core'

export const nodeType = pgEnum('node_type', [
  'goal', 'capability', 'system', 'requirement',
  'feature', 'decision', 'task', 'question',
])

export const nodeStatus = pgEnum('node_status', [
  'not_started', 'in_progress', 'blocked', 'done',
  'open', 'resolved',
  'proposed', 'accepted', 'rejected',
])

export const edgeType = pgEnum('edge_type', [
  'contains', 'depends_on', 'implements', 'related_to',
])

export const projects = pgTable('projects', {
  id: uuid('id').primaryKey().defaultRandom(),
  ownerId: uuid('owner_id').notNull(),
  name: text('name').notNull(),
  description: text('description'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  byOwner: index('projects_owner_idx').on(t.ownerId),
}))

export const nodes = pgTable('nodes', {
  id: uuid('id').primaryKey().defaultRandom(),
  projectId: uuid('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  description: text('description'),
  type: nodeType('type').notNull(),
  status: nodeStatus('status').notNull().default('not_started'),
  data: jsonb('data').notNull().default(sql`'{}'::jsonb`),
  posX: real('pos_x'),
  posY: real('pos_y'),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  byProject: index('nodes_project_idx').on(t.projectId),
}))

export const edges = pgTable('edges', {
  id: uuid('id').primaryKey().defaultRandom(),
  projectId: uuid('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  sourceNodeId: uuid('source_node_id').notNull().references(() => nodes.id, { onDelete: 'cascade' }),
  targetNodeId: uuid('target_node_id').notNull().references(() => nodes.id, { onDelete: 'cascade' }),
  type: edgeType('type').notNull(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  // Spec §46.2 — a node has exactly one live containing parent.
  // deleted_at MUST be in the predicate. Without it, a soft-deleted
  // contains-edge would permanently block re-parenting that node.
  oneParent: uniqueIndex('edges_one_parent')
    .on(t.targetNodeId)
    .where(sql`${t.type} = 'contains' AND ${t.deletedAt} IS NULL`),
  bySource: index('edges_source_idx').on(t.sourceNodeId),
  byTarget: index('edges_target_idx').on(t.targetNodeId),
  byProject: index('edges_project_idx').on(t.projectId),
}))

export const tags = pgTable('tags', {
  id: uuid('id').primaryKey().defaultRandom(),
  projectId: uuid('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  color: text('color').notNull(),
  priority: integer('priority').notNull(),
}, (t) => ({
  uniqueName: uniqueIndex('tags_project_name').on(t.projectId, t.name),
}))

export const nodeTags = pgTable('node_tags', {
  nodeId: uuid('node_id').notNull().references(() => nodes.id, { onDelete: 'cascade' }),
  tagId: uuid('tag_id').notNull().references(() => tags.id, { onDelete: 'cascade' }),
}, (t) => ({
  pk: primaryKey({ columns: [t.nodeId, t.tagId] }),
}))
```

- [ ] **Step 4: Add the Drizzle config and push the schema**

Create `drizzle.config.ts`:

```ts
import type { Config } from 'drizzle-kit'

export default {
  schema: './src/db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: { url: process.env.DATABASE_URL! },
} satisfies Config
```

Add to `scripts` in `package.json`:

```json
"db:generate": "dotenv -e .env.local -- drizzle-kit generate",
"db:push": "dotenv -e .env.local -- drizzle-kit push"
```

Run:

```bash
npm run db:generate
npm run db:push
```

- [ ] **Step 5: Write the test helpers**

Create `tests/helpers/db.ts`:

```ts
import { db } from '@/db/client'
import { projects, nodes, edges, tags, nodeTags } from '@/db/schema'

export const TEST_USER = '00000000-0000-0000-0000-000000000001'

export async function resetDb(): Promise<void> {
  await db.delete(nodeTags)
  await db.delete(tags)
  await db.delete(edges)
  await db.delete(nodes)
  await db.delete(projects)
}

export async function makeProject(name = 'Test Project'): Promise<string> {
  const [p] = await db.insert(projects).values({ ownerId: TEST_USER, name }).returning()
  return p!.id
}
```

- [ ] **Step 6: Run the tests and watch them pass**

Run: `npm test tests/server/schema.test.ts`
Expected: PASS — 4 tests

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: add nodes, edges and tags schema with single-parent constraint"
```

---

### Task 3: Domain types and the Graph class

Implements §46.2 and §46.5. Every later domain task builds on this.

**Files:**
- Create: `src/domain/types.ts`, `src/domain/graph.ts`
- Create: `tests/helpers/graph.ts`
- Test: `tests/domain/graph.test.ts`

**Interfaces:**
- Consumes: nothing — this file imports no other module in the project
- Produces:
  - `type NodeType`, `NodeStatus`, `EdgeType`
  - `interface GraphNode { id: string; title: string; description: string | null; type: NodeType; status: NodeStatus; data: Record<string, unknown>; posX: number | null; posY: number | null; tagIds: string[] }`
  - `interface GraphEdge { id: string; source: string; target: string; type: EdgeType }`
  - `interface Tag { id: string; name: string; color: string; priority: number }`
  - `interface ProjectGraph { nodes: GraphNode[]; edges: GraphEdge[]; tags: Tag[] }`
  - `class Graph` with `node(id)`, `childrenOf(id)`, `parentOf(id)`, `descendantsOf(id)`, `ancestorsOf(id)`, `dependenciesOf(id)`, `dependentsOf(id)`, `isLeaf(id)`, `roots()`, `all()`
  - test helper `buildGraph(spec)` from `tests/helpers/graph.ts`

- [ ] **Step 1: Write the failing tests**

Create `tests/domain/graph.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { Graph } from '@/domain/graph'
import { buildGraph } from '../helpers/graph'

// Booked, trimmed to what these tests need:
//   root
//   ├── auth
//   │   └── phone
//   │       ├── send
//   │       └── verify   (depends on send)
//   └── booking
const g = () => new Graph(buildGraph({
  nodes: [
    { id: 'root',    type: 'goal' },
    { id: 'auth',    type: 'system' },
    { id: 'phone',   type: 'system' },
    { id: 'send',    type: 'task' },
    { id: 'verify',  type: 'task' },
    { id: 'booking', type: 'system' },
  ],
  edges: [
    ['root', 'auth', 'contains'],
    ['root', 'booking', 'contains'],
    ['auth', 'phone', 'contains'],
    ['phone', 'send', 'contains'],
    ['phone', 'verify', 'contains'],
    ['verify', 'send', 'depends_on'],
  ],
}))

describe('Graph', () => {
  it('returns direct children in insertion order', () => {
    expect(g().childrenOf('phone').map(n => n.id)).toEqual(['send', 'verify'])
  })

  it('returns the single containing parent', () => {
    expect(g().parentOf('phone')?.id).toBe('auth')
  })

  it('returns null for the parent of a root', () => {
    expect(g().parentOf('root')).toBeNull()
  })

  it('returns every descendant, not just children', () => {
    expect(g().descendantsOf('auth').map(n => n.id).sort())
      .toEqual(['phone', 'send', 'verify'])
  })

  it('returns ancestors from nearest to furthest', () => {
    expect(g().ancestorsOf('send').map(n => n.id)).toEqual(['phone', 'auth', 'root'])
  })

  it('treats a node with no children as a leaf', () => {
    expect(g().isLeaf('send')).toBe(true)
    expect(g().isLeaf('phone')).toBe(false)
  })

  it('follows depends_on forwards and backwards', () => {
    expect(g().dependenciesOf('verify').map(n => n.id)).toEqual(['send'])
    expect(g().dependentsOf('send').map(n => n.id)).toEqual(['verify'])
  })

  it('ignores depends_on edges when computing hierarchy', () => {
    expect(g().childrenOf('verify')).toEqual([])
    expect(g().parentOf('send')?.id).toBe('phone')
  })

  it('returns nodes with no containing parent as roots', () => {
    expect(g().roots().map(n => n.id)).toEqual(['root'])
  })
})
```

- [ ] **Step 2: Run and watch it fail**

Run: `npm test tests/domain/graph.test.ts`
Expected: FAIL — `Cannot find module '@/domain/graph'`

- [ ] **Step 3: Write the types**

Create `src/domain/types.ts`:

```ts
export type NodeType =
  | 'goal' | 'capability' | 'system' | 'requirement'
  | 'feature' | 'decision' | 'task' | 'question'

export type NodeStatus =
  | 'not_started' | 'in_progress' | 'blocked' | 'done'
  | 'open' | 'resolved'
  | 'proposed' | 'accepted' | 'rejected'

export type EdgeType = 'contains' | 'depends_on' | 'implements' | 'related_to'

export interface GraphNode {
  id: string
  title: string
  description: string | null
  type: NodeType
  status: NodeStatus
  data: Record<string, unknown>
  posX: number | null
  posY: number | null
  tagIds: string[]
}

export interface GraphEdge {
  id: string
  source: string
  target: string
  type: EdgeType
}

export interface Tag {
  id: string
  name: string
  color: string
  priority: number
}

export interface ProjectGraph {
  nodes: GraphNode[]
  edges: GraphEdge[]
  tags: Tag[]
}
```

- [ ] **Step 4: Write the Graph class**

Create `src/domain/graph.ts`:

```ts
import type { EdgeType, GraphEdge, GraphNode, ProjectGraph, Tag } from './types'

/**
 * An indexed, read-only view over one project's graph.
 *
 * The whole graph is loaded to render the canvas (spec §46.4), so every
 * traversal here is in-memory. Nothing in this file touches a database.
 */
export class Graph {
  private readonly byId = new Map<string, GraphNode>()
  private readonly out = new Map<string, GraphEdge[]>()
  private readonly in = new Map<string, GraphEdge[]>()

  readonly tags: Tag[]

  constructor(private readonly graph: ProjectGraph) {
    this.tags = graph.tags
    for (const n of graph.nodes) this.byId.set(n.id, n)
    for (const e of graph.edges) {
      push(this.out, e.source, e)
      push(this.in, e.target, e)
    }
  }

  all(): GraphNode[] {
    return this.graph.nodes
  }

  node(id: string): GraphNode | null {
    return this.byId.get(id) ?? null
  }

  childrenOf(id: string): GraphNode[] {
    return this.targets(id, 'contains')
  }

  parentOf(id: string): GraphNode | null {
    const edge = (this.in.get(id) ?? []).find(e => e.type === 'contains')
    return edge ? this.byId.get(edge.source) ?? null : null
  }

  isLeaf(id: string): boolean {
    return this.childrenOf(id).length === 0
  }

  roots(): GraphNode[] {
    return this.graph.nodes.filter(n => this.parentOf(n.id) === null)
  }

  /** Breadth-first, excluding the node itself. */
  descendantsOf(id: string): GraphNode[] {
    const found: GraphNode[] = []
    const seen = new Set<string>([id])
    const queue = [id]
    while (queue.length > 0) {
      const current = queue.shift()!
      for (const child of this.childrenOf(current)) {
        if (seen.has(child.id)) continue
        seen.add(child.id)
        found.push(child)
        queue.push(child.id)
      }
    }
    return found
  }

  /** Nearest parent first, up to the root. */
  ancestorsOf(id: string): GraphNode[] {
    const found: GraphNode[] = []
    const seen = new Set<string>([id])
    let parent = this.parentOf(id)
    while (parent !== null && !seen.has(parent.id)) {
      seen.add(parent.id)
      found.push(parent)
      parent = this.parentOf(parent.id)
    }
    return found
  }

  /** Nodes this node depends on. */
  dependenciesOf(id: string): GraphNode[] {
    return this.targets(id, 'depends_on')
  }

  /** Nodes that depend on this node. */
  dependentsOf(id: string): GraphNode[] {
    return (this.in.get(id) ?? [])
      .filter(e => e.type === 'depends_on')
      .map(e => this.byId.get(e.source))
      .filter((n): n is GraphNode => n !== undefined)
  }

  private targets(id: string, type: EdgeType): GraphNode[] {
    return (this.out.get(id) ?? [])
      .filter(e => e.type === type)
      .map(e => this.byId.get(e.target))
      .filter((n): n is GraphNode => n !== undefined)
  }
}

function push(map: Map<string, GraphEdge[]>, key: string, edge: GraphEdge): void {
  const list = map.get(key)
  if (list) list.push(edge)
  else map.set(key, [edge])
}
```

- [ ] **Step 5: Write the graph test helper**

Create `tests/helpers/graph.ts`. Every domain test builds fixtures with this, so the tests stay readable.

```ts
import type {
  EdgeType, GraphNode, NodeStatus, NodeType, ProjectGraph, Tag,
} from '@/domain/types'

export interface NodeSpec {
  id: string
  type: NodeType
  status?: NodeStatus
  title?: string
  tagIds?: string[]
  posX?: number
  posY?: number
}

export interface GraphSpec {
  nodes: NodeSpec[]
  edges?: [source: string, target: string, type: EdgeType][]
  tags?: Tag[]
}

export function buildGraph(spec: GraphSpec): ProjectGraph {
  const nodes: GraphNode[] = spec.nodes.map(n => ({
    id: n.id,
    title: n.title ?? n.id,
    description: null,
    type: n.type,
    status: n.status ?? 'not_started',
    data: {},
    posX: n.posX ?? null,
    posY: n.posY ?? null,
    tagIds: n.tagIds ?? [],
  }))

  return {
    nodes,
    edges: (spec.edges ?? []).map(([source, target, type], i) => ({
      id: `e${i}`, source, target, type,
    })),
    tags: spec.tags ?? [],
  }
}
```

- [ ] **Step 6: Run the tests and watch them pass**

Run: `npm test tests/domain/graph.test.ts`
Expected: PASS — 9 tests

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: add domain types and indexed Graph traversal"
```

---

### Task 4: Status rules and progress

Implements §46.4 in full.

**Files:**
- Create: `src/domain/status.ts`, `src/domain/progress.ts`
- Test: `tests/domain/status.test.ts`, `tests/domain/progress.test.ts`

**Interfaces:**
- Consumes: `Graph`, `GraphNode`, `NodeStatus`, `NodeType` from Task 3
- Produces:
  - `isResolved(node: GraphNode): boolean`
  - `legalStatuses(type: NodeType, isLeaf: boolean): NodeStatus[]`
  - `interface Progress { resolved: number; total: number; percent: number }`
  - `progressOf(graph: Graph, nodeId: string): Progress | null` — null for leaves
  - `effectiveStatus(graph: Graph, nodeId: string): NodeStatus`
  - `openQuestionCount(graph: Graph, nodeId: string): number`

- [ ] **Step 1: Write the failing status tests**

Create `tests/domain/status.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { isResolved, legalStatuses } from '@/domain/status'
import { buildGraph } from '../helpers/graph'

const node = (type: Parameters<typeof buildGraph>[0]['nodes'][0]['type'], status: string) =>
  buildGraph({ nodes: [{ id: 'n', type, status: status as never }] }).nodes[0]!

describe('isResolved', () => {
  it('resolves an ordinary node only when Done', () => {
    expect(isResolved(node('task', 'done'))).toBe(true)
    expect(isResolved(node('task', 'in_progress'))).toBe(false)
    expect(isResolved(node('task', 'blocked'))).toBe(false)
  })

  it('resolves a question when Resolved', () => {
    expect(isResolved(node('question', 'resolved'))).toBe(true)
    expect(isResolved(node('question', 'open'))).toBe(false)
  })

  it('resolves a decision when Accepted or Rejected', () => {
    expect(isResolved(node('decision', 'accepted'))).toBe(true)
    expect(isResolved(node('decision', 'rejected'))).toBe(true)
    expect(isResolved(node('decision', 'proposed'))).toBe(false)
  })
})

describe('legalStatuses', () => {
  it('offers Done to a leaf', () => {
    expect(legalStatuses('task', true)).toContain('done')
  })

  it('withholds Done from a node with children', () => {
    expect(legalStatuses('task', false)).not.toContain('done')
    expect(legalStatuses('task', false)).toEqual(['not_started', 'in_progress', 'blocked'])
  })

  it('gives questions their own two statuses', () => {
    expect(legalStatuses('question', true)).toEqual(['open', 'resolved'])
  })

  it('gives decisions their own three statuses', () => {
    expect(legalStatuses('decision', true)).toEqual(['proposed', 'accepted', 'rejected'])
  })

  it('withholds the resolving status from a question that has children', () => {
    expect(legalStatuses('question', false)).toEqual(['open'])
  })
})
```

- [ ] **Step 2: Run and watch it fail**

Run: `npm test tests/domain/status.test.ts`
Expected: FAIL — `Cannot find module '@/domain/status'`

- [ ] **Step 3: Write the status rules**

Create `src/domain/status.ts`:

```ts
import type { GraphNode, NodeStatus, NodeType } from './types'

/**
 * Spec §46.4 — which status means "this node is finished", per type.
 * A rejected decision has been answered and counts as resolved.
 */
const RESOLVING: Record<NodeType, NodeStatus[]> = {
  goal:        ['done'],
  capability:  ['done'],
  system:      ['done'],
  requirement: ['done'],
  feature:     ['done'],
  task:        ['done'],
  question:    ['resolved'],
  decision:    ['accepted', 'rejected'],
}

const ALL: Record<NodeType, NodeStatus[]> = {
  goal:        ['not_started', 'in_progress', 'blocked', 'done'],
  capability:  ['not_started', 'in_progress', 'blocked', 'done'],
  system:      ['not_started', 'in_progress', 'blocked', 'done'],
  requirement: ['not_started', 'in_progress', 'blocked', 'done'],
  feature:     ['not_started', 'in_progress', 'blocked', 'done'],
  task:        ['not_started', 'in_progress', 'blocked', 'done'],
  question:    ['open', 'resolved'],
  decision:    ['proposed', 'accepted', 'rejected'],
}

export function isResolved(node: GraphNode): boolean {
  return RESOLVING[node.type].includes(node.status)
}

/**
 * Spec §46.4 — a node with children cannot be set to a resolving status.
 * It reaches one only by all of its descendants being resolved.
 */
export function legalStatuses(type: NodeType, isLeaf: boolean): NodeStatus[] {
  if (isLeaf) return ALL[type]
  return ALL[type].filter(s => !RESOLVING[type].includes(s))
}
```

- [ ] **Step 4: Run and watch it pass**

Run: `npm test tests/domain/status.test.ts`
Expected: PASS — 8 tests

- [ ] **Step 5: Write the failing progress tests**

Create `tests/domain/progress.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { Graph } from '@/domain/graph'
import { progressOf, effectiveStatus, openQuestionCount } from '@/domain/progress'
import { buildGraph } from '../helpers/graph'

describe('progressOf', () => {
  it('returns null for a leaf', () => {
    const g = new Graph(buildGraph({ nodes: [{ id: 'a', type: 'task' }] }))
    expect(progressOf(g, 'a')).toBeNull()
  })

  it('counts every descendant, not only direct children', () => {
    // auth → phone → {send done, verify not started}
    const g = new Graph(buildGraph({
      nodes: [
        { id: 'auth', type: 'system' },
        { id: 'phone', type: 'system' },
        { id: 'send', type: 'task', status: 'done' },
        { id: 'verify', type: 'task', status: 'not_started' },
      ],
      edges: [
        ['auth', 'phone', 'contains'],
        ['phone', 'send', 'contains'],
        ['phone', 'verify', 'contains'],
      ],
    }))
    // descendants of auth: phone, send, verify. Only send is resolved.
    expect(progressOf(g, 'auth')).toEqual({ resolved: 1, total: 3, percent: 33 })
  })

  it('counts a resolved question as resolved', () => {
    const g = new Graph(buildGraph({
      nodes: [
        { id: 'auth', type: 'system' },
        { id: 'q1', type: 'question', status: 'resolved' },
        { id: 'q2', type: 'question', status: 'open' },
      ],
      edges: [['auth', 'q1', 'contains'], ['auth', 'q2', 'contains']],
    }))
    expect(progressOf(g, 'auth')).toEqual({ resolved: 1, total: 2, percent: 50 })
  })

  it('counts an accepted or rejected decision as resolved', () => {
    const g = new Graph(buildGraph({
      nodes: [
        { id: 'auth', type: 'system' },
        { id: 'd1', type: 'decision', status: 'accepted' },
        { id: 'd2', type: 'decision', status: 'rejected' },
        { id: 'd3', type: 'decision', status: 'proposed' },
      ],
      edges: [
        ['auth', 'd1', 'contains'],
        ['auth', 'd2', 'contains'],
        ['auth', 'd3', 'contains'],
      ],
    }))
    expect(progressOf(g, 'auth')).toEqual({ resolved: 2, total: 3, percent: 67 })
  })
})

describe('effectiveStatus', () => {
  it('returns the stored status for a leaf', () => {
    const g = new Graph(buildGraph({ nodes: [{ id: 'a', type: 'task', status: 'blocked' }] }))
    expect(effectiveStatus(g, 'a')).toBe('blocked')
  })

  it('returns done when every descendant is resolved', () => {
    const g = new Graph(buildGraph({
      nodes: [
        { id: 'auth', type: 'system', status: 'in_progress' },
        { id: 'send', type: 'task', status: 'done' },
      ],
      edges: [['auth', 'send', 'contains']],
    }))
    expect(effectiveStatus(g, 'auth')).toBe('done')
  })

  it('returns done even when the parent was marked blocked', () => {
    const g = new Graph(buildGraph({
      nodes: [
        { id: 'auth', type: 'system', status: 'blocked' },
        { id: 'send', type: 'task', status: 'done' },
      ],
      edges: [['auth', 'send', 'contains']],
    }))
    expect(effectiveStatus(g, 'auth')).toBe('done')
  })

  it('returns the stored status while work remains', () => {
    const g = new Graph(buildGraph({
      nodes: [
        { id: 'auth', type: 'system', status: 'blocked' },
        { id: 'send', type: 'task', status: 'not_started' },
      ],
      edges: [['auth', 'send', 'contains']],
    }))
    expect(effectiveStatus(g, 'auth')).toBe('blocked')
  })
})

describe('openQuestionCount', () => {
  it('counts unresolved questions beneath a node', () => {
    const g = new Graph(buildGraph({
      nodes: [
        { id: 'auth', type: 'system' },
        { id: 'phone', type: 'system' },
        { id: 'q1', type: 'question', status: 'open' },
        { id: 'q2', type: 'question', status: 'resolved' },
      ],
      edges: [
        ['auth', 'phone', 'contains'],
        ['phone', 'q1', 'contains'],
        ['auth', 'q2', 'contains'],
      ],
    }))
    expect(openQuestionCount(g, 'auth')).toBe(1)
  })
})
```

- [ ] **Step 6: Run and watch it fail**

Run: `npm test tests/domain/progress.test.ts`
Expected: FAIL — `Cannot find module '@/domain/progress'`

- [ ] **Step 7: Write progress**

Create `src/domain/progress.ts`:

```ts
import type { Graph } from './graph'
import { isResolved } from './status'
import type { NodeStatus } from './types'

export interface Progress {
  resolved: number
  total: number
  /** 0-100, rounded to the nearest integer. */
  percent: number
}

/**
 * Spec §46.4 — resolved descendants over all descendants, counting every
 * node type. Returns null for a leaf, which has a status instead.
 *
 * Computed on read, never stored. The whole graph is already in memory.
 */
export function progressOf(graph: Graph, nodeId: string): Progress | null {
  const descendants = graph.descendantsOf(nodeId)
  if (descendants.length === 0) return null

  const resolved = descendants.filter(isResolved).length
  return {
    resolved,
    total: descendants.length,
    percent: Math.round((resolved / descendants.length) * 100),
  }
}

/**
 * Spec §46.4 — a parent reaches Done at 100%, overriding a stored Blocked.
 * A leaf simply reports what the user set.
 */
export function effectiveStatus(graph: Graph, nodeId: string): NodeStatus {
  const node = graph.node(nodeId)
  if (!node) throw new Error(`Unknown node: ${nodeId}`)

  const progress = progressOf(graph, nodeId)
  if (progress === null) return node.status
  if (progress.resolved === progress.total) return 'done'
  return node.status
}

/**
 * Spec §46.4 — shown alongside progress so that adding a question reads as
 * new information found rather than work undone.
 */
export function openQuestionCount(graph: Graph, nodeId: string): number {
  return graph.descendantsOf(nodeId)
    .filter(n => n.type === 'question' && !isResolved(n))
    .length
}
```

- [ ] **Step 8: Run and watch it pass**

Run: `npm test tests/domain/progress.test.ts`
Expected: PASS — 9 tests

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "feat: add status rules, progress rollup and effective status"
```

---

### Task 5: Dependency cycle detection

Implements §46.11. Also supplies the containment-cycle guard that Task 10 needs.

**Files:**
- Create: `src/domain/cycles.ts`
- Test: `tests/domain/cycles.test.ts`

**Interfaces:**
- Consumes: `Graph` from Task 3
- Produces:
  - `findDependencyCycles(graph: Graph): string[][]` — each entry is a sorted list of node ids in one cycle
  - `nodesInCycles(graph: Graph): Set<string>`
  - `wouldCreateContainsCycle(graph: Graph, sourceId: string, targetId: string): boolean`

- [ ] **Step 1: Write the failing tests**

Create `tests/domain/cycles.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { Graph } from '@/domain/graph'
import { findDependencyCycles, nodesInCycles, wouldCreateContainsCycle } from '@/domain/cycles'
import { buildGraph } from '../helpers/graph'

describe('findDependencyCycles', () => {
  it('finds nothing in an acyclic graph', () => {
    const g = new Graph(buildGraph({
      nodes: [{ id: 'a', type: 'task' }, { id: 'b', type: 'task' }],
      edges: [['a', 'b', 'depends_on']],
    }))
    expect(findDependencyCycles(g)).toEqual([])
  })

  it('finds a three-node cycle', () => {
    // booking → availability → payments → booking
    const g = new Graph(buildGraph({
      nodes: [
        { id: 'booking', type: 'system' },
        { id: 'availability', type: 'system' },
        { id: 'payments', type: 'system' },
      ],
      edges: [
        ['booking', 'availability', 'depends_on'],
        ['availability', 'payments', 'depends_on'],
        ['payments', 'booking', 'depends_on'],
      ],
    }))
    expect(findDependencyCycles(g)).toEqual([['availability', 'booking', 'payments']])
  })

  it('finds a self-dependency', () => {
    const g = new Graph(buildGraph({
      nodes: [{ id: 'a', type: 'task' }],
      edges: [['a', 'a', 'depends_on']],
    }))
    expect(findDependencyCycles(g)).toEqual([['a']])
  })

  it('ignores contains edges', () => {
    const g = new Graph(buildGraph({
      nodes: [{ id: 'a', type: 'system' }, { id: 'b', type: 'task' }],
      edges: [['a', 'b', 'contains'], ['b', 'a', 'depends_on']],
    }))
    expect(findDependencyCycles(g)).toEqual([])
  })

  it('reports two separate cycles separately', () => {
    const g = new Graph(buildGraph({
      nodes: ['a', 'b', 'c', 'd'].map(id => ({ id, type: 'task' as const })),
      edges: [
        ['a', 'b', 'depends_on'], ['b', 'a', 'depends_on'],
        ['c', 'd', 'depends_on'], ['d', 'c', 'depends_on'],
      ],
    }))
    expect(findDependencyCycles(g)).toHaveLength(2)
  })
})

describe('nodesInCycles', () => {
  it('flattens every cycle into one set', () => {
    const g = new Graph(buildGraph({
      nodes: ['a', 'b', 'c'].map(id => ({ id, type: 'task' as const })),
      edges: [['a', 'b', 'depends_on'], ['b', 'a', 'depends_on']],
    }))
    expect(nodesInCycles(g)).toEqual(new Set(['a', 'b']))
  })
})

describe('wouldCreateContainsCycle', () => {
  // root → auth → phone
  const g = new Graph(buildGraph({
    nodes: [
      { id: 'root', type: 'goal' },
      { id: 'auth', type: 'system' },
      { id: 'phone', type: 'system' },
    ],
    edges: [['root', 'auth', 'contains'], ['auth', 'phone', 'contains']],
  }))

  it('rejects a node containing itself', () => {
    expect(wouldCreateContainsCycle(g, 'auth', 'auth')).toBe(true)
  })

  it('rejects a node containing its own ancestor', () => {
    expect(wouldCreateContainsCycle(g, 'phone', 'root')).toBe(true)
  })

  it('permits an unrelated re-parent', () => {
    expect(wouldCreateContainsCycle(g, 'root', 'phone')).toBe(false)
  })
})
```

- [ ] **Step 2: Run and watch it fail**

Run: `npm test tests/domain/cycles.test.ts`
Expected: FAIL — `Cannot find module '@/domain/cycles'`

- [ ] **Step 3: Write the implementation**

Create `src/domain/cycles.ts`:

```ts
import type { Graph } from './graph'

/**
 * Spec §46.11 — depends_on edges may form cycles and are permitted.
 * Every cycle is surfaced so the interface can flag it and next-task can
 * report it rather than silently omitting nodes that can never start.
 *
 * Tarjan's strongly-connected-components algorithm. Each component of more
 * than one node is a cycle; a single node is a cycle only if it depends on
 * itself.
 */
export function findDependencyCycles(graph: Graph): string[][] {
  const index = new Map<string, number>()
  const low = new Map<string, number>()
  const onStack = new Set<string>()
  const stack: string[] = []
  const cycles: string[][] = []
  let counter = 0

  function connect(v: string): void {
    index.set(v, counter)
    low.set(v, counter)
    counter += 1
    stack.push(v)
    onStack.add(v)

    for (const dep of graph.dependenciesOf(v)) {
      const w = dep.id
      if (!index.has(w)) {
        connect(w)
        low.set(v, Math.min(low.get(v)!, low.get(w)!))
      } else if (onStack.has(w)) {
        low.set(v, Math.min(low.get(v)!, index.get(w)!))
      }
    }

    if (low.get(v) !== index.get(v)) return

    const component: string[] = []
    let w: string
    do {
      w = stack.pop()!
      onStack.delete(w)
      component.push(w)
    } while (w !== v)

    if (component.length > 1) {
      cycles.push(component.sort())
    } else if (graph.dependenciesOf(v).some(d => d.id === v)) {
      cycles.push([v])
    }
  }

  for (const node of graph.all()) {
    if (!index.has(node.id)) connect(node.id)
  }
  return cycles
}

export function nodesInCycles(graph: Graph): Set<string> {
  return new Set(findDependencyCycles(graph).flat())
}

/**
 * Containment must stay acyclic (spec §46.2). Adding "source contains target"
 * closes a loop when source is target, or when target is already an ancestor
 * of source.
 */
export function wouldCreateContainsCycle(
  graph: Graph, sourceId: string, targetId: string,
): boolean {
  if (sourceId === targetId) return true
  return graph.ancestorsOf(sourceId).some(a => a.id === targetId)
}
```

- [ ] **Step 4: Run and watch it pass**

Run: `npm test tests/domain/cycles.test.ts`
Expected: PASS — 9 tests

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: detect dependency cycles and guard containment cycles"
```

---

### Task 6: Next-task recommendation

Implements §46.13, satisfying §23 with no AI.

**Files:**
- Create: `src/domain/nextTask.ts`
- Test: `tests/domain/nextTask.test.ts`

**Interfaces:**
- Consumes: `Graph` (Task 3), `isResolved` (Task 4), `findDependencyCycles` (Task 5)
- Produces:
  - `interface NextTaskResult { recommendation: { node: GraphNode; reason: string } | null; emptyReason: 'empty_project' | 'all_done' | 'all_blocked' | 'cycle_only' | null; cycles: string[][] }`
  - `recommendNextTask(graph: Graph): NextTaskResult`

- [ ] **Step 1: Write the failing tests**

Create `tests/domain/nextTask.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { Graph } from '@/domain/graph'
import { recommendNextTask } from '@/domain/nextTask'
import { buildGraph } from '../helpers/graph'

describe('recommendNextTask', () => {
  it('recommends the leaf whose dependencies are all resolved', () => {
    // send done → verify startable → session waiting
    const g = new Graph(buildGraph({
      nodes: [
        { id: 'send', type: 'task', status: 'done', title: 'Send OTP' },
        { id: 'verify', type: 'task', status: 'not_started', title: 'Verify OTP' },
        { id: 'session', type: 'task', status: 'not_started', title: 'Session Creation' },
      ],
      edges: [
        ['verify', 'send', 'depends_on'],
        ['session', 'verify', 'depends_on'],
      ],
    }))
    const result = recommendNextTask(g)
    expect(result.recommendation?.node.id).toBe('verify')
    expect(result.recommendation?.reason)
      .toBe('Send OTP is complete, and Session Creation is waiting on this.')
  })

  it('never recommends a node with children', () => {
    const g = new Graph(buildGraph({
      nodes: [
        { id: 'auth', type: 'system' },
        { id: 'send', type: 'task' },
      ],
      edges: [['auth', 'send', 'contains']],
    }))
    expect(recommendNextTask(g).recommendation?.node.id).toBe('send')
  })

  it('prefers a node carrying the higher-priority tag', () => {
    const g = new Graph(buildGraph({
      tags: [
        { id: 'mvp', name: 'MVP', color: '#f00', priority: 0 },
        { id: 'mob', name: 'Mobile', color: '#00f', priority: 1 },
      ],
      nodes: [
        { id: 'a', type: 'task', tagIds: ['mob'] },
        { id: 'b', type: 'task', tagIds: ['mvp'] },
      ],
    }))
    expect(recommendNextTask(g).recommendation?.node.id).toBe('b')
  })

  it('prefers the node that unblocks more work when tags are equal', () => {
    const g = new Graph(buildGraph({
      nodes: [
        { id: 'a', type: 'task' },
        { id: 'b', type: 'task' },
        { id: 'x', type: 'task' },
        { id: 'y', type: 'task' },
      ],
      edges: [
        ['x', 'b', 'depends_on'],
        ['y', 'b', 'depends_on'],
      ],
    }))
    expect(recommendNextTask(g).recommendation?.node.id).toBe('b')
  })

  it('reports all_done when everything is resolved', () => {
    const g = new Graph(buildGraph({
      nodes: [{ id: 'a', type: 'task', status: 'done' }],
    }))
    const result = recommendNextTask(g)
    expect(result.recommendation).toBeNull()
    expect(result.emptyReason).toBe('all_done')
  })

  it('reports all_blocked when every candidate has unresolved dependencies', () => {
    const g = new Graph(buildGraph({
      nodes: [
        { id: 'a', type: 'task', status: 'not_started' },
        { id: 'b', type: 'task', status: 'not_started' },
      ],
      edges: [['a', 'b', 'depends_on'], ['b', 'a', 'depends_on']],
    }))
    const result = recommendNextTask(g)
    expect(result.recommendation).toBeNull()
    expect(result.emptyReason).toBe('cycle_only')
    expect(result.cycles).toEqual([['a', 'b']])
  })

  it('reports cycles even when it has a recommendation', () => {
    const g = new Graph(buildGraph({
      nodes: [
        { id: 'free', type: 'task' },
        { id: 'a', type: 'task' },
        { id: 'b', type: 'task' },
      ],
      edges: [['a', 'b', 'depends_on'], ['b', 'a', 'depends_on']],
    }))
    const result = recommendNextTask(g)
    expect(result.recommendation?.node.id).toBe('free')
    expect(result.cycles).toEqual([['a', 'b']])
  })

  it('reports empty_project for a graph with no nodes', () => {
    const g = new Graph(buildGraph({ nodes: [] }))
    expect(recommendNextTask(g).emptyReason).toBe('empty_project')
  })

  it('explains a node that has neither dependencies nor dependents', () => {
    const g = new Graph(buildGraph({ nodes: [{ id: 'a', type: 'task', title: 'Solo' }] }))
    expect(recommendNextTask(g).recommendation?.reason).toBe('Nothing is blocking this work.')
  })
})
```

- [ ] **Step 2: Run and watch it fail**

Run: `npm test tests/domain/nextTask.test.ts`
Expected: FAIL — `Cannot find module '@/domain/nextTask'`

- [ ] **Step 3: Write the implementation**

Create `src/domain/nextTask.ts`:

```ts
import type { Graph } from './graph'
import { isResolved } from './status'
import { findDependencyCycles, nodesInCycles } from './cycles'
import type { GraphNode } from './types'

export interface NextTaskResult {
  recommendation: { node: GraphNode; reason: string } | null
  /** Why there is no recommendation. Null when there is one. */
  emptyReason: 'empty_project' | 'all_done' | 'all_blocked' | 'cycle_only' | null
  /** Always reported, per §46.11, even alongside a recommendation. */
  cycles: string[][]
}

/**
 * Spec §46.13 — computed, not generated.
 *
 * A candidate is an unresolved leaf whose every dependency is resolved.
 * Candidates are ordered by tag priority, then by how much they unblock,
 * then by depth, then by id so the result is stable.
 */
export function recommendNextTask(graph: Graph): NextTaskResult {
  const cycles = findDependencyCycles(graph)
  const all = graph.all()

  if (all.length === 0) {
    return { recommendation: null, emptyReason: 'empty_project', cycles }
  }

  const unresolvedLeaves = all.filter(n => graph.isLeaf(n.id) && !isResolved(n))

  if (unresolvedLeaves.length === 0) {
    return { recommendation: null, emptyReason: 'all_done', cycles }
  }

  const candidates = unresolvedLeaves.filter(
    n => graph.dependenciesOf(n.id).every(isResolved),
  )

  if (candidates.length === 0) {
    const inCycle = nodesInCycles(graph)
    const everyBlockedNodeIsInACycle = unresolvedLeaves.every(n => inCycle.has(n.id))
    return {
      recommendation: null,
      emptyReason: everyBlockedNodeIsInACycle && cycles.length > 0 ? 'cycle_only' : 'all_blocked',
      cycles,
    }
  }

  const best = candidates.sort((a, b) => compare(graph, a, b))[0]!
  return {
    recommendation: { node: best, reason: reasonFor(graph, best) },
    emptyReason: null,
    cycles,
  }
}

function compare(graph: Graph, a: GraphNode, b: GraphNode): number {
  const byTag = tagPriority(graph, a) - tagPriority(graph, b)
  if (byTag !== 0) return byTag

  const byUnblocking = unblockCount(graph, b) - unblockCount(graph, a)
  if (byUnblocking !== 0) return byUnblocking

  const byDepth = graph.ancestorsOf(a.id).length - graph.ancestorsOf(b.id).length
  if (byDepth !== 0) return byDepth

  return a.id.localeCompare(b.id)
}

/** Lower wins. An untagged node ranks after every tagged node. */
function tagPriority(graph: Graph, node: GraphNode): number {
  const priorities = node.tagIds
    .map(id => graph.tags.find(t => t.id === id)?.priority)
    .filter((p): p is number => p !== undefined)
  return priorities.length > 0 ? Math.min(...priorities) : Number.MAX_SAFE_INTEGER
}

/** How many nodes are transitively waiting on this one. */
function unblockCount(graph: Graph, node: GraphNode): number {
  const seen = new Set<string>()
  const queue = [node.id]
  while (queue.length > 0) {
    for (const dependent of graph.dependentsOf(queue.shift()!)) {
      if (seen.has(dependent.id)) continue
      seen.add(dependent.id)
      queue.push(dependent.id)
    }
  }
  return seen.size
}

function reasonFor(graph: Graph, node: GraphNode): string {
  const deps = graph.dependenciesOf(node.id)
  const dependents = graph.dependentsOf(node.id)
  const parts: string[] = []

  if (deps.length > 0) {
    parts.push(`${list(deps.map(d => d.title))} ${deps.length === 1 ? 'is' : 'are'} complete`)
  }
  if (dependents.length > 0) {
    const verb = dependents.length === 1 ? 'is' : 'are'
    parts.push(`${list(dependents.map(d => d.title))} ${verb} waiting on this`)
  }
  if (parts.length === 0) return 'Nothing is blocking this work.'
  return `${parts.join(', and ')}.`
}

function list(names: string[]): string {
  if (names.length <= 1) return names[0] ?? ''
  return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`
}
```

- [ ] **Step 4: Run and watch it pass**

Run: `npm test tests/domain/nextTask.test.ts`
Expected: PASS — 9 tests

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: compute next-task recommendation from dependencies and tags"
```

---

### Task 7: Canvas layout

Implements §46.8. Pure computation; React Flow consumes the result in Task 14.

**Files:**
- Create: `src/domain/layout.ts`
- Test: `tests/domain/layout.test.ts`

**Interfaces:**
- Consumes: `Graph` from Task 3
- Produces:
  - `interface XY { x: number; y: number }`
  - `const NODE_WIDTH = 240`, `const NODE_HEIGHT = 96`
  - `computeLayout(graph: Graph): Map<string, XY>`

- [ ] **Step 1: Write the failing tests**

Exact dagre coordinates are an implementation detail and brittle to assert. These tests pin the behaviour §46.8 actually promises: pinned nodes land exactly where the user left them, and their subtrees travel with them.

Create `tests/domain/layout.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { Graph } from '@/domain/graph'
import { computeLayout } from '@/domain/layout'
import { buildGraph } from '../helpers/graph'

describe('computeLayout', () => {
  it('gives every node a position', () => {
    const g = new Graph(buildGraph({
      nodes: [{ id: 'a', type: 'goal' }, { id: 'b', type: 'system' }],
      edges: [['a', 'b', 'contains']],
    }))
    const layout = computeLayout(g)
    expect(layout.size).toBe(2)
    expect(layout.get('a')).toBeDefined()
    expect(layout.get('b')).toBeDefined()
  })

  it('places a child below its parent', () => {
    const g = new Graph(buildGraph({
      nodes: [{ id: 'a', type: 'goal' }, { id: 'b', type: 'system' }],
      edges: [['a', 'b', 'contains']],
    }))
    const layout = computeLayout(g)
    expect(layout.get('b')!.y).toBeGreaterThan(layout.get('a')!.y)
  })

  it('puts a pinned node exactly where the user left it', () => {
    const g = new Graph(buildGraph({
      nodes: [{ id: 'a', type: 'goal', posX: 1000, posY: 2000 }],
    }))
    expect(computeLayout(g).get('a')).toEqual({ x: 1000, y: 2000 })
  })

  it('moves a pinned node subtree by the same offset', () => {
    const unpinned = new Graph(buildGraph({
      nodes: [
        { id: 'root', type: 'goal' },
        { id: 'auth', type: 'system' },
        { id: 'phone', type: 'system' },
      ],
      edges: [['root', 'auth', 'contains'], ['auth', 'phone', 'contains']],
    }))
    const before = computeLayout(unpinned)

    const pinned = new Graph(buildGraph({
      nodes: [
        { id: 'root', type: 'goal' },
        { id: 'auth', type: 'system', posX: before.get('auth')!.x + 500, posY: before.get('auth')!.y },
        { id: 'phone', type: 'system' },
      ],
      edges: [['root', 'auth', 'contains'], ['auth', 'phone', 'contains']],
    }))
    const after = computeLayout(pinned)

    expect(after.get('phone')!.x).toBe(before.get('phone')!.x + 500)
    expect(after.get('root')!.x).toBe(before.get('root')!.x)
  })

  it('lets an inner pin override its ancestor offset', () => {
    const g = new Graph(buildGraph({
      nodes: [
        { id: 'root', type: 'goal' },
        { id: 'auth', type: 'system', posX: 900, posY: 900 },
        { id: 'phone', type: 'system', posX: 10, posY: 20 },
      ],
      edges: [['root', 'auth', 'contains'], ['auth', 'phone', 'contains']],
    }))
    const layout = computeLayout(g)
    expect(layout.get('auth')).toEqual({ x: 900, y: 900 })
    expect(layout.get('phone')).toEqual({ x: 10, y: 20 })
  })

  it('ignores depends_on edges when arranging', () => {
    const withDep = new Graph(buildGraph({
      nodes: [{ id: 'a', type: 'task' }, { id: 'b', type: 'task' }],
      edges: [['a', 'b', 'depends_on']],
    }))
    const withNothing = new Graph(buildGraph({
      nodes: [{ id: 'a', type: 'task' }, { id: 'b', type: 'task' }],
    }))
    expect(computeLayout(withDep)).toEqual(computeLayout(withNothing))
  })
})
```

- [ ] **Step 2: Run and watch it fail**

Run: `npm test tests/domain/layout.test.ts`
Expected: FAIL — `Cannot find module '@/domain/layout'`

- [ ] **Step 3: Write the implementation**

Create `src/domain/layout.ts`:

```ts
import dagre from '@dagrejs/dagre'
import type { Graph } from './graph'

export interface XY { x: number; y: number }

export const NODE_WIDTH = 240
export const NODE_HEIGHT = 96

/**
 * Spec §46.8 — automatic layout, with anything the user has dragged pinned
 * in place.
 *
 * dagre arranges the containment tree. Each pinned node is then moved to its
 * stored position and its subtree shifted by the same offset, so dragging a
 * parent carries its children rather than stretching edges across the canvas.
 * Pins are applied outermost first, so an inner pin overrides the offset it
 * would otherwise inherit.
 */
export function computeLayout(graph: Graph): Map<string, XY> {
  const positions = dagreBase(graph)

  const pinned = graph.all()
    .filter(n => n.posX !== null && n.posY !== null)
    .sort((a, b) => graph.ancestorsOf(a.id).length - graph.ancestorsOf(b.id).length)

  const pinnedIds = new Set(pinned.map(n => n.id))

  for (const node of pinned) {
    const current = positions.get(node.id)
    if (!current) continue

    const dx = node.posX! - current.x
    const dy = node.posY! - current.y
    positions.set(node.id, { x: node.posX!, y: node.posY! })

    for (const descendant of graph.descendantsOf(node.id)) {
      if (pinnedIds.has(descendant.id)) continue
      const p = positions.get(descendant.id)
      if (!p) continue
      positions.set(descendant.id, { x: p.x + dx, y: p.y + dy })
    }
  }

  return positions
}

function dagreBase(graph: Graph): Map<string, XY> {
  const d = new dagre.graphlib.Graph()
  d.setGraph({ rankdir: 'TB', nodesep: 60, ranksep: 90 })
  d.setDefaultEdgeLabel(() => ({}))

  for (const node of graph.all()) {
    d.setNode(node.id, { width: NODE_WIDTH, height: NODE_HEIGHT })
  }
  // Only containment shapes the layout. depends_on edges are drawn but do
  // not influence position, or unrelated branches would be dragged together.
  for (const node of graph.all()) {
    for (const child of graph.childrenOf(node.id)) {
      d.setEdge(node.id, child.id)
    }
  }

  dagre.layout(d)

  const out = new Map<string, XY>()
  for (const node of graph.all()) {
    const positioned = d.node(node.id) as { x: number; y: number }
    out.set(node.id, {
      x: positioned.x - NODE_WIDTH / 2,
      y: positioned.y - NODE_HEIGHT / 2,
    })
  }
  return out
}
```

- [ ] **Step 4: Run and watch it pass**

Run: `npm test tests/domain/layout.test.ts`
Expected: PASS — 6 tests

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: compute canvas layout with pinned node offsets"
```

---

### Task 8: Loading a project graph

Implements §46.5 — the whole graph in one load, which everything else computes from.

**Files:**
- Create: `src/server/auth.ts`, `src/server/graphLoad.ts`
- Test: `tests/server/graphLoad.test.ts`

**Interfaces:**
- Consumes: `db` (Task 1), schema tables (Task 2), `ProjectGraph` (Task 3)
- Produces:
  - `assertOwnsProject(userId: string, projectId: string): Promise<void>` — throws `ForbiddenError` when the project is missing or owned by someone else
  - `class ForbiddenError extends Error`
  - `loadProjectGraph(userId: string, projectId: string): Promise<ProjectGraph>`

- [ ] **Step 1: Write the failing tests**

Create `tests/server/graphLoad.test.ts`:

```ts
import { describe, it, expect, beforeEach } from 'vitest'
import { eq } from 'drizzle-orm'
import { db } from '@/db/client'
import { nodes, edges, tags, nodeTags, projects } from '@/db/schema'
import { loadProjectGraph } from '@/server/graphLoad'
import { ForbiddenError } from '@/server/auth'
import { resetDb, makeProject, TEST_USER } from '../helpers/db'

const OTHER_USER = '00000000-0000-0000-0000-000000000002'

describe('loadProjectGraph', () => {
  beforeEach(resetDb)

  it('returns nodes, edges and tags for the project', async () => {
    const projectId = await makeProject()
    const [a] = await db.insert(nodes).values({ projectId, title: 'A', type: 'system' }).returning()
    const [b] = await db.insert(nodes).values({ projectId, title: 'B', type: 'task' }).returning()
    await db.insert(edges).values({
      projectId, sourceNodeId: a!.id, targetNodeId: b!.id, type: 'contains',
    })
    const [tag] = await db.insert(tags)
      .values({ projectId, name: 'MVP', color: '#f00', priority: 0 }).returning()
    await db.insert(nodeTags).values({ nodeId: b!.id, tagId: tag!.id })

    const graph = await loadProjectGraph(TEST_USER, projectId)

    expect(graph.nodes).toHaveLength(2)
    expect(graph.edges).toHaveLength(1)
    expect(graph.tags).toEqual([{ id: tag!.id, name: 'MVP', color: '#f00', priority: 0 }])
    expect(graph.nodes.find(n => n.id === b!.id)!.tagIds).toEqual([tag!.id])
  })

  it('omits soft-deleted nodes and edges', async () => {
    const projectId = await makeProject()
    const [a] = await db.insert(nodes).values({ projectId, title: 'A', type: 'system' }).returning()
    const [b] = await db.insert(nodes).values({ projectId, title: 'B', type: 'task' }).returning()
    const [e] = await db.insert(edges).values({
      projectId, sourceNodeId: a!.id, targetNodeId: b!.id, type: 'contains',
    }).returning()

    await db.update(nodes).set({ deletedAt: new Date() }).where(eq(nodes.id, b!.id))
    await db.update(edges).set({ deletedAt: new Date() }).where(eq(edges.id, e!.id))

    const graph = await loadProjectGraph(TEST_USER, projectId)
    expect(graph.nodes.map(n => n.id)).toEqual([a!.id])
    expect(graph.edges).toEqual([])
  })

  it('does not leak nodes from another project', async () => {
    const mine = await makeProject('Mine')
    const theirs = await makeProject('Theirs')
    await db.insert(nodes).values({ projectId: theirs, title: 'Theirs', type: 'system' })

    const graph = await loadProjectGraph(TEST_USER, mine)
    expect(graph.nodes).toEqual([])
  })

  it('refuses a project owned by someone else', async () => {
    const [p] = await db.insert(projects)
      .values({ ownerId: OTHER_USER, name: 'Not yours' }).returning()

    await expect(loadProjectGraph(TEST_USER, p!.id)).rejects.toThrow(ForbiddenError)
  })

  it('refuses a project that does not exist', async () => {
    await expect(
      loadProjectGraph(TEST_USER, '00000000-0000-0000-0000-0000000000ff'),
    ).rejects.toThrow(ForbiddenError)
  })
})
```

- [ ] **Step 2: Run and watch it fail**

Run: `npm test tests/server/graphLoad.test.ts`
Expected: FAIL — `Cannot find module '@/server/graphLoad'`

- [ ] **Step 3: Write the ownership guard**

Create `src/server/auth.ts`:

```ts
import { and, eq } from 'drizzle-orm'
import { db } from '@/db/client'
import { projects } from '@/db/schema'

export class ForbiddenError extends Error {
  constructor(message = 'Project not found or not yours') {
    super(message)
    this.name = 'ForbiddenError'
  }
}

/**
 * Every server function starts here. A missing project and a project owned by
 * someone else produce the same error, so this cannot be used to discover
 * which project ids exist.
 */
export async function assertOwnsProject(userId: string, projectId: string): Promise<void> {
  const found = await db.select({ id: projects.id })
    .from(projects)
    .where(and(eq(projects.id, projectId), eq(projects.ownerId, userId)))
    .limit(1)

  if (found.length === 0) throw new ForbiddenError()
}
```

- [ ] **Step 4: Write the loader**

Create `src/server/graphLoad.ts`:

```ts
import { and, asc, eq, isNull } from 'drizzle-orm'
import { db } from '@/db/client'
import { edges, nodeTags, nodes, tags } from '@/db/schema'
import { assertOwnsProject } from './auth'
import type { GraphEdge, GraphNode, ProjectGraph, Tag } from '@/domain/types'

/**
 * Spec §46.4 — the entire project graph is loaded in one go. Progress,
 * cycles, next-task and layout are then computed in memory, so none of them
 * needs a round trip.
 */
export async function loadProjectGraph(
  userId: string, projectId: string,
): Promise<ProjectGraph> {
  await assertOwnsProject(userId, projectId)

  const [nodeRows, edgeRows, tagRows, nodeTagRows] = await Promise.all([
    db.select().from(nodes)
      .where(and(eq(nodes.projectId, projectId), isNull(nodes.deletedAt)))
      .orderBy(asc(nodes.createdAt)),
    db.select().from(edges)
      .where(and(eq(edges.projectId, projectId), isNull(edges.deletedAt)))
      .orderBy(asc(edges.createdAt)),
    db.select().from(tags)
      .where(eq(tags.projectId, projectId))
      .orderBy(asc(tags.priority)),
    db.select({ nodeId: nodeTags.nodeId, tagId: nodeTags.tagId })
      .from(nodeTags)
      .innerJoin(tags, eq(tags.id, nodeTags.tagId))
      .where(eq(tags.projectId, projectId)),
  ])

  const tagsByNode = new Map<string, string[]>()
  for (const row of nodeTagRows) {
    const list = tagsByNode.get(row.nodeId)
    if (list) list.push(row.tagId)
    else tagsByNode.set(row.nodeId, [row.tagId])
  }

  const liveNodeIds = new Set(nodeRows.map(n => n.id))

  const graphNodes: GraphNode[] = nodeRows.map(n => ({
    id: n.id,
    title: n.title,
    description: n.description,
    type: n.type,
    status: n.status,
    data: (n.data ?? {}) as Record<string, unknown>,
    posX: n.posX,
    posY: n.posY,
    tagIds: tagsByNode.get(n.id) ?? [],
  }))

  // An edge whose endpoint was soft deleted is not returned. Without this a
  // deleted branch would leave arrows pointing at nodes the canvas has no
  // record of (spec §46.9).
  const graphEdges: GraphEdge[] = edgeRows
    .filter(e => liveNodeIds.has(e.sourceNodeId) && liveNodeIds.has(e.targetNodeId))
    .map(e => ({ id: e.id, source: e.sourceNodeId, target: e.targetNodeId, type: e.type }))

  const graphTags: Tag[] = tagRows.map(t => ({
    id: t.id, name: t.name, color: t.color, priority: t.priority,
  }))

  return { nodes: graphNodes, edges: graphEdges, tags: graphTags }
}
```

- [ ] **Step 5: Run and watch it pass**

Run: `npm test tests/server/graphLoad.test.ts`
Expected: PASS — 5 tests

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: load a whole project graph with ownership checks"
```

---

### Task 9: Node mutations

Implements §46.4 (legal statuses), §46.8 (pinning), §46.9 (cascading soft delete and undo).

**Files:**
- Create: `src/server/errors.ts`, `src/server/nodes.ts`
- Test: `tests/server/nodes.test.ts`

**Interfaces:**
- Consumes: `db`, schema tables, `assertOwnsProject` and `ForbiddenError` from `@/server/auth` (Task 8), `loadProjectGraph` (Task 8), `Graph` (Task 3), `legalStatuses` (Task 4), `wouldCreateContainsCycle` (Task 5)
- Produces, all exported from `src/server/nodes.ts`:
  - `createNode(userId, projectId, input: { title: string; type: NodeType; description?: string; parentId?: string }): Promise<string>` — returns the new node id
  - `updateNode(userId, projectId, nodeId, patch: { title?: string; description?: string | null; status?: NodeStatus; data?: Record<string, unknown> }): Promise<void>`
  - `moveNode(userId, projectId, nodeId, newParentId: string | null): Promise<void>`
  - `setPosition(userId, projectId, nodeId, x: number, y: number): Promise<void>`
  - `clearPositions(userId, projectId): Promise<void>`
  - `deleteNode(userId, projectId, nodeId): Promise<{ deletedAt: Date; nodeCount: number }>`
  - `undoDelete(userId, projectId, deletedAt: Date): Promise<void>`
- Also produces `class ValidationError extends Error` from `src/server/errors.ts`

- [ ] **Step 1: Write the failing tests**

Create `tests/server/nodes.test.ts`:

```ts
import { describe, it, expect, beforeEach } from 'vitest'
import { eq } from 'drizzle-orm'
import { db } from '@/db/client'
import { nodes } from '@/db/schema'
import {
  createNode, updateNode, moveNode, setPosition,
  clearPositions, deleteNode, undoDelete,
} from '@/server/nodes'
import { ValidationError } from '@/server/errors'
import { loadProjectGraph } from '@/server/graphLoad'
import { Graph } from '@/domain/graph'
import { resetDb, makeProject, TEST_USER } from '../helpers/db'

const load = (projectId: string) =>
  loadProjectGraph(TEST_USER, projectId).then(g => new Graph(g))

describe('createNode', () => {
  beforeEach(resetDb)

  it('creates a root node with no parent', async () => {
    const projectId = await makeProject()
    const id = await createNode(TEST_USER, projectId, { title: 'Booked', type: 'goal' })

    const g = await load(projectId)
    expect(g.node(id)!.title).toBe('Booked')
    expect(g.parentOf(id)).toBeNull()
  })

  it('creates a contains edge when given a parent', async () => {
    const projectId = await makeProject()
    const parent = await createNode(TEST_USER, projectId, { title: 'Auth', type: 'system' })
    const child = await createNode(TEST_USER, projectId, {
      title: 'Send OTP', type: 'task', parentId: parent,
    })

    const g = await load(projectId)
    expect(g.parentOf(child)!.id).toBe(parent)
    expect(g.childrenOf(parent).map(n => n.id)).toEqual([child])
  })

  it('refuses a parent from another project', async () => {
    const mine = await makeProject('Mine')
    const theirs = await makeProject('Theirs')
    const foreign = await createNode(TEST_USER, theirs, { title: 'X', type: 'system' })

    await expect(
      createNode(TEST_USER, mine, { title: 'Y', type: 'task', parentId: foreign }),
    ).rejects.toThrow(ValidationError)
  })
})

describe('updateNode', () => {
  beforeEach(resetDb)

  it('updates the title and description', async () => {
    const projectId = await makeProject()
    const id = await createNode(TEST_USER, projectId, { title: 'Auth', type: 'system' })

    await updateNode(TEST_USER, projectId, id, { title: 'Authentication', description: 'Sign in' })

    const g = await load(projectId)
    expect(g.node(id)!.title).toBe('Authentication')
    expect(g.node(id)!.description).toBe('Sign in')
  })

  it('accepts Done on a leaf', async () => {
    const projectId = await makeProject()
    const id = await createNode(TEST_USER, projectId, { title: 'Send OTP', type: 'task' })

    await updateNode(TEST_USER, projectId, id, { status: 'done' })
    expect((await load(projectId)).node(id)!.status).toBe('done')
  })

  it('refuses Done on a node that has children', async () => {
    const projectId = await makeProject()
    const parent = await createNode(TEST_USER, projectId, { title: 'Auth', type: 'system' })
    await createNode(TEST_USER, projectId, { title: 'Send OTP', type: 'task', parentId: parent })

    await expect(
      updateNode(TEST_USER, projectId, parent, { status: 'done' }),
    ).rejects.toThrow(ValidationError)
  })

  it('refuses a status that does not belong to the type', async () => {
    const projectId = await makeProject()
    const id = await createNode(TEST_USER, projectId, { title: 'Q?', type: 'question' })

    await expect(
      updateNode(TEST_USER, projectId, id, { status: 'done' }),
    ).rejects.toThrow(ValidationError)
  })
})

describe('moveNode', () => {
  beforeEach(resetDb)

  it('reparents a node', async () => {
    const projectId = await makeProject()
    const a = await createNode(TEST_USER, projectId, { title: 'A', type: 'system' })
    const b = await createNode(TEST_USER, projectId, { title: 'B', type: 'system' })
    const child = await createNode(TEST_USER, projectId, { title: 'C', type: 'task', parentId: a })

    await moveNode(TEST_USER, projectId, child, b)

    const g = await load(projectId)
    expect(g.parentOf(child)!.id).toBe(b)
    expect(g.childrenOf(a)).toEqual([])
  })

  it('makes a node a root when given a null parent', async () => {
    const projectId = await makeProject()
    const a = await createNode(TEST_USER, projectId, { title: 'A', type: 'system' })
    const child = await createNode(TEST_USER, projectId, { title: 'C', type: 'task', parentId: a })

    await moveNode(TEST_USER, projectId, child, null)
    expect((await load(projectId)).parentOf(child)).toBeNull()
  })

  it('refuses a move that would put a node inside its own descendant', async () => {
    const projectId = await makeProject()
    const a = await createNode(TEST_USER, projectId, { title: 'A', type: 'system' })
    const b = await createNode(TEST_USER, projectId, { title: 'B', type: 'system', parentId: a })

    await expect(moveNode(TEST_USER, projectId, a, b)).rejects.toThrow(ValidationError)
  })

  it('refuses a node moved inside itself', async () => {
    const projectId = await makeProject()
    const a = await createNode(TEST_USER, projectId, { title: 'A', type: 'system' })

    await expect(moveNode(TEST_USER, projectId, a, a)).rejects.toThrow(ValidationError)
  })
})

describe('positions', () => {
  beforeEach(resetDb)

  it('pins a node when a position is set', async () => {
    const projectId = await makeProject()
    const id = await createNode(TEST_USER, projectId, { title: 'A', type: 'system' })

    await setPosition(TEST_USER, projectId, id, 120, 340)

    const g = await load(projectId)
    expect(g.node(id)!.posX).toBe(120)
    expect(g.node(id)!.posY).toBe(340)
  })

  it('clears every pin in the project', async () => {
    const projectId = await makeProject()
    const a = await createNode(TEST_USER, projectId, { title: 'A', type: 'system' })
    const b = await createNode(TEST_USER, projectId, { title: 'B', type: 'system' })
    await setPosition(TEST_USER, projectId, a, 1, 2)
    await setPosition(TEST_USER, projectId, b, 3, 4)

    await clearPositions(TEST_USER, projectId)

    const g = await load(projectId)
    expect(g.node(a)!.posX).toBeNull()
    expect(g.node(b)!.posX).toBeNull()
  })
})

describe('deleteNode', () => {
  beforeEach(resetDb)

  it('deletes the node and every descendant', async () => {
    const projectId = await makeProject()
    const auth = await createNode(TEST_USER, projectId, { title: 'Auth', type: 'system' })
    const phone = await createNode(TEST_USER, projectId, { title: 'Phone', type: 'system', parentId: auth })
    await createNode(TEST_USER, projectId, { title: 'Send', type: 'task', parentId: phone })
    const other = await createNode(TEST_USER, projectId, { title: 'Booking', type: 'system' })

    const result = await deleteNode(TEST_USER, projectId, auth)

    expect(result.nodeCount).toBe(3)
    const g = await load(projectId)
    expect(g.all().map(n => n.id)).toEqual([other])
  })

  it('removes edges that pointed into the deleted branch', async () => {
    const projectId = await makeProject()
    const availability = await createNode(TEST_USER, projectId, { title: 'Availability', type: 'system' })
    const booking = await createNode(TEST_USER, projectId, { title: 'Booking', type: 'system' })
    // Booking depends on Availability; deleting Availability must take the edge.
    const { createEdge } = await import('@/server/edges')
    await createEdge(TEST_USER, projectId, booking, availability, 'depends_on')

    await deleteNode(TEST_USER, projectId, availability)

    const g = await load(projectId)
    expect(g.dependenciesOf(booking)).toEqual([])
  })

  it('is undone by undoDelete', async () => {
    const projectId = await makeProject()
    const auth = await createNode(TEST_USER, projectId, { title: 'Auth', type: 'system' })
    await createNode(TEST_USER, projectId, { title: 'Phone', type: 'system', parentId: auth })

    const { deletedAt } = await deleteNode(TEST_USER, projectId, auth)
    expect((await load(projectId)).all()).toHaveLength(0)

    await undoDelete(TEST_USER, projectId, deletedAt)

    const g = await load(projectId)
    expect(g.all()).toHaveLength(2)
    expect(g.childrenOf(auth)).toHaveLength(1)
  })

  it('leaves rows in the table rather than removing them', async () => {
    const projectId = await makeProject()
    const id = await createNode(TEST_USER, projectId, { title: 'A', type: 'system' })

    await deleteNode(TEST_USER, projectId, id)

    const rows = await db.select().from(nodes).where(eq(nodes.id, id))
    expect(rows).toHaveLength(1)
    expect(rows[0]!.deletedAt).not.toBeNull()
  })
})
```

- [ ] **Step 2: Run and watch it fail**

Run: `npm test tests/server/nodes.test.ts`
Expected: FAIL — `Cannot find module '@/server/errors'`

- [ ] **Step 3: Write the error type**

Create `src/server/errors.ts`:

```ts
/** A request that is well-formed but breaks a spec rule. Safe to show a user. */
export class ValidationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ValidationError'
  }
}
```

`ForbiddenError` stays in `src/server/auth.ts` where Task 8 defined it.

- [ ] **Step 4: Write the node mutations**

Create `src/server/nodes.ts`:

```ts
import { and, eq, inArray, isNull } from 'drizzle-orm'
import { db } from '@/db/client'
import { edges, nodes } from '@/db/schema'
import { assertOwnsProject } from './auth'
import { ValidationError } from './errors'
import { loadProjectGraph } from './graphLoad'
import { Graph } from '@/domain/graph'
import { legalStatuses } from '@/domain/status'
import { wouldCreateContainsCycle } from '@/domain/cycles'
import type { NodeStatus, NodeType } from '@/domain/types'

export interface CreateNodeInput {
  title: string
  type: NodeType
  description?: string
  parentId?: string
}

export async function createNode(
  userId: string, projectId: string, input: CreateNodeInput,
): Promise<string> {
  await assertOwnsProject(userId, projectId)

  if (input.title.trim() === '') throw new ValidationError('Title cannot be empty')

  if (input.parentId) {
    const parent = await liveNode(projectId, input.parentId)
    if (!parent) throw new ValidationError('Parent is not a node in this project')
  }

  return db.transaction(async (tx) => {
    const [created] = await tx.insert(nodes).values({
      projectId,
      title: input.title.trim(),
      description: input.description ?? null,
      type: input.type,
      status: input.type === 'question' ? 'open'
        : input.type === 'decision' ? 'proposed'
        : 'not_started',
    }).returning()

    if (input.parentId) {
      await tx.insert(edges).values({
        projectId,
        sourceNodeId: input.parentId,
        targetNodeId: created!.id,
        type: 'contains',
      })
    }
    return created!.id
  })
}

export interface UpdateNodePatch {
  title?: string
  description?: string | null
  status?: NodeStatus
  data?: Record<string, unknown>
}

export async function updateNode(
  userId: string, projectId: string, nodeId: string, patch: UpdateNodePatch,
): Promise<void> {
  await assertOwnsProject(userId, projectId)

  const graph = new Graph(await loadProjectGraph(userId, projectId))
  const node = graph.node(nodeId)
  if (!node) throw new ValidationError('Node is not in this project')

  if (patch.title !== undefined && patch.title.trim() === '') {
    throw new ValidationError('Title cannot be empty')
  }

  if (patch.status !== undefined) {
    // Spec §46.4 — a node with children cannot be set to a resolving status.
    const allowed = legalStatuses(node.type, graph.isLeaf(nodeId))
    if (!allowed.includes(patch.status)) {
      throw new ValidationError(
        `${patch.status} is not available for a ${node.type} ` +
        `${graph.isLeaf(nodeId) ? 'leaf' : 'with children'}`,
      )
    }
  }

  await db.update(nodes).set({
    ...(patch.title !== undefined ? { title: patch.title.trim() } : {}),
    ...(patch.description !== undefined ? { description: patch.description } : {}),
    ...(patch.status !== undefined ? { status: patch.status } : {}),
    ...(patch.data !== undefined ? { data: patch.data } : {}),
    updatedAt: new Date(),
  }).where(eq(nodes.id, nodeId))
}

/**
 * Spec §46.2 — moving a node is one contains edge removed and one added.
 * There is no parent_id to rewrite.
 */
export async function moveNode(
  userId: string, projectId: string, nodeId: string, newParentId: string | null,
): Promise<void> {
  await assertOwnsProject(userId, projectId)

  const graph = new Graph(await loadProjectGraph(userId, projectId))
  if (!graph.node(nodeId)) throw new ValidationError('Node is not in this project')

  if (newParentId !== null) {
    if (!graph.node(newParentId)) throw new ValidationError('Parent is not in this project')
    if (wouldCreateContainsCycle(graph, newParentId, nodeId)) {
      throw new ValidationError('A node cannot be placed inside itself or its own descendant')
    }
  }

  await db.transaction(async (tx) => {
    await tx.update(edges)
      .set({ deletedAt: new Date() })
      .where(and(
        eq(edges.targetNodeId, nodeId),
        eq(edges.type, 'contains'),
        isNull(edges.deletedAt),
      ))

    if (newParentId !== null) {
      await tx.insert(edges).values({
        projectId, sourceNodeId: newParentId, targetNodeId: nodeId, type: 'contains',
      })
    }
  })
}

/** Spec §46.8 — writing a position pins the node. */
export async function setPosition(
  userId: string, projectId: string, nodeId: string, x: number, y: number,
): Promise<void> {
  await assertOwnsProject(userId, projectId)
  const node = await liveNode(projectId, nodeId)
  if (!node) throw new ValidationError('Node is not in this project')

  await db.update(nodes)
    .set({ posX: x, posY: y, updatedAt: new Date() })
    .where(eq(nodes.id, nodeId))
}

/** Spec §46.8 — "tidy up" clears every pin and lets layout run unconstrained. */
export async function clearPositions(userId: string, projectId: string): Promise<void> {
  await assertOwnsProject(userId, projectId)
  await db.update(nodes)
    .set({ posX: null, posY: null, updatedAt: new Date() })
    .where(eq(nodes.projectId, projectId))
}

/**
 * Spec §46.9 — deletes the node and everything contained beneath it, plus
 * every edge touching any of them, including edges arriving from outside the
 * branch. One timestamp marks the batch so undo can restore exactly it.
 */
export async function deleteNode(
  userId: string, projectId: string, nodeId: string,
): Promise<{ deletedAt: Date; nodeCount: number }> {
  await assertOwnsProject(userId, projectId)

  const graph = new Graph(await loadProjectGraph(userId, projectId))
  if (!graph.node(nodeId)) throw new ValidationError('Node is not in this project')

  const ids = [nodeId, ...graph.descendantsOf(nodeId).map(n => n.id)]
  const deletedAt = new Date()

  await db.transaction(async (tx) => {
    await tx.update(nodes).set({ deletedAt }).where(inArray(nodes.id, ids))
    await tx.update(edges).set({ deletedAt })
      .where(and(isNull(edges.deletedAt), inArray(edges.sourceNodeId, ids)))
    await tx.update(edges).set({ deletedAt })
      .where(and(isNull(edges.deletedAt), inArray(edges.targetNodeId, ids)))
  })

  return { deletedAt, nodeCount: ids.length }
}

/**
 * Restores exactly one delete batch. Ids are preserved by soft delete, so
 * edges that pointed into the branch come back too.
 *
 * If the node was given a new parent in the meantime, restoring the old
 * contains edge violates the one-parent index and the transaction aborts,
 * restoring nothing. That is the correct outcome: undo is only offered for
 * the most recent delete.
 */
export async function undoDelete(
  userId: string, projectId: string, deletedAt: Date,
): Promise<void> {
  await assertOwnsProject(userId, projectId)

  await db.transaction(async (tx) => {
    await tx.update(nodes).set({ deletedAt: null })
      .where(and(eq(nodes.projectId, projectId), eq(nodes.deletedAt, deletedAt)))
    await tx.update(edges).set({ deletedAt: null })
      .where(and(eq(edges.projectId, projectId), eq(edges.deletedAt, deletedAt)))
  })
}

async function liveNode(projectId: string, nodeId: string) {
  const rows = await db.select().from(nodes)
    .where(and(
      eq(nodes.id, nodeId), eq(nodes.projectId, projectId), isNull(nodes.deletedAt),
    ))
    .limit(1)
  return rows[0] ?? null
}
```

- [ ] **Step 5: Run and watch it pass**

Run: `npm test tests/server/nodes.test.ts`
Expected: PASS — 16 tests. The `removes edges that pointed into the deleted branch` test imports `@/server/edges`, which Task 10 creates; expect that single test to fail until Task 10 is done. Complete Task 10 and re-run.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: add node create, update, move, position and cascading delete"
```

---

### Task 10: Edge mutations

Implements §46.2 (single parent, acyclic containment), §46.10 (four edge types), §46.11 (dependency cycles allowed).

**Files:**
- Create: `src/server/edges.ts`
- Test: `tests/server/edges.test.ts`

**Interfaces:**
- Consumes: `db`, schema, `assertOwnsProject`, `ValidationError`, `loadProjectGraph`, `Graph`, `wouldCreateContainsCycle`
- Produces:
  - `createEdge(userId, projectId, sourceId: string, targetId: string, type: EdgeType): Promise<string>` — returns the new edge id
  - `deleteEdge(userId, projectId, edgeId: string): Promise<void>`

- [ ] **Step 1: Write the failing tests**

Create `tests/server/edges.test.ts`:

```ts
import { describe, it, expect, beforeEach } from 'vitest'
import { createEdge, deleteEdge } from '@/server/edges'
import { createNode } from '@/server/nodes'
import { ValidationError } from '@/server/errors'
import { loadProjectGraph } from '@/server/graphLoad'
import { Graph } from '@/domain/graph'
import { findDependencyCycles } from '@/domain/cycles'
import { resetDb, makeProject, TEST_USER } from '../helpers/db'

const load = (projectId: string) =>
  loadProjectGraph(TEST_USER, projectId).then(g => new Graph(g))

describe('createEdge', () => {
  beforeEach(resetDb)

  it('creates a depends_on edge', async () => {
    const projectId = await makeProject()
    const a = await createNode(TEST_USER, projectId, { title: 'Verify', type: 'task' })
    const b = await createNode(TEST_USER, projectId, { title: 'Send', type: 'task' })

    await createEdge(TEST_USER, projectId, a, b, 'depends_on')

    expect((await load(projectId)).dependenciesOf(a).map(n => n.id)).toEqual([b])
  })

  it('permits a dependency cycle, per §46.11', async () => {
    const projectId = await makeProject()
    const a = await createNode(TEST_USER, projectId, { title: 'A', type: 'task' })
    const b = await createNode(TEST_USER, projectId, { title: 'B', type: 'task' })

    await createEdge(TEST_USER, projectId, a, b, 'depends_on')
    await createEdge(TEST_USER, projectId, b, a, 'depends_on')

    expect(findDependencyCycles(await load(projectId))).toEqual([[a, b].sort()])
  })

  it('refuses a second contains parent', async () => {
    const projectId = await makeProject()
    const a = await createNode(TEST_USER, projectId, { title: 'A', type: 'system' })
    const b = await createNode(TEST_USER, projectId, { title: 'B', type: 'system' })
    const c = await createNode(TEST_USER, projectId, { title: 'C', type: 'task', parentId: a })

    await expect(
      createEdge(TEST_USER, projectId, b, c, 'contains'),
    ).rejects.toThrow(ValidationError)
  })

  it('refuses a containment cycle', async () => {
    const projectId = await makeProject()
    const a = await createNode(TEST_USER, projectId, { title: 'A', type: 'system' })
    const b = await createNode(TEST_USER, projectId, { title: 'B', type: 'system', parentId: a })

    await expect(
      createEdge(TEST_USER, projectId, b, a, 'contains'),
    ).rejects.toThrow(ValidationError)
  })

  it('refuses a self edge', async () => {
    const projectId = await makeProject()
    const a = await createNode(TEST_USER, projectId, { title: 'A', type: 'task' })

    await expect(
      createEdge(TEST_USER, projectId, a, a, 'depends_on'),
    ).rejects.toThrow(ValidationError)
  })

  it('refuses a duplicate of the same type', async () => {
    const projectId = await makeProject()
    const a = await createNode(TEST_USER, projectId, { title: 'A', type: 'task' })
    const b = await createNode(TEST_USER, projectId, { title: 'B', type: 'task' })

    await createEdge(TEST_USER, projectId, a, b, 'depends_on')
    await expect(
      createEdge(TEST_USER, projectId, a, b, 'depends_on'),
    ).rejects.toThrow(ValidationError)
  })

  it('refuses an endpoint from another project', async () => {
    const mine = await makeProject('Mine')
    const theirs = await makeProject('Theirs')
    const a = await createNode(TEST_USER, mine, { title: 'A', type: 'task' })
    const foreign = await createNode(TEST_USER, theirs, { title: 'B', type: 'task' })

    await expect(
      createEdge(TEST_USER, mine, a, foreign, 'depends_on'),
    ).rejects.toThrow(ValidationError)
  })
})

describe('deleteEdge', () => {
  beforeEach(resetDb)

  it('removes the edge and leaves both nodes', async () => {
    const projectId = await makeProject()
    const a = await createNode(TEST_USER, projectId, { title: 'A', type: 'task' })
    const b = await createNode(TEST_USER, projectId, { title: 'B', type: 'task' })
    const edgeId = await createEdge(TEST_USER, projectId, a, b, 'depends_on')

    await deleteEdge(TEST_USER, projectId, edgeId)

    const g = await load(projectId)
    expect(g.all()).toHaveLength(2)
    expect(g.dependenciesOf(a)).toEqual([])
  })

  it('makes a node a root when its contains edge is removed', async () => {
    const projectId = await makeProject()
    const a = await createNode(TEST_USER, projectId, { title: 'A', type: 'system' })
    const b = await createNode(TEST_USER, projectId, { title: 'B', type: 'task', parentId: a })

    const projectGraph = await loadProjectGraph(TEST_USER, projectId)
    const containsEdge = projectGraph.edges.find(e => e.type === 'contains')!

    await deleteEdge(TEST_USER, projectId, containsEdge.id)

    expect((await load(projectId)).parentOf(b)).toBeNull()
  })
})
```

- [ ] **Step 2: Run and watch it fail**

Run: `npm test tests/server/edges.test.ts`
Expected: FAIL — `Cannot find module '@/server/edges'`

- [ ] **Step 3: Write the implementation**

Create `src/server/edges.ts`:

```ts
import { and, eq, isNull } from 'drizzle-orm'
import { db } from '@/db/client'
import { edges } from '@/db/schema'
import { assertOwnsProject } from './auth'
import { ValidationError } from './errors'
import { loadProjectGraph } from './graphLoad'
import { Graph } from '@/domain/graph'
import { wouldCreateContainsCycle } from '@/domain/cycles'
import type { EdgeType } from '@/domain/types'

/**
 * Spec §46.10 — four edge types, all created the same way. Moving a node,
 * adding a dependency and recording that a decision implements a requirement
 * are the same operation on the same table.
 *
 * Spec §46.11 — a depends_on cycle is permitted and is surfaced by the
 * interface rather than rejected here.
 */
export async function createEdge(
  userId: string, projectId: string,
  sourceId: string, targetId: string, type: EdgeType,
): Promise<string> {
  await assertOwnsProject(userId, projectId)

  const projectGraph = await loadProjectGraph(userId, projectId)
  const graph = new Graph(projectGraph)

  if (!graph.node(sourceId)) throw new ValidationError('Source is not a node in this project')
  if (!graph.node(targetId)) throw new ValidationError('Target is not a node in this project')
  if (sourceId === targetId) throw new ValidationError('A node cannot be linked to itself')

  const duplicate = projectGraph.edges.some(
    e => e.source === sourceId && e.target === targetId && e.type === type,
  )
  if (duplicate) throw new ValidationError('That relationship already exists')

  if (type === 'contains') {
    if (wouldCreateContainsCycle(graph, sourceId, targetId)) {
      throw new ValidationError('A node cannot contain itself or one of its own ancestors')
    }
    if (graph.parentOf(targetId) !== null) {
      throw new ValidationError(
        'That node already has a parent. Move it instead of adding a second one.',
      )
    }
  }

  const [created] = await db.insert(edges).values({
    projectId, sourceNodeId: sourceId, targetNodeId: targetId, type,
  }).returning()

  return created!.id
}

export async function deleteEdge(
  userId: string, projectId: string, edgeId: string,
): Promise<void> {
  await assertOwnsProject(userId, projectId)

  const updated = await db.update(edges)
    .set({ deletedAt: new Date() })
    .where(and(
      eq(edges.id, edgeId), eq(edges.projectId, projectId), isNull(edges.deletedAt),
    ))
    .returning({ id: edges.id })

  if (updated.length === 0) throw new ValidationError('Edge is not in this project')
}
```

- [ ] **Step 4: Run and watch it pass**

Run: `npm test tests/server/edges.test.ts tests/server/nodes.test.ts`
Expected: PASS — 9 edge tests, and all 16 node tests now that `@/server/edges` exists

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add edge creation with containment and duplicate guards"
```

---

### Task 11: Tags

Implements §46.7.

**Files:**
- Create: `src/server/tags.ts`
- Test: `tests/server/tags.test.ts`

**Interfaces:**
- Consumes: `db`, schema, `assertOwnsProject`, `ValidationError`, `loadProjectGraph`, `Graph`
- Produces:
  - `createTag(userId, projectId, name: string, color: string): Promise<string>` — appends at the lowest priority
  - `deleteTag(userId, projectId, tagId): Promise<void>`
  - `reorderTags(userId, projectId, orderedTagIds: string[]): Promise<void>` — index in the array becomes `priority`
  - `tagNode(userId, projectId, nodeId, tagId): Promise<void>`
  - `untagNode(userId, projectId, nodeId, tagId): Promise<void>`
  - `tagBranch(userId, projectId, nodeId, tagId): Promise<number>` — tags the node and every descendant, returns how many were tagged

- [ ] **Step 1: Write the failing tests**

Create `tests/server/tags.test.ts`:

```ts
import { describe, it, expect, beforeEach } from 'vitest'
import {
  createTag, deleteTag, reorderTags, tagNode, untagNode, tagBranch,
} from '@/server/tags'
import { createNode } from '@/server/nodes'
import { ValidationError } from '@/server/errors'
import { loadProjectGraph } from '@/server/graphLoad'
import { resetDb, makeProject, TEST_USER } from '../helpers/db'

describe('tags', () => {
  beforeEach(resetDb)

  it('appends a new tag at the lowest priority', async () => {
    const projectId = await makeProject()
    await createTag(TEST_USER, projectId, 'MVP', '#f00')
    await createTag(TEST_USER, projectId, 'Mobile', '#00f')

    const { tags } = await loadProjectGraph(TEST_USER, projectId)
    expect(tags.map(t => [t.name, t.priority])).toEqual([['MVP', 0], ['Mobile', 1]])
  })

  it('refuses a duplicate tag name in the same project', async () => {
    const projectId = await makeProject()
    await createTag(TEST_USER, projectId, 'MVP', '#f00')

    await expect(createTag(TEST_USER, projectId, 'MVP', '#0f0')).rejects.toThrow(ValidationError)
  })

  it('reorders priorities to match the given order', async () => {
    const projectId = await makeProject()
    const mvp = await createTag(TEST_USER, projectId, 'MVP', '#f00')
    const mobile = await createTag(TEST_USER, projectId, 'Mobile', '#00f')

    await reorderTags(TEST_USER, projectId, [mobile, mvp])

    const { tags } = await loadProjectGraph(TEST_USER, projectId)
    expect(tags.map(t => t.name)).toEqual(['Mobile', 'MVP'])
  })

  it('attaches and detaches a tag on one node', async () => {
    const projectId = await makeProject()
    const tag = await createTag(TEST_USER, projectId, 'MVP', '#f00')
    const node = await createNode(TEST_USER, projectId, { title: 'A', type: 'task' })

    await tagNode(TEST_USER, projectId, node, tag)
    let graph = await loadProjectGraph(TEST_USER, projectId)
    expect(graph.nodes[0]!.tagIds).toEqual([tag])

    await untagNode(TEST_USER, projectId, node, tag)
    graph = await loadProjectGraph(TEST_USER, projectId)
    expect(graph.nodes[0]!.tagIds).toEqual([])
  })

  it('is idempotent when tagging twice', async () => {
    const projectId = await makeProject()
    const tag = await createTag(TEST_USER, projectId, 'MVP', '#f00')
    const node = await createNode(TEST_USER, projectId, { title: 'A', type: 'task' })

    await tagNode(TEST_USER, projectId, node, tag)
    await tagNode(TEST_USER, projectId, node, tag)

    const graph = await loadProjectGraph(TEST_USER, projectId)
    expect(graph.nodes[0]!.tagIds).toEqual([tag])
  })

  it('tags a whole branch explicitly, writing a row per node', async () => {
    const projectId = await makeProject()
    const tag = await createTag(TEST_USER, projectId, 'MVP', '#f00')
    const auth = await createNode(TEST_USER, projectId, { title: 'Auth', type: 'system' })
    const phone = await createNode(TEST_USER, projectId, { title: 'Phone', type: 'system', parentId: auth })
    const other = await createNode(TEST_USER, projectId, { title: 'Booking', type: 'system' })

    const count = await tagBranch(TEST_USER, projectId, auth, tag)
    expect(count).toBe(2)

    const graph = await loadProjectGraph(TEST_USER, projectId)
    const tagsOf = (id: string) => graph.nodes.find(n => n.id === id)!.tagIds
    expect(tagsOf(auth)).toEqual([tag])
    expect(tagsOf(phone)).toEqual([tag])
    expect(tagsOf(other)).toEqual([])
  })

  it('does not tag nodes added to the branch afterwards', async () => {
    const projectId = await makeProject()
    const tag = await createTag(TEST_USER, projectId, 'MVP', '#f00')
    const auth = await createNode(TEST_USER, projectId, { title: 'Auth', type: 'system' })
    await tagBranch(TEST_USER, projectId, auth, tag)

    const late = await createNode(TEST_USER, projectId, { title: 'Late', type: 'task', parentId: auth })

    const graph = await loadProjectGraph(TEST_USER, projectId)
    expect(graph.nodes.find(n => n.id === late)!.tagIds).toEqual([])
  })

  it('removes the tag from every node when the tag is deleted', async () => {
    const projectId = await makeProject()
    const tag = await createTag(TEST_USER, projectId, 'MVP', '#f00')
    const node = await createNode(TEST_USER, projectId, { title: 'A', type: 'task' })
    await tagNode(TEST_USER, projectId, node, tag)

    await deleteTag(TEST_USER, projectId, tag)

    const graph = await loadProjectGraph(TEST_USER, projectId)
    expect(graph.tags).toEqual([])
    expect(graph.nodes[0]!.tagIds).toEqual([])
  })
})
```

- [ ] **Step 2: Run and watch it fail**

Run: `npm test tests/server/tags.test.ts`
Expected: FAIL — `Cannot find module '@/server/tags'`

- [ ] **Step 3: Write the implementation**

Create `src/server/tags.ts`:

```ts
import { and, eq, sql } from 'drizzle-orm'
import { db } from '@/db/client'
import { nodeTags, tags } from '@/db/schema'
import { assertOwnsProject } from './auth'
import { ValidationError } from './errors'
import { loadProjectGraph } from './graphLoad'
import { Graph } from '@/domain/graph'

/** Spec §46.7 — a tag carries a colour and a priority, so it is a row. */
export async function createTag(
  userId: string, projectId: string, name: string, color: string,
): Promise<string> {
  await assertOwnsProject(userId, projectId)
  if (name.trim() === '') throw new ValidationError('Tag name cannot be empty')

  const existing = await db.select({ priority: tags.priority })
    .from(tags).where(eq(tags.projectId, projectId))

  if (await nameTaken(projectId, name.trim())) {
    throw new ValidationError(`A tag called "${name.trim()}" already exists`)
  }

  const nextPriority = existing.length === 0
    ? 0
    : Math.max(...existing.map(t => t.priority)) + 1

  const [created] = await db.insert(tags)
    .values({ projectId, name: name.trim(), color, priority: nextPriority })
    .returning()

  return created!.id
}

export async function deleteTag(
  userId: string, projectId: string, tagId: string,
): Promise<void> {
  await assertOwnsProject(userId, projectId)
  // node_tags cascades on the foreign key, so attachments go with it.
  const deleted = await db.delete(tags)
    .where(and(eq(tags.id, tagId), eq(tags.projectId, projectId)))
    .returning({ id: tags.id })

  if (deleted.length === 0) throw new ValidationError('Tag is not in this project')
}

/**
 * Spec §46.7 — priority is a per-project ordered list. Position in the array
 * becomes the priority, so the caller just sends the order it wants.
 */
export async function reorderTags(
  userId: string, projectId: string, orderedTagIds: string[],
): Promise<void> {
  await assertOwnsProject(userId, projectId)

  const owned = await db.select({ id: tags.id }).from(tags).where(eq(tags.projectId, projectId))
  const ownedIds = new Set(owned.map(t => t.id))

  if (orderedTagIds.length !== ownedIds.size
      || orderedTagIds.some(id => !ownedIds.has(id))) {
    throw new ValidationError('The order must list every tag in this project exactly once')
  }

  await db.transaction(async (tx) => {
    // Shift out of the way first: priority is not unique, but keeping the
    // update in two passes avoids transient duplicates being observed.
    await tx.update(tags)
      .set({ priority: sql`${tags.priority} + 1000` })
      .where(eq(tags.projectId, projectId))

    for (const [index, tagId] of orderedTagIds.entries()) {
      await tx.update(tags).set({ priority: index }).where(eq(tags.id, tagId))
    }
  })
}

export async function tagNode(
  userId: string, projectId: string, nodeId: string, tagId: string,
): Promise<void> {
  await assertOwnsProject(userId, projectId)
  await assertBelongs(userId, projectId, nodeId, tagId)

  await db.insert(nodeTags).values({ nodeId, tagId }).onConflictDoNothing()
}

export async function untagNode(
  userId: string, projectId: string, nodeId: string, tagId: string,
): Promise<void> {
  await assertOwnsProject(userId, projectId)
  await db.delete(nodeTags)
    .where(and(eq(nodeTags.nodeId, nodeId), eq(nodeTags.tagId, tagId)))
}

/**
 * Spec §46.7 — there is no inheritance. This writes a real row for the node
 * and each of its current descendants, so what the panel shows is exactly
 * what is stored, and nodes added later are untagged.
 */
export async function tagBranch(
  userId: string, projectId: string, nodeId: string, tagId: string,
): Promise<number> {
  await assertOwnsProject(userId, projectId)
  await assertBelongs(userId, projectId, nodeId, tagId)

  const graph = new Graph(await loadProjectGraph(userId, projectId))
  const ids = [nodeId, ...graph.descendantsOf(nodeId).map(n => n.id)]

  await db.insert(nodeTags)
    .values(ids.map(id => ({ nodeId: id, tagId })))
    .onConflictDoNothing()

  return ids.length
}

async function nameTaken(projectId: string, name: string): Promise<boolean> {
  const rows = await db.select({ id: tags.id }).from(tags)
    .where(and(eq(tags.projectId, projectId), eq(tags.name, name)))
    .limit(1)
  return rows.length > 0
}

async function assertBelongs(
  userId: string, projectId: string, nodeId: string, tagId: string,
): Promise<void> {
  const graph = await loadProjectGraph(userId, projectId)
  if (!graph.nodes.some(n => n.id === nodeId)) {
    throw new ValidationError('Node is not in this project')
  }
  if (!graph.tags.some(t => t.id === tagId)) {
    throw new ValidationError('Tag is not in this project')
  }
}
```

- [ ] **Step 4: Run and watch it pass**

Run: `npm test tests/server/tags.test.ts`
Expected: PASS — 8 tests

- [ ] **Step 5: Run the whole suite**

Run: `npm test`
Expected: PASS — every domain and server test. Part A is complete.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: add project tags with priority ordering and branch tagging"
```

---

# Part B — Application

Part B puts an interface on the tested core. Anything with real logic is extracted into a pure function and unit tested; components stay thin and are covered by Playwright.

---

### Task 12: Authentication and the project dashboard

Implements FR-001, FR-003, FR-004.

**Files:**
- Create: `src/lib/supabase/server.ts`, `src/server/projects.ts`
- Modify: `src/server/auth.ts` — add `requireUser`
- Create: `src/app/login/page.tsx`, `src/app/dashboard/page.tsx`, `src/app/dashboard/actions.ts`
- Create: `playwright.config.ts`, `tests/e2e/helpers/user.ts`
- Test: `tests/server/projects.test.ts`, `tests/e2e/dashboard.spec.ts`

**Interfaces:**
- Consumes: `db`, `projects` table, `ForbiddenError`
- Produces:
  - `requireUser(): Promise<string>` from `@/server/auth` — the session user id, throws `ForbiddenError` when signed out
  - `listProjects(userId): Promise<{ id: string; name: string; createdAt: Date }[]>`
  - `createProject(userId, name: string, description?: string): Promise<string>`
  - `deleteProject(userId, projectId): Promise<void>`

- [ ] **Step 1: Write the failing server tests**

Create `tests/server/projects.test.ts`:

```ts
import { describe, it, expect, beforeEach } from 'vitest'
import { listProjects, createProject, deleteProject } from '@/server/projects'
import { createNode } from '@/server/nodes'
import { ValidationError } from '@/server/errors'
import { ForbiddenError } from '@/server/auth'
import { db } from '@/db/client'
import { nodes } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { resetDb, TEST_USER } from '../helpers/db'

const OTHER_USER = '00000000-0000-0000-0000-000000000002'

describe('projects', () => {
  beforeEach(resetDb)

  it('creates and lists a project', async () => {
    const id = await createProject(TEST_USER, 'Booked')
    const list = await listProjects(TEST_USER)
    expect(list.map(p => p.id)).toEqual([id])
    expect(list[0]!.name).toBe('Booked')
  })

  it('lists newest first', async () => {
    await createProject(TEST_USER, 'First')
    const second = await createProject(TEST_USER, 'Second')
    expect((await listProjects(TEST_USER))[0]!.id).toBe(second)
  })

  it('does not list another user projects', async () => {
    await createProject(OTHER_USER, 'Theirs')
    expect(await listProjects(TEST_USER)).toEqual([])
  })

  it('refuses an empty name', async () => {
    await expect(createProject(TEST_USER, '   ')).rejects.toThrow(ValidationError)
  })

  it('hard deletes a project and its nodes', async () => {
    const id = await createProject(TEST_USER, 'Booked')
    const nodeId = await createNode(TEST_USER, id, { title: 'A', type: 'system' })

    await deleteProject(TEST_USER, id)

    expect(await listProjects(TEST_USER)).toEqual([])
    expect(await db.select().from(nodes).where(eq(nodes.id, nodeId))).toEqual([])
  })

  it('refuses to delete another user project', async () => {
    const id = await createProject(OTHER_USER, 'Theirs')
    await expect(deleteProject(TEST_USER, id)).rejects.toThrow(ForbiddenError)
  })
})
```

- [ ] **Step 2: Run and watch it fail**

Run: `npm test tests/server/projects.test.ts`
Expected: FAIL — `Cannot find module '@/server/projects'`

- [ ] **Step 3: Write the project functions**

Create `src/server/projects.ts`:

```ts
import { and, desc, eq } from 'drizzle-orm'
import { db } from '@/db/client'
import { projects } from '@/db/schema'
import { assertOwnsProject } from './auth'
import { ValidationError } from './errors'

export async function listProjects(userId: string) {
  return db.select({ id: projects.id, name: projects.name, createdAt: projects.createdAt })
    .from(projects)
    .where(eq(projects.ownerId, userId))
    .orderBy(desc(projects.createdAt))
}

export async function createProject(
  userId: string, name: string, description?: string,
): Promise<string> {
  if (name.trim() === '') throw new ValidationError('Project name cannot be empty')

  const [created] = await db.insert(projects)
    .values({ ownerId: userId, name: name.trim(), description: description ?? null })
    .returning()

  return created!.id
}

/**
 * Projects are hard deleted. Nodes, edges and tags cascade on their foreign
 * keys. Soft delete (§46.9) is for nodes within a project, where undo is
 * offered; deleting a whole project is a deliberate, confirmed action.
 */
export async function deleteProject(userId: string, projectId: string): Promise<void> {
  await assertOwnsProject(userId, projectId)
  await db.delete(projects)
    .where(and(eq(projects.id, projectId), eq(projects.ownerId, userId)))
}
```

- [ ] **Step 4: Add the session helper**

Create `src/lib/supabase/server.ts`:

```ts
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function supabaseServer() {
  const store = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => store.getAll(),
        setAll: (list) => {
          for (const { name, value, options } of list) store.set(name, value, options)
        },
      },
    },
  )
}
```

Append to `src/server/auth.ts`:

```ts
import { supabaseServer } from '@/lib/supabase/server'

/** The signed-in user id. Every server action starts here. */
export async function requireUser(): Promise<string> {
  const supabase = await supabaseServer()
  const { data } = await supabase.auth.getUser()
  if (!data.user) throw new ForbiddenError('Not signed in')
  return data.user.id
}
```

Add to `.env.local` and `.env.local.example` the two keys printed by `supabase start`:

```text
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon key from supabase start>
SUPABASE_SERVICE_ROLE_KEY=<service_role key from supabase start>
```

Create `src/middleware.ts`. Without it the session cookie is never refreshed,
and server components start seeing a signed-out user after the first token
expiry:

```ts
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  const response = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (list) => {
          for (const { name, value, options } of list) {
            response.cookies.set(name, value, options)
          }
        },
      },
    },
  )

  await supabase.auth.getUser()
  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
```

- [ ] **Step 5: Run the server tests and watch them pass**

Run: `npm test tests/server/projects.test.ts`
Expected: PASS — 6 tests

- [ ] **Step 6: Build the login and dashboard pages**

Create `src/app/login/page.tsx`:

```tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )

  // Password auth rather than magic links: no email infrastructure, and it
  // can be driven end to end by a test.
  async function submit(e: React.FormEvent, mode: 'in' | 'up') {
    e.preventDefault()
    setError(null)
    const { error } = mode === 'in'
      ? await supabase.auth.signInWithPassword({ email, password })
      : await supabase.auth.signUp({ email, password })

    if (error) { setError(error.message); return }
    router.push('/dashboard')
    router.refresh()
  }

  return (
    <main className="mx-auto mt-32 max-w-sm px-6">
      <h1 className="mb-6 text-2xl font-semibold">Project Graph</h1>
      <form onSubmit={e => submit(e, 'in')} className="space-y-3">
        <input
          type="email" required value={email} placeholder="you@example.com"
          onChange={e => setEmail(e.target.value)}
          className="w-full rounded border px-3 py-2" data-testid="email"
        />
        <input
          type="password" required value={password} placeholder="Password"
          onChange={e => setPassword(e.target.value)}
          className="w-full rounded border px-3 py-2" data-testid="password"
        />
        <button className="w-full rounded bg-black px-3 py-2 text-white" data-testid="signin">
          Sign in
        </button>
        <button
          type="button" onClick={e => submit(e, 'up')}
          className="w-full rounded border px-3 py-2" data-testid="signup"
        >
          Create an account
        </button>
        {error && <p className="text-sm text-red-600" data-testid="auth-error">{error}</p>}
      </form>
    </main>
  )
}
```

Create `src/app/dashboard/actions.ts`:

```ts
'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { requireUser } from '@/server/auth'
import { createProject, deleteProject } from '@/server/projects'

export async function createProjectAction(formData: FormData) {
  const userId = await requireUser()
  const id = await createProject(userId, String(formData.get('name') ?? ''))
  redirect(`/project/${id}`)
}

export async function deleteProjectAction(formData: FormData) {
  const userId = await requireUser()
  await deleteProject(userId, String(formData.get('projectId')))
  revalidatePath('/dashboard')
}
```

Create `src/app/dashboard/page.tsx`:

```tsx
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { requireUser } from '@/server/auth'
import { listProjects } from '@/server/projects'
import { createProjectAction, deleteProjectAction } from './actions'

export default async function DashboardPage() {
  let userId: string
  try {
    userId = await requireUser()
  } catch {
    redirect('/login')
  }

  const projects = await listProjects(userId)

  return (
    <main className="mx-auto max-w-2xl px-6 py-16">
      <h1 className="mb-8 text-2xl font-semibold">Your projects</h1>

      <form action={createProjectAction} className="mb-10 flex gap-2">
        <input
          name="name" required placeholder="What are you building?"
          className="flex-1 rounded border px-3 py-2" data-testid="project-name"
        />
        <button className="rounded bg-black px-4 py-2 text-white" data-testid="create-project">
          Create
        </button>
      </form>

      <ul className="space-y-2" data-testid="project-list">
        {projects.map(p => (
          <li key={p.id} className="flex items-center justify-between rounded border px-4 py-3">
            <Link href={`/project/${p.id}`} className="font-medium hover:underline">
              {p.name}
            </Link>
            <form action={deleteProjectAction}>
              <input type="hidden" name="projectId" value={p.id} />
              <button className="text-sm text-red-600">Delete</button>
            </form>
          </li>
        ))}
      </ul>

      {projects.length === 0 && (
        <p className="text-neutral-500">No projects yet. Describe one above to start.</p>
      )}
    </main>
  )
}
```

- [ ] **Step 7: Set up Playwright with a seeded user**

```bash
npm install -D @playwright/test
npx playwright install chromium
```

Create `tests/e2e/helpers/user.ts`:

```ts
import { createClient } from '@supabase/supabase-js'
import type { Page } from '@playwright/test'

export const E2E_EMAIL = 'e2e@example.com'
export const E2E_PASSWORD = 'e2e-password-1234'

const admin = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } },
)

/** Creates the test user if absent. Safe to call before every spec. */
export async function ensureUser(): Promise<void> {
  await admin().auth.admin.createUser({
    email: E2E_EMAIL, password: E2E_PASSWORD, email_confirm: true,
  })
}

/** Signs in through the real form, so the session cookie is set the real way. */
export async function signIn(page: Page): Promise<void> {
  await page.goto('/login')
  await page.getByTestId('email').fill(E2E_EMAIL)
  await page.getByTestId('password').fill(E2E_PASSWORD)
  await page.getByTestId('signin').click()
  await page.waitForURL('**/dashboard')
}
```

Create `playwright.config.ts`:

```ts
import { defineConfig } from '@playwright/test'
import 'dotenv/config'

export default defineConfig({
  testDir: './tests/e2e',
  use: { baseURL: 'http://localhost:3000' },
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: true,
  },
})
```

Add to `package.json` scripts:

```json
"test:e2e": "dotenv -e .env.local -- playwright test"
```

- [ ] **Step 8: Write the dashboard end-to-end test**

Create `tests/e2e/dashboard.spec.ts`:

```ts
import { test, expect } from '@playwright/test'
import { ensureUser, signIn } from './helpers/user'

test.beforeAll(ensureUser)

test('creates a project and opens it', async ({ page }) => {
  await signIn(page)
  await page.goto('/dashboard')

  await page.getByTestId('project-name').fill('Booked')
  await page.getByTestId('create-project').click()

  await expect(page).toHaveURL(/\/project\/[0-9a-f-]+$/)
})

test('redirects a signed-out visitor to login', async ({ page }) => {
  await page.goto('/dashboard')
  await expect(page).toHaveURL(/\/login$/)
})
```

- [ ] **Step 9: Run the end-to-end tests**

Run: `npm run test:e2e`
Expected: the second test passes. The first fails on `/project/[id]` until Task 13 creates that route — mark it `test.fixme` and remove the marker in Task 14.

- [ ] **Step 10: Commit**

```bash
git add -A
git commit -m "feat: add Supabase auth, project dashboard and Playwright harness"
```

---

### Task 13: Canvas rendering

Implements FR-020, FR-022, and the visual side of §46.4, §46.7, §46.11.

**Files:**
- Create: `src/components/canvas/toFlow.ts`, `src/components/canvas/NodeCard.tsx`, `src/components/canvas/Canvas.tsx`
- Test: `tests/components/toFlow.test.ts`

**Interfaces:**
- Consumes: `Graph`, `computeLayout`, `NODE_WIDTH`, `NODE_HEIGHT`, `effectiveStatus`, `progressOf`, `nodesInCycles`
- Produces:
  - `interface FlowNodeData { title: string; type: NodeType; status: NodeStatus; percent: number | null; tagColor: string | null; inCycle: boolean; dimmed: boolean }`
  - `toFlow(graph: Graph, options?: { activeTagId?: string | null }): { nodes: RFNode<FlowNodeData>[]; edges: RFEdge[] }`
  - `<NodeCard />` — a React Flow custom node
  - `<Canvas graph={ProjectGraph} activeTagId={string|null} selectedId={string|null} onSelect onMoveEnd />`

- [ ] **Step 1: Write the failing tests**

All the interesting logic lives in `toFlow`, which is pure, so it is unit tested rather than rendered.

Create `tests/components/toFlow.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { Graph } from '@/domain/graph'
import { toFlow } from '@/components/canvas/toFlow'
import { buildGraph } from '../helpers/graph'

describe('toFlow', () => {
  it('emits one flow node per graph node, positioned', () => {
    const g = new Graph(buildGraph({
      nodes: [{ id: 'a', type: 'goal' }, { id: 'b', type: 'system' }],
      edges: [['a', 'b', 'contains']],
    }))
    const flow = toFlow(g)
    expect(flow.nodes).toHaveLength(2)
    expect(flow.nodes[0]!.position).toBeDefined()
  })

  it('carries the rolled-up percentage for a parent and null for a leaf', () => {
    const g = new Graph(buildGraph({
      nodes: [
        { id: 'auth', type: 'system' },
        { id: 'send', type: 'task', status: 'done' },
        { id: 'verify', type: 'task', status: 'not_started' },
      ],
      edges: [['auth', 'send', 'contains'], ['auth', 'verify', 'contains']],
    }))
    const flow = toFlow(g)
    const byId = (id: string) => flow.nodes.find(n => n.id === id)!.data

    expect(byId('auth').percent).toBe(50)
    expect(byId('send').percent).toBeNull()
  })

  it('reports the effective status, so a full parent reads as done', () => {
    const g = new Graph(buildGraph({
      nodes: [
        { id: 'auth', type: 'system', status: 'blocked' },
        { id: 'send', type: 'task', status: 'done' },
      ],
      edges: [['auth', 'send', 'contains']],
    }))
    expect(toFlow(g).nodes.find(n => n.id === 'auth')!.data.status).toBe('done')
  })

  it('colours a node by its highest-priority tag', () => {
    const g = new Graph(buildGraph({
      tags: [
        { id: 'mvp', name: 'MVP', color: '#ff0000', priority: 0 },
        { id: 'mob', name: 'Mobile', color: '#0000ff', priority: 1 },
      ],
      nodes: [{ id: 'a', type: 'task', tagIds: ['mob', 'mvp'] }],
    }))
    expect(toFlow(g).nodes[0]!.data.tagColor).toBe('#ff0000')
  })

  it('leaves an untagged node without a colour', () => {
    const g = new Graph(buildGraph({ nodes: [{ id: 'a', type: 'task' }] }))
    expect(toFlow(g).nodes[0]!.data.tagColor).toBeNull()
  })

  it('dims nodes without the active tag when filtering', () => {
    const g = new Graph(buildGraph({
      tags: [{ id: 'mvp', name: 'MVP', color: '#f00', priority: 0 }],
      nodes: [
        { id: 'a', type: 'task', tagIds: ['mvp'] },
        { id: 'b', type: 'task' },
      ],
    }))
    const flow = toFlow(g, { activeTagId: 'mvp' })
    expect(flow.nodes.find(n => n.id === 'a')!.data.dimmed).toBe(false)
    expect(flow.nodes.find(n => n.id === 'b')!.data.dimmed).toBe(true)
  })

  it('dims nothing when no tag is active', () => {
    const g = new Graph(buildGraph({ nodes: [{ id: 'a', type: 'task' }] }))
    expect(toFlow(g).nodes[0]!.data.dimmed).toBe(false)
  })

  it('flags nodes caught in a dependency cycle', () => {
    const g = new Graph(buildGraph({
      nodes: [{ id: 'a', type: 'task' }, { id: 'b', type: 'task' }, { id: 'c', type: 'task' }],
      edges: [['a', 'b', 'depends_on'], ['b', 'a', 'depends_on']],
    }))
    const flow = toFlow(g)
    expect(flow.nodes.find(n => n.id === 'a')!.data.inCycle).toBe(true)
    expect(flow.nodes.find(n => n.id === 'c')!.data.inCycle).toBe(false)
  })

  it('renders contains edges solid and depends_on dashed', () => {
    const g = new Graph(buildGraph({
      nodes: [{ id: 'a', type: 'system' }, { id: 'b', type: 'task' }],
      edges: [['a', 'b', 'contains'], ['b', 'a', 'depends_on']],
    }))
    const flow = toFlow(g)
    const contains = flow.edges.find(e => e.id.startsWith('e0'))!
    const depends = flow.edges.find(e => e.id.startsWith('e1'))!
    expect(contains.animated).toBe(false)
    expect(depends.style?.strokeDasharray).toBe('6 4')
  })
})
```

- [ ] **Step 2: Run and watch it fail**

Run: `npm test tests/components/toFlow.test.ts`
Expected: FAIL — `Cannot find module '@/components/canvas/toFlow'`

- [ ] **Step 3: Write the mapping**

Create `src/components/canvas/toFlow.ts`:

```ts
import type { Edge as RFEdge, Node as RFNode } from 'reactflow'
import type { Graph } from '@/domain/graph'
import { computeLayout } from '@/domain/layout'
import { effectiveStatus, progressOf } from '@/domain/progress'
import { nodesInCycles } from '@/domain/cycles'
import type { GraphNode, NodeStatus, NodeType } from '@/domain/types'

export interface FlowNodeData {
  title: string
  type: NodeType
  status: NodeStatus
  /** Null for a leaf, which shows a status instead (spec §46.4). */
  percent: number | null
  /** Colour of the highest-priority tag on this node (spec §46.7). */
  tagColor: string | null
  inCycle: boolean
  dimmed: boolean
}

export interface ToFlowOptions {
  activeTagId?: string | null
}

export function toFlow(
  graph: Graph, options: ToFlowOptions = {},
): { nodes: RFNode<FlowNodeData>[]; edges: RFEdge[] } {
  const layout = computeLayout(graph)
  const cyclic = nodesInCycles(graph)
  const activeTagId = options.activeTagId ?? null

  const nodes: RFNode<FlowNodeData>[] = graph.all().map(node => ({
    id: node.id,
    type: 'card',
    position: layout.get(node.id) ?? { x: 0, y: 0 },
    data: {
      title: node.title,
      type: node.type,
      status: effectiveStatus(graph, node.id),
      percent: progressOf(graph, node.id)?.percent ?? null,
      tagColor: winningTagColor(graph, node),
      inCycle: cyclic.has(node.id),
      dimmed: activeTagId !== null && !node.tagIds.includes(activeTagId),
    },
  }))

  const edges: RFEdge[] = graph.allEdges().map(edge => ({
    id: edge.id,
    source: edge.source,
    target: edge.target,
    animated: false,
    style: edge.type === 'contains'
      ? { stroke: '#9ca3af' }
      : { stroke: '#6366f1', strokeDasharray: '6 4' },
  }))

  return { nodes, edges }
}

/** Spec §46.7 — lowest priority number wins. */
function winningTagColor(graph: Graph, node: GraphNode): string | null {
  const owned = graph.tags.filter(t => node.tagIds.includes(t.id))
  if (owned.length === 0) return null
  return owned.reduce((best, t) => (t.priority < best.priority ? t : best)).color
}
```

- [ ] **Step 4: Expose the raw edge list on Graph**

`toFlow` needs every edge, which `Graph` does not yet expose. Add to `src/domain/graph.ts`, beside `all()`:

```ts
  allEdges(): GraphEdge[] {
    return this.graph.edges
  }
```

- [ ] **Step 5: Run and watch it pass**

Run: `npm test tests/components/toFlow.test.ts`
Expected: PASS — 9 tests

- [ ] **Step 6: Write the node card**

Create `src/components/canvas/NodeCard.tsx`:

```tsx
'use client'

import { Handle, Position, type NodeProps } from 'reactflow'
import { NODE_HEIGHT, NODE_WIDTH } from '@/domain/layout'
import type { FlowNodeData } from './toFlow'

const STATUS_LABEL: Record<string, string> = {
  not_started: 'Not started', in_progress: 'In progress',
  blocked: 'Blocked', done: 'Done',
  open: 'Open', resolved: 'Resolved',
  proposed: 'Proposed', accepted: 'Accepted', rejected: 'Rejected',
}

export function NodeCard({ data, selected }: NodeProps<FlowNodeData>) {
  return (
    <div
      style={{
        width: NODE_WIDTH, height: NODE_HEIGHT,
        borderLeft: data.tagColor ? `6px solid ${data.tagColor}` : undefined,
        opacity: data.dimmed ? 0.25 : 1,
      }}
      className={`rounded-lg border bg-white px-3 py-2 shadow-sm transition-opacity ${
        selected ? 'ring-2 ring-black' : ''
      }`}
      data-testid={`node-${data.title}`}
    >
      <Handle type="target" position={Position.Top} />

      <div className="flex items-start justify-between gap-2">
        <p className="line-clamp-2 text-sm font-medium">{data.title}</p>
        {data.inCycle && (
          <span title="Circular dependency" className="text-amber-600" data-testid="cycle-warning">
            ⟲
          </span>
        )}
      </div>

      <p className="mt-1 text-[11px] uppercase tracking-wide text-neutral-400">{data.type}</p>

      {data.percent === null ? (
        <p className="mt-1 text-xs text-neutral-600">{STATUS_LABEL[data.status]}</p>
      ) : (
        <div className="mt-2">
          <div className="h-1.5 w-full rounded bg-neutral-200">
            <div className="h-1.5 rounded bg-neutral-800" style={{ width: `${data.percent}%` }} />
          </div>
          <p className="mt-1 text-xs text-neutral-600">{data.percent}%</p>
        </div>
      )}

      <Handle type="source" position={Position.Bottom} />
    </div>
  )
}
```

- [ ] **Step 7: Write the canvas**

Create `src/components/canvas/Canvas.tsx`:

```tsx
'use client'

import { useMemo } from 'react'
import ReactFlow, {
  Background, Controls, type NodeMouseHandler, type NodeDragHandler,
} from 'reactflow'
import 'reactflow/dist/style.css'
import { Graph } from '@/domain/graph'
import type { ProjectGraph } from '@/domain/types'
import { toFlow } from './toFlow'
import { NodeCard } from './NodeCard'

const nodeTypes = { card: NodeCard }

export function Canvas({
  graph, activeTagId, selectedId, onSelect, onMoveEnd,
}: {
  graph: ProjectGraph
  activeTagId: string | null
  selectedId: string | null
  onSelect: (nodeId: string | null) => void
  onMoveEnd: (nodeId: string, x: number, y: number) => void
}) {
  const flow = useMemo(
    () => toFlow(new Graph(graph), { activeTagId }),
    [graph, activeTagId],
  )

  const handleNodeClick: NodeMouseHandler = (_, node) => onSelect(node.id)
  const handleDragStop: NodeDragHandler = (_, node) =>
    onMoveEnd(node.id, node.position.x, node.position.y)

  return (
    <div className="h-full w-full" data-testid="canvas">
      <ReactFlow
        nodes={flow.nodes.map(n => ({ ...n, selected: n.id === selectedId }))}
        edges={flow.edges}
        nodeTypes={nodeTypes}
        onNodeClick={handleNodeClick}
        onNodeDragStop={handleDragStop}
        onPaneClick={() => onSelect(null)}
        fitView
        proOptions={{ hideAttribution: true }}
      >
        <Background />
        <Controls />
      </ReactFlow>
    </div>
  )
}
```

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat: render the project graph on a React Flow canvas"
```

---

### Task 14: The project workspace and canvas interaction

Implements FR-021, FR-024, FR-026, and §46.8's pin-on-drag and tidy-up.

**Files:**
- Create: `src/app/project/[id]/page.tsx`, `src/app/project/[id]/actions.ts`, `src/app/project/[id]/Workspace.tsx`
- Modify: `tests/e2e/dashboard.spec.ts` — remove the `fixme` marker
- Test: `tests/e2e/workspace.spec.ts`

**Interfaces:**
- Consumes: `loadProjectGraph`, `createNode`, `deleteNode`, `undoDelete`, `setPosition`, `clearPositions`, `requireUser`, `<Canvas />`
- Produces: server actions `addNodeAction`, `moveNodeAction`, `pinNodeAction`, `tidyUpAction`, `deleteNodeAction`, `undoDeleteAction`, each taking a plain object and returning `{ ok: true } | { ok: false; error: string }`

- [ ] **Step 1: Write the server actions**

Create `src/app/project/[id]/actions.ts`:

```ts
'use server'

import { revalidatePath } from 'next/cache'
import { requireUser } from '@/server/auth'
import {
  clearPositions, createNode, deleteNode, setPosition, undoDelete,
} from '@/server/nodes'
import { ValidationError } from '@/server/errors'
import type { NodeType } from '@/domain/types'

export type ActionResult = { ok: true } | { ok: false; error: string }

async function run(projectId: string, work: (userId: string) => Promise<void>): Promise<ActionResult> {
  try {
    await work(await requireUser())
    revalidatePath(`/project/${projectId}`)
    return { ok: true }
  } catch (e) {
    if (e instanceof ValidationError) return { ok: false, error: e.message }
    throw e
  }
}

export async function addNodeAction(
  projectId: string, title: string, type: NodeType, parentId: string | null,
): Promise<ActionResult> {
  return run(projectId, async userId => {
    await createNode(userId, projectId, {
      title, type, ...(parentId ? { parentId } : {}),
    })
  })
}

/** Spec §46.8 — a drag pins the node. */
export async function pinNodeAction(
  projectId: string, nodeId: string, x: number, y: number,
): Promise<ActionResult> {
  return run(projectId, userId => setPosition(userId, projectId, nodeId, x, y))
}

/** Spec §46.8 — tidy up clears every pin. Confirmed in the interface. */
export async function tidyUpAction(projectId: string): Promise<ActionResult> {
  return run(projectId, userId => clearPositions(userId, projectId))
}

export async function deleteNodeAction(
  projectId: string, nodeId: string,
): Promise<{ ok: true; deletedAt: string; nodeCount: number } | { ok: false; error: string }> {
  try {
    const userId = await requireUser()
    const result = await deleteNode(userId, projectId, nodeId)
    revalidatePath(`/project/${projectId}`)
    return { ok: true, deletedAt: result.deletedAt.toISOString(), nodeCount: result.nodeCount }
  } catch (e) {
    if (e instanceof ValidationError) return { ok: false, error: e.message }
    throw e
  }
}

export async function undoDeleteAction(
  projectId: string, deletedAt: string,
): Promise<ActionResult> {
  return run(projectId, userId => undoDelete(userId, projectId, new Date(deletedAt)))
}
```

- [ ] **Step 2: Write the workspace shell**

Create `src/app/project/[id]/Workspace.tsx`:

```tsx
'use client'

import { useState, useTransition } from 'react'
import { Canvas } from '@/components/canvas/Canvas'
import type { ProjectGraph } from '@/domain/types'
import {
  addNodeAction, deleteNodeAction, pinNodeAction, tidyUpAction, undoDeleteAction,
} from './actions'

export function Workspace({ projectId, graph }: { projectId: string; graph: ProjectGraph }) {
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [activeTagId] = useState<string | null>(null)
  const [title, setTitle] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [undoToken, setUndoToken] = useState<{ deletedAt: string; count: number } | null>(null)
  const [, startTransition] = useTransition()

  const selected = graph.nodes.find(n => n.id === selectedId) ?? null

  function add() {
    if (title.trim() === '') return
    const value = title
    setTitle('')
    startTransition(async () => {
      const result = await addNodeAction(projectId, value, 'system', selectedId)
      if (!result.ok) setError(result.error)
    })
  }

  function remove() {
    if (!selected) return
    startTransition(async () => {
      const result = await deleteNodeAction(projectId, selected.id)
      if (result.ok) {
        setUndoToken({ deletedAt: result.deletedAt, count: result.nodeCount })
        setSelectedId(null)
      } else setError(result.error)
    })
  }

  return (
    <div className="flex h-screen flex-col">
      <header className="flex items-center gap-2 border-b px-4 py-3">
        <input
          value={title} onChange={e => setTitle(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') add() }}
          placeholder={selected ? `Add inside ${selected.title}` : 'Add a node'}
          className="w-72 rounded border px-3 py-1.5 text-sm"
          data-testid="new-node-title"
        />
        <button onClick={add} className="rounded bg-black px-3 py-1.5 text-sm text-white"
                data-testid="add-node">
          Add
        </button>
        <button onClick={remove} disabled={!selected}
                className="rounded border px-3 py-1.5 text-sm disabled:opacity-40"
                data-testid="delete-node">
          Delete
        </button>
        <button
          onClick={() => {
            if (!confirm('Tidy up discards every position you set by hand. Continue?')) return
            startTransition(() => { void tidyUpAction(projectId) })
          }}
          className="ml-auto rounded border px-3 py-1.5 text-sm"
          data-testid="tidy-up"
        >
          Tidy up
        </button>
      </header>

      {error && (
        <div className="border-b bg-red-50 px-4 py-2 text-sm text-red-700" data-testid="error">
          {error}
          <button onClick={() => setError(null)} className="ml-3 underline">Dismiss</button>
        </div>
      )}

      {undoToken && (
        <div className="border-b bg-neutral-100 px-4 py-2 text-sm" data-testid="undo-bar">
          Deleted {undoToken.count} node{undoToken.count === 1 ? '' : 's'}.
          <button
            className="ml-3 underline"
            data-testid="undo"
            onClick={() => startTransition(async () => {
              await undoDeleteAction(projectId, undoToken.deletedAt)
              setUndoToken(null)
            })}
          >
            Undo
          </button>
        </div>
      )}

      <div className="flex-1">
        <Canvas
          graph={graph}
          activeTagId={activeTagId}
          selectedId={selectedId}
          onSelect={setSelectedId}
          onMoveEnd={(nodeId, x, y) => startTransition(() => {
            void pinNodeAction(projectId, nodeId, x, y)
          })}
        />
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Write the page**

Create `src/app/project/[id]/page.tsx`:

```tsx
import { notFound, redirect } from 'next/navigation'
import { requireUser, ForbiddenError } from '@/server/auth'
import { loadProjectGraph } from '@/server/graphLoad'
import { Workspace } from './Workspace'

export default async function ProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  let userId: string
  try {
    userId = await requireUser()
  } catch {
    redirect('/login')
  }

  try {
    const graph = await loadProjectGraph(userId, id)
    return <Workspace projectId={id} graph={graph} />
  } catch (e) {
    if (e instanceof ForbiddenError) notFound()
    throw e
  }
}
```

- [ ] **Step 4: Write the end-to-end test**

Create `tests/e2e/workspace.spec.ts`:

```ts
import { test, expect } from '@playwright/test'
import { ensureUser, signIn } from './helpers/user'

test.beforeAll(ensureUser)

test('adds nodes, nests one inside another, and deletes with undo', async ({ page }) => {
  await signIn(page)
  await page.goto('/dashboard')
  await page.getByTestId('project-name').fill('Booked')
  await page.getByTestId('create-project').click()
  await expect(page.getByTestId('canvas')).toBeVisible()

  await page.getByTestId('new-node-title').fill('Authentication')
  await page.getByTestId('add-node').click()
  await expect(page.getByTestId('node-Authentication')).toBeVisible()

  // Selecting a node makes the next one a child of it.
  await page.getByTestId('node-Authentication').click()
  await page.getByTestId('new-node-title').fill('Phone Authentication')
  await page.getByTestId('add-node').click()
  await expect(page.getByTestId('node-Phone Authentication')).toBeVisible()

  // Deleting the parent takes the child, and says how many.
  await page.getByTestId('node-Authentication').click()
  await page.getByTestId('delete-node').click()
  await expect(page.getByTestId('undo-bar')).toContainText('Deleted 2 nodes')
  await expect(page.getByTestId('node-Authentication')).toHaveCount(0)

  await page.getByTestId('undo').click()
  await expect(page.getByTestId('node-Authentication')).toBeVisible()
  await expect(page.getByTestId('node-Phone Authentication')).toBeVisible()
})
```

- [ ] **Step 5: Remove the fixme from the dashboard spec**

In `tests/e2e/dashboard.spec.ts`, change `test.fixme(` back to `test(` for `creates a project and opens it`.

- [ ] **Step 6: Run the end-to-end tests**

Run: `npm run test:e2e`
Expected: PASS — 3 tests

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: add project workspace with node creation, delete and undo"
```

---

### Task 15: Node detail panel

Implements §19 and §46.5.

**Files:**
- Create: `src/components/panel/panelData.ts`, `src/components/panel/DetailPanel.tsx`
- Modify: `src/app/project/[id]/Workspace.tsx` — mount the panel; `src/app/project/[id]/actions.ts` — add `updateNodeAction`
- Test: `tests/components/panelData.test.ts`

**Interfaces:**
- Consumes: `Graph`, `effectiveStatus`, `progressOf`, `openQuestionCount`, `legalStatuses`, `findDependencyCycles`
- Produces:
  - `interface PanelData { node: GraphNode; parent: GraphNode | null; status: NodeStatus; statusOptions: NodeStatus[]; progress: Progress | null; openQuestions: number; childrenByType: { type: NodeType; nodes: GraphNode[] }[]; dependencies: GraphNode[]; blocks: GraphNode[]; tags: Tag[]; cycle: string[] | null }`
  - `buildPanelData(graph: Graph, nodeId: string): PanelData | null`
  - `updateNodeAction(projectId, nodeId, patch): Promise<ActionResult>`

- [ ] **Step 1: Write the failing tests**

Create `tests/components/panelData.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { Graph } from '@/domain/graph'
import { buildPanelData } from '@/components/panel/panelData'
import { buildGraph } from '../helpers/graph'

const authGraph = () => new Graph(buildGraph({
  tags: [{ id: 'mvp', name: 'MVP', color: '#f00', priority: 0 }],
  nodes: [
    { id: 'root', type: 'goal', title: 'Booked' },
    { id: 'auth', type: 'system', title: 'Authentication', tagIds: ['mvp'] },
    { id: 'r1', type: 'requirement', title: 'Phone number authentication', status: 'done' },
    { id: 'r2', type: 'requirement', title: 'Account recovery' },
    { id: 'd1', type: 'decision', title: 'Clerk selected', status: 'accepted' },
    { id: 'q1', type: 'question', title: 'Email recovery?', status: 'open' },
    { id: 'db', type: 'system', title: 'User database' },
    { id: 'onboard', type: 'system', title: 'Mobile onboarding' },
  ],
  edges: [
    ['root', 'auth', 'contains'],
    ['auth', 'r1', 'contains'],
    ['auth', 'r2', 'contains'],
    ['auth', 'd1', 'contains'],
    ['auth', 'q1', 'contains'],
    ['auth', 'db', 'depends_on'],
    ['onboard', 'auth', 'depends_on'],
  ],
}))

describe('buildPanelData', () => {
  it('returns null for an unknown node', () => {
    expect(buildPanelData(authGraph(), 'nope')).toBeNull()
  })

  it('groups children by type', () => {
    const panel = buildPanelData(authGraph(), 'auth')!
    const group = (t: string) => panel.childrenByType.find(g => g.type === t)?.nodes.map(n => n.title)

    expect(group('requirement')).toEqual(['Phone number authentication', 'Account recovery'])
    expect(group('decision')).toEqual(['Clerk selected'])
    expect(group('question')).toEqual(['Email recovery?'])
  })

  it('separates what this node depends on from what depends on it', () => {
    const panel = buildPanelData(authGraph(), 'auth')!
    expect(panel.dependencies.map(n => n.title)).toEqual(['User database'])
    expect(panel.blocks.map(n => n.title)).toEqual(['Mobile onboarding'])
  })

  it('reports rolled-up progress and the open-question count separately', () => {
    const panel = buildPanelData(authGraph(), 'auth')!
    // Descendants: r1 done, r2 no, d1 accepted, q1 open → 2 of 4
    expect(panel.progress).toEqual({ resolved: 2, total: 4, percent: 50 })
    expect(panel.openQuestions).toBe(1)
  })

  it('withholds Done from the status options of a node with children', () => {
    const panel = buildPanelData(authGraph(), 'auth')!
    expect(panel.statusOptions).not.toContain('done')
  })

  it('offers Done on a leaf', () => {
    const panel = buildPanelData(authGraph(), 'r2')!
    expect(panel.statusOptions).toContain('done')
    expect(panel.progress).toBeNull()
  })

  it('resolves the parent and the node tags', () => {
    const panel = buildPanelData(authGraph(), 'auth')!
    expect(panel.parent!.title).toBe('Booked')
    expect(panel.tags.map(t => t.name)).toEqual(['MVP'])
  })

  it('names the other nodes in a dependency cycle', () => {
    const g = new Graph(buildGraph({
      nodes: [
        { id: 'a', type: 'task', title: 'A' },
        { id: 'b', type: 'task', title: 'B' },
      ],
      edges: [['a', 'b', 'depends_on'], ['b', 'a', 'depends_on']],
    }))
    expect(buildPanelData(g, 'a')!.cycle).toEqual(['a', 'b'])
  })

  it('leaves cycle null for a node outside any cycle', () => {
    expect(buildPanelData(authGraph(), 'auth')!.cycle).toBeNull()
  })
})
```

- [ ] **Step 2: Run and watch it fail**

Run: `npm test tests/components/panelData.test.ts`
Expected: FAIL — `Cannot find module '@/components/panel/panelData'`

- [ ] **Step 3: Write the selector**

Create `src/components/panel/panelData.ts`:

```ts
import type { Graph } from '@/domain/graph'
import { effectiveStatus, openQuestionCount, progressOf, type Progress } from '@/domain/progress'
import { legalStatuses } from '@/domain/status'
import { findDependencyCycles } from '@/domain/cycles'
import type { GraphNode, NodeStatus, NodeType, Tag } from '@/domain/types'

export interface PanelData {
  node: GraphNode
  parent: GraphNode | null
  status: NodeStatus
  statusOptions: NodeStatus[]
  progress: Progress | null
  openQuestions: number
  childrenByType: { type: NodeType; nodes: GraphNode[] }[]
  dependencies: GraphNode[]
  /** The same depends_on edges read from the other end (spec §46.10). */
  blocks: GraphNode[]
  tags: Tag[]
  cycle: string[] | null
}

const TYPE_ORDER: NodeType[] = [
  'goal', 'capability', 'system', 'feature', 'requirement', 'task', 'decision', 'question',
]

/**
 * Spec §46.5 — the panel is a graph query. Most of what it shows is other
 * nodes one hop away, not fields on this node.
 */
export function buildPanelData(graph: Graph, nodeId: string): PanelData | null {
  const node = graph.node(nodeId)
  if (!node) return null

  const children = graph.childrenOf(nodeId)
  const childrenByType = TYPE_ORDER
    .map(type => ({ type, nodes: children.filter(c => c.type === type) }))
    .filter(group => group.nodes.length > 0)

  const cycle = findDependencyCycles(graph).find(c => c.includes(nodeId)) ?? null

  return {
    node,
    parent: graph.parentOf(nodeId),
    status: effectiveStatus(graph, nodeId),
    statusOptions: legalStatuses(node.type, graph.isLeaf(nodeId)),
    progress: progressOf(graph, nodeId),
    openQuestions: openQuestionCount(graph, nodeId),
    childrenByType,
    dependencies: graph.dependenciesOf(nodeId),
    blocks: graph.dependentsOf(nodeId),
    tags: graph.tags.filter(t => node.tagIds.includes(t.id)),
    cycle,
  }
}
```

- [ ] **Step 4: Run and watch it pass**

Run: `npm test tests/components/panelData.test.ts`
Expected: PASS — 9 tests

- [ ] **Step 5: Add the update action**

Append to `src/app/project/[id]/actions.ts`:

```ts
import { updateNode } from '@/server/nodes'
import type { NodeStatus } from '@/domain/types'

export async function updateNodeAction(
  projectId: string, nodeId: string,
  patch: { title?: string; description?: string | null; status?: NodeStatus },
): Promise<ActionResult> {
  return run(projectId, userId => updateNode(userId, projectId, nodeId, patch))
}
```

- [ ] **Step 6: Write the panel component**

Create `src/components/panel/DetailPanel.tsx`:

```tsx
'use client'

import { useTransition } from 'react'
import { Graph } from '@/domain/graph'
import type { ProjectGraph, NodeStatus } from '@/domain/types'
import { buildPanelData } from './panelData'

const STATUS_LABEL: Record<NodeStatus, string> = {
  not_started: 'Not started', in_progress: 'In progress', blocked: 'Blocked', done: 'Done',
  open: 'Open', resolved: 'Resolved',
  proposed: 'Proposed', accepted: 'Accepted', rejected: 'Rejected',
}

export function DetailPanel({
  graph, nodeId, onSelect, onStatusChange,
}: {
  graph: ProjectGraph
  nodeId: string
  onSelect: (id: string) => void
  onStatusChange: (id: string, status: NodeStatus) => void
}) {
  const [, startTransition] = useTransition()
  const panel = buildPanelData(new Graph(graph), nodeId)
  if (!panel) return null

  return (
    <aside className="w-80 shrink-0 overflow-y-auto border-l bg-white p-4" data-testid="detail-panel">
      <h2 className="text-lg font-semibold">{panel.node.title}</h2>
      <p className="mt-0.5 text-[11px] uppercase tracking-wide text-neutral-400">
        {panel.node.type}
      </p>

      {panel.tags.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {panel.tags.map(t => (
            <span key={t.id} className="rounded px-2 py-0.5 text-xs text-white"
                  style={{ background: t.color }}>
              {t.name}
            </span>
          ))}
        </div>
      )}

      <Section title="Status">
        {panel.progress ? (
          <>
            <div className="h-2 w-full rounded bg-neutral-200">
              <div className="h-2 rounded bg-neutral-800" style={{ width: `${panel.progress.percent}%` }} />
            </div>
            <p className="mt-1 text-sm" data-testid="progress">
              {panel.progress.percent}% — {panel.progress.resolved} of {panel.progress.total} resolved
            </p>
          </>
        ) : (
          <select
            value={panel.status}
            data-testid="status-select"
            onChange={e => startTransition(() =>
              onStatusChange(nodeId, e.target.value as NodeStatus))}
            className="w-full rounded border px-2 py-1 text-sm"
          >
            {panel.statusOptions.map(s => (
              <option key={s} value={s}>{STATUS_LABEL[s]}</option>
            ))}
          </select>
        )}
        {panel.openQuestions > 0 && (
          <p className="mt-2 text-sm text-amber-700" data-testid="open-questions">
            {panel.openQuestions} open question{panel.openQuestions === 1 ? '' : 's'}
          </p>
        )}
      </Section>

      {panel.node.description && (
        <Section title="Purpose">
          <p className="text-sm text-neutral-700">{panel.node.description}</p>
        </Section>
      )}

      {panel.cycle && (
        <Section title="Circular dependency">
          <p className="text-sm text-amber-700" data-testid="panel-cycle">
            In a loop with {panel.cycle.filter(id => id !== nodeId).length} other node
            {panel.cycle.length === 2 ? '' : 's'}. Nothing in the loop can start.
          </p>
        </Section>
      )}

      {panel.childrenByType.map(group => (
        <Section key={group.type} title={`${group.type}s`}>
          <NodeList nodes={group.nodes} onSelect={onSelect} />
        </Section>
      ))}

      {panel.dependencies.length > 0 && (
        <Section title="Depends on">
          <NodeList nodes={panel.dependencies} onSelect={onSelect} />
        </Section>
      )}

      {panel.blocks.length > 0 && (
        <Section title="Blocks">
          <NodeList nodes={panel.blocks} onSelect={onSelect} />
        </Section>
      )}
    </aside>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-5">
      <h3 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-neutral-500">
        {title}
      </h3>
      {children}
    </section>
  )
}

function NodeList({
  nodes, onSelect,
}: { nodes: { id: string; title: string }[]; onSelect: (id: string) => void }) {
  return (
    <ul className="space-y-1">
      {nodes.map(n => (
        <li key={n.id}>
          <button onClick={() => onSelect(n.id)} className="text-left text-sm hover:underline">
            {n.title}
          </button>
        </li>
      ))}
    </ul>
  )
}
```

- [ ] **Step 7: Mount the panel in the workspace**

In `src/app/project/[id]/Workspace.tsx`, import the panel and the action:

```tsx
import { DetailPanel } from '@/components/panel/DetailPanel'
import { updateNodeAction } from './actions'
```

Replace the `<div className="flex-1">` block wrapping `<Canvas />` with:

```tsx
      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1">
          <Canvas
            graph={graph}
            activeTagId={activeTagId}
            selectedId={selectedId}
            onSelect={setSelectedId}
            onMoveEnd={(nodeId, x, y) => startTransition(() => {
              void pinNodeAction(projectId, nodeId, x, y)
            })}
          />
        </div>
        {selectedId && (
          <DetailPanel
            graph={graph}
            nodeId={selectedId}
            onSelect={setSelectedId}
            onStatusChange={(id, status) => startTransition(async () => {
              const result = await updateNodeAction(projectId, id, { status })
              if (!result.ok) setError(result.error)
            })}
          />
        )}
      </div>
```

- [ ] **Step 8: Add the end-to-end check**

Append to `tests/e2e/workspace.spec.ts`:

```ts
test('shows a rolled-up percentage on a parent and a status control on a leaf', async ({ page }) => {
  await signIn(page)
  await page.goto('/dashboard')
  await page.getByTestId('project-name').fill('Progress')
  await page.getByTestId('create-project').click()

  await page.getByTestId('new-node-title').fill('Authentication')
  await page.getByTestId('add-node').click()
  await page.getByTestId('node-Authentication').click()
  await page.getByTestId('new-node-title').fill('Send OTP')
  await page.getByTestId('add-node').click()

  // A leaf offers a status.
  await page.getByTestId('node-Send OTP').click()
  await page.getByTestId('status-select').selectOption('done')

  // Its parent shows 100%, and offers no status control.
  await page.getByTestId('node-Authentication').click()
  await expect(page.getByTestId('progress')).toContainText('100%')
  await expect(page.getByTestId('status-select')).toHaveCount(0)
})
```

- [ ] **Step 9: Run everything**

Run: `npm test` then `npm run test:e2e`
Expected: PASS

- [ ] **Step 10: Commit**

```bash
git add -A
git commit -m "feat: add node detail panel built from a graph query"
```

---

### Task 16: Tag bar and filtering

Implements §46.7's interface — highlighting, filtering, and tagging a branch.

**Files:**
- Create: `src/components/tags/TagBar.tsx`, `src/app/project/[id]/tagActions.ts`
- Modify: `src/app/project/[id]/Workspace.tsx` — mount the tag bar and wire `activeTagId`
- Test: `tests/e2e/tags.spec.ts`

**Interfaces:**
- Consumes: `createTag`, `tagNode`, `untagNode`, `tagBranch`, `deleteTag` (Task 11), `ActionResult` (Task 14)
- Produces: `createTagAction`, `tagNodeAction`, `untagNodeAction`, `tagBranchAction`, `deleteTagAction`; `<TagBar />`

- [ ] **Step 1: Write the tag actions**

Create `src/app/project/[id]/tagActions.ts`:

```ts
'use server'

import { revalidatePath } from 'next/cache'
import { requireUser } from '@/server/auth'
import { ValidationError } from '@/server/errors'
import { createTag, deleteTag, tagBranch, tagNode, untagNode } from '@/server/tags'
import type { ActionResult } from './actions'

async function run(projectId: string, work: (userId: string) => Promise<void>): Promise<ActionResult> {
  try {
    await work(await requireUser())
    revalidatePath(`/project/${projectId}`)
    return { ok: true }
  } catch (e) {
    if (e instanceof ValidationError) return { ok: false, error: e.message }
    throw e
  }
}

const PALETTE = ['#ef4444', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899']

export async function createTagAction(
  projectId: string, name: string, existingCount: number,
): Promise<ActionResult> {
  const color = PALETTE[existingCount % PALETTE.length]!
  return run(projectId, async userId => { await createTag(userId, projectId, name, color) })
}

export async function tagNodeAction(projectId: string, nodeId: string, tagId: string) {
  return run(projectId, userId => tagNode(userId, projectId, nodeId, tagId))
}

export async function untagNodeAction(projectId: string, nodeId: string, tagId: string) {
  return run(projectId, userId => untagNode(userId, projectId, nodeId, tagId))
}

/** Spec §46.7 — writes an explicit row per descendant. No inheritance. */
export async function tagBranchAction(projectId: string, nodeId: string, tagId: string) {
  return run(projectId, async userId => { await tagBranch(userId, projectId, nodeId, tagId) })
}

export async function deleteTagAction(projectId: string, tagId: string) {
  return run(projectId, userId => deleteTag(userId, projectId, tagId))
}
```

- [ ] **Step 2: Write the tag bar**

Create `src/components/tags/TagBar.tsx`:

```tsx
'use client'

import { useState, useTransition } from 'react'
import type { GraphNode, Tag } from '@/domain/types'
import {
  createTagAction, tagBranchAction, tagNodeAction, untagNodeAction,
} from '@/app/project/[id]/tagActions'

export function TagBar({
  projectId, tags, selected, activeTagId, onFilter,
}: {
  projectId: string
  tags: Tag[]
  selected: GraphNode | null
  activeTagId: string | null
  onFilter: (tagId: string | null) => void
}) {
  const [name, setName] = useState('')
  const [, startTransition] = useTransition()

  return (
    <div className="flex flex-wrap items-center gap-2 border-b px-4 py-2" data-testid="tag-bar">
      {tags.map(tag => {
        const on = selected?.tagIds.includes(tag.id) ?? false
        return (
          <div key={tag.id} className="flex items-center overflow-hidden rounded border text-xs">
            <button
              onClick={() => onFilter(activeTagId === tag.id ? null : tag.id)}
              className={`px-2 py-1 ${activeTagId === tag.id ? 'font-semibold' : ''}`}
              style={{ borderLeft: `4px solid ${tag.color}` }}
              data-testid={`filter-${tag.name}`}
            >
              {tag.name}
            </button>
            {selected && (
              <>
                <button
                  className="border-l px-2 py-1"
                  data-testid={`toggle-${tag.name}`}
                  onClick={() => startTransition(() => {
                    void (on
                      ? untagNodeAction(projectId, selected.id, tag.id)
                      : tagNodeAction(projectId, selected.id, tag.id))
                  })}
                >
                  {on ? '−' : '+'}
                </button>
                <button
                  className="border-l px-2 py-1"
                  title="Tag this node and everything beneath it"
                  data-testid={`branch-${tag.name}`}
                  onClick={() => startTransition(() => {
                    void tagBranchAction(projectId, selected.id, tag.id)
                  })}
                >
                  ⤓
                </button>
              </>
            )}
          </div>
        )
      })}

      <input
        value={name} onChange={e => setName(e.target.value)}
        onKeyDown={e => {
          if (e.key !== 'Enter' || name.trim() === '') return
          const value = name
          setName('')
          startTransition(() => { void createTagAction(projectId, value, tags.length) })
        }}
        placeholder="New tag"
        className="w-28 rounded border px-2 py-1 text-xs"
        data-testid="new-tag"
      />

      {activeTagId && (
        <button onClick={() => onFilter(null)} className="text-xs underline" data-testid="clear-filter">
          Clear filter
        </button>
      )}
    </div>
  )
}
```

- [ ] **Step 3: Mount it in the workspace**

In `src/app/project/[id]/Workspace.tsx`:

Change the state declaration so the filter is settable:

```tsx
const [activeTagId, setActiveTagId] = useState<string | null>(null)
```

Add the import:

```tsx
import { TagBar } from '@/components/tags/TagBar'
```

Insert directly below the `</header>` line:

```tsx
      <TagBar
        projectId={projectId}
        tags={graph.tags}
        selected={selected}
        activeTagId={activeTagId}
        onFilter={setActiveTagId}
      />
```

- [ ] **Step 4: Write the end-to-end test**

Create `tests/e2e/tags.spec.ts`:

```ts
import { test, expect } from '@playwright/test'
import { ensureUser, signIn } from './helpers/user'

test.beforeAll(ensureUser)

test('tags a branch and filters the canvas by tag', async ({ page }) => {
  await signIn(page)
  await page.goto('/dashboard')
  await page.getByTestId('project-name').fill('Tagging')
  await page.getByTestId('create-project').click()

  await page.getByTestId('new-node-title').fill('Authentication')
  await page.getByTestId('add-node').click()
  await page.getByTestId('node-Authentication').click()
  await page.getByTestId('new-node-title').fill('Phone Auth')
  await page.getByTestId('add-node').click()

  // A second top-level node that will not be tagged.
  await page.getByTestId('canvas').click({ position: { x: 10, y: 10 } })
  await page.getByTestId('new-node-title').fill('Booking')
  await page.getByTestId('add-node').click()

  await page.getByTestId('new-tag').fill('MVP')
  await page.getByTestId('new-tag').press('Enter')
  await expect(page.getByTestId('filter-MVP')).toBeVisible()

  // Tag Authentication and everything beneath it.
  await page.getByTestId('node-Authentication').click()
  await page.getByTestId('branch-MVP').click()

  // Filtering dims what is not tagged.
  await page.getByTestId('filter-MVP').click()
  await expect(page.getByTestId('node-Booking')).toHaveCSS('opacity', '0.25')
  await expect(page.getByTestId('node-Phone Auth')).toHaveCSS('opacity', '1')
})
```

- [ ] **Step 5: Run and commit**

Run: `npm run test:e2e`
Expected: PASS

```bash
git add -A
git commit -m "feat: add tag bar with highlighting, branch tagging and filtering"
```

---

### Task 17: Next-task panel and the acceptance scenario

Implements §23 through §46.13, and proves the whole of Phase 1 with an end-to-end run of §44 minus the AI.

**Files:**
- Create: `src/components/NextTask.tsx`
- Modify: `src/app/project/[id]/Workspace.tsx` — mount it
- Test: `tests/e2e/acceptance.spec.ts`

**Interfaces:**
- Consumes: `recommendNextTask` (Task 6), `Graph` (Task 3)
- Produces: `<NextTask graph={ProjectGraph} onSelect={(id: string) => void} />`

- [ ] **Step 1: Write the component**

Create `src/components/NextTask.tsx`:

```tsx
'use client'

import { useState } from 'react'
import { Graph } from '@/domain/graph'
import { recommendNextTask } from '@/domain/nextTask'
import type { ProjectGraph } from '@/domain/types'

const EMPTY_MESSAGE = {
  empty_project: 'This project has no nodes yet.',
  all_done: 'Everything is done.',
  all_blocked: 'Everything left is waiting on unfinished work.',
  cycle_only: 'Everything left is inside a circular dependency and cannot start.',
} as const

export function NextTask({
  graph, onSelect,
}: { graph: ProjectGraph; onSelect: (id: string) => void }) {
  const [open, setOpen] = useState(false)
  const g = new Graph(graph)
  const result = recommendNextTask(g)

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="rounded border px-3 py-1.5 text-sm"
        data-testid="next-task-button"
      >
        What should I work on next?
      </button>

      {open && (
        <div className="absolute right-0 z-10 mt-2 w-80 rounded-lg border bg-white p-4 shadow-lg"
             data-testid="next-task-panel">
          {result.recommendation ? (
            <>
              <button
                className="text-left font-medium hover:underline"
                data-testid="next-task-title"
                onClick={() => { onSelect(result.recommendation!.node.id); setOpen(false) }}
              >
                {result.recommendation.node.title}
              </button>
              <p className="mt-1 text-sm text-neutral-600" data-testid="next-task-reason">
                {result.recommendation.reason}
              </p>
            </>
          ) : (
            <p className="text-sm text-neutral-600" data-testid="next-task-empty">
              {EMPTY_MESSAGE[result.emptyReason ?? 'empty_project']}
            </p>
          )}

          {result.cycles.length > 0 && (
            <p className="mt-3 border-t pt-3 text-sm text-amber-700" data-testid="next-task-cycles">
              {result.cycles.flat().length} nodes are in a circular dependency and cannot be started:{' '}
              {result.cycles.flat()
                .map(id => g.node(id)?.title ?? id)
                .join(', ')}.
            </p>
          )}
        </div>
      )}
    </div>
  )
}
```

Note that cycles are reported even alongside a recommendation, as §46.13 requires — never silently omitted.

- [ ] **Step 2: Mount it in the workspace**

In `src/app/project/[id]/Workspace.tsx`, add the import:

```tsx
import { NextTask } from '@/components/NextTask'
```

and insert it immediately before the `Tidy up` button in the header, changing that button's `className` from `ml-auto rounded border px-3 py-1.5 text-sm` to `rounded border px-3 py-1.5 text-sm`:

```tsx
        <div className="ml-auto flex items-center gap-2">
          <NextTask graph={graph} onSelect={setSelectedId} />
```

and close the wrapper `</div>` after the `Tidy up` button.

- [ ] **Step 3: Write the acceptance test**

This is §44 with the AI steps replaced by manual ones. It is the single test that proves Phase 1 works.

Create `tests/e2e/acceptance.spec.ts`:

```ts
import { test, expect } from '@playwright/test'
import { ensureUser, signIn } from './helpers/user'

test.beforeAll(ensureUser)

test('build a project by hand, track it, and get a next-task recommendation', async ({ page }) => {
  await signIn(page)

  // Create the project.
  await page.goto('/dashboard')
  await page.getByTestId('project-name').fill('Booked')
  await page.getByTestId('create-project').click()
  await expect(page.getByTestId('canvas')).toBeVisible()

  // Build the top level.
  for (const name of ['Authentication', 'Discovery', 'Booking']) {
    await page.getByTestId('canvas').click({ position: { x: 10, y: 10 } })
    await page.getByTestId('new-node-title').fill(name)
    await page.getByTestId('add-node').click()
    await expect(page.getByTestId(`node-${name}`)).toBeVisible()
  }

  // Decompose Authentication.
  await page.getByTestId('node-Authentication').click()
  for (const name of ['Send OTP', 'Verify OTP']) {
    await page.getByTestId('node-Authentication').click()
    await page.getByTestId('new-node-title').fill(name)
    await page.getByTestId('add-node').click()
  }

  // Mark Send OTP done. Authentication should show 50%.
  await page.getByTestId('node-Send OTP').click()
  await page.getByTestId('status-select').selectOption('done')

  await page.getByTestId('node-Authentication').click()
  await expect(page.getByTestId('progress')).toContainText('50%')

  // Ask what to work on next.
  await page.getByTestId('next-task-button').click()
  await expect(page.getByTestId('next-task-panel')).toBeVisible()
  await expect(page.getByTestId('next-task-title')).toBeVisible()

  // Everything survives a reload.
  await page.reload()
  await expect(page.getByTestId('node-Authentication')).toBeVisible()
  await page.getByTestId('node-Authentication').click()
  await expect(page.getByTestId('progress')).toContainText('50%')
})
```

- [ ] **Step 4: Run the whole suite**

Run: `npm test`
Expected: PASS — every unit and integration test

Run: `npm run test:e2e`
Expected: PASS — every end-to-end test including the acceptance scenario

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add next-task recommendation panel and acceptance test"
```

---

---

### Task 18: Decision reasoning and alternatives

Implements FR-060, FR-061, FR-062 and §46.3's `data` column — the only place in Phase 1 where a node type carries fields of its own.

**Files:**
- Create: `src/components/panel/DecisionFields.tsx`
- Modify: `src/components/panel/panelData.ts` — expose `decision`
- Modify: `src/components/panel/DetailPanel.tsx` — render the fields
- Modify: `src/app/project/[id]/actions.ts` — accept `data` in `updateNodeAction`
- Test: `tests/components/panelData.test.ts` — add the decision cases
- Test: `tests/e2e/decisions.spec.ts`

**Interfaces:**
- Consumes: `buildPanelData` (Task 15), `updateNode` (Task 9)
- Produces:
  - `interface DecisionData { reason: string; alternatives: string[] }`
  - `readDecisionData(node: GraphNode): DecisionData | null` from `@/components/panel/panelData`
  - `PanelData.decision: DecisionData | null`
  - `updateNodeAction(projectId, nodeId, patch: { title?; description?; status?; data? })`

- [ ] **Step 1: Write the failing tests**

Append to `tests/components/panelData.test.ts`:

```ts
import { readDecisionData } from '@/components/panel/panelData'

describe('decision fields', () => {
  it('reads reason and alternatives out of the data column', () => {
    const g = new Graph(buildGraph({
      nodes: [{ id: 'd', type: 'decision', title: 'Use Clerk' }],
    }))
    // buildGraph gives every node an empty data object; set it directly here
    // because the helper does not model type-specific fields.
    g.node('d')!.data = {
      reason: 'Managed authentication and sessions',
      alternatives: ['Auth0', 'Firebase'],
    }

    expect(buildPanelData(g, 'd')!.decision).toEqual({
      reason: 'Managed authentication and sessions',
      alternatives: ['Auth0', 'Firebase'],
    })
  })

  it('returns empty fields for a decision with no data yet', () => {
    const g = new Graph(buildGraph({ nodes: [{ id: 'd', type: 'decision' }] }))
    expect(buildPanelData(g, 'd')!.decision).toEqual({ reason: '', alternatives: [] })
  })

  it('returns null for a node that is not a decision', () => {
    const g = new Graph(buildGraph({ nodes: [{ id: 't', type: 'task' }] }))
    expect(buildPanelData(g, 't')!.decision).toBeNull()
  })

  it('tolerates malformed data rather than throwing', () => {
    const g = new Graph(buildGraph({ nodes: [{ id: 'd', type: 'decision' }] }))
    g.node('d')!.data = { reason: 42, alternatives: 'not an array' }
    expect(readDecisionData(g.node('d')!)).toEqual({ reason: '', alternatives: [] })
  })
})
```

- [ ] **Step 2: Run and watch it fail**

Run: `npm test tests/components/panelData.test.ts`
Expected: FAIL — `readDecisionData` is not exported from `@/components/panel/panelData`

- [ ] **Step 3: Extend the selector**

In `src/components/panel/panelData.ts`, add to the `PanelData` interface:

```ts
  /** Populated only for a decision node (spec §46.3). */
  decision: DecisionData | null
```

Add the type and reader:

```ts
export interface DecisionData {
  reason: string
  alternatives: string[]
}

/**
 * Spec §46.3 — a Decision's extra fields live in the JSON `data` column
 * because they are displayed rather than filtered on. JSON is not typed by
 * the database, so this reads defensively and never throws.
 */
export function readDecisionData(node: GraphNode): DecisionData | null {
  if (node.type !== 'decision') return null

  const reason = node.data['reason']
  const alternatives = node.data['alternatives']

  return {
    reason: typeof reason === 'string' ? reason : '',
    alternatives: Array.isArray(alternatives)
      ? alternatives.filter((a): a is string => typeof a === 'string')
      : [],
  }
}
```

Add to the object returned by `buildPanelData`:

```ts
    decision: readDecisionData(node),
```

- [ ] **Step 4: Run and watch it pass**

Run: `npm test tests/components/panelData.test.ts`
Expected: PASS — 13 tests

- [ ] **Step 5: Let the update action carry data**

In `src/app/project/[id]/actions.ts`, widen the patch parameter of `updateNodeAction`:

```ts
export async function updateNodeAction(
  projectId: string, nodeId: string,
  patch: {
    title?: string
    description?: string | null
    status?: NodeStatus
    data?: Record<string, unknown>
  },
): Promise<ActionResult> {
  return run(projectId, userId => updateNode(userId, projectId, nodeId, patch))
}
```

- [ ] **Step 6: Write the editor**

Create `src/components/panel/DecisionFields.tsx`:

```tsx
'use client'

import { useState } from 'react'
import type { DecisionData } from './panelData'

export function DecisionFields({
  nodeId, value, onSave,
}: {
  nodeId: string
  value: DecisionData
  onSave: (nodeId: string, data: DecisionData) => void
}) {
  const [reason, setReason] = useState(value.reason)
  const [alternatives, setAlternatives] = useState(value.alternatives.join('\n'))

  function save() {
    onSave(nodeId, {
      reason: reason.trim(),
      alternatives: alternatives.split('\n').map(a => a.trim()).filter(a => a !== ''),
    })
  }

  return (
    <div className="space-y-3">
      <div>
        <label className="mb-1 block text-xs text-neutral-500" htmlFor="decision-reason">
          Reason
        </label>
        <textarea
          id="decision-reason" rows={3} value={reason}
          onChange={e => setReason(e.target.value)} onBlur={save}
          className="w-full rounded border px-2 py-1 text-sm"
          data-testid="decision-reason"
        />
      </div>

      <div>
        <label className="mb-1 block text-xs text-neutral-500" htmlFor="decision-alternatives">
          Alternatives — one per line
        </label>
        <textarea
          id="decision-alternatives" rows={3} value={alternatives}
          onChange={e => setAlternatives(e.target.value)} onBlur={save}
          className="w-full rounded border px-2 py-1 text-sm"
          data-testid="decision-alternatives"
        />
      </div>
    </div>
  )
}
```

- [ ] **Step 7: Render it in the panel**

In `src/components/panel/DetailPanel.tsx`, add the import:

```tsx
import { DecisionFields } from './DecisionFields'
import type { DecisionData } from './panelData'
```

Add a prop to the component signature, alongside `onStatusChange`:

```tsx
  onDecisionChange: (id: string, data: DecisionData) => void
```

Insert immediately after the `Purpose` section:

```tsx
      {panel.decision && (
        <Section title="Decision">
          <DecisionFields
            key={nodeId}
            nodeId={nodeId}
            value={panel.decision}
            onSave={onDecisionChange}
          />
        </Section>
      )}
```

The `key={nodeId}` matters: without it, selecting a different decision keeps the previous one's text in the local state.

- [ ] **Step 8: Wire it in the workspace**

In `src/app/project/[id]/Workspace.tsx`, add the prop to `<DetailPanel>`:

```tsx
            onDecisionChange={(id, data) => startTransition(async () => {
              const result = await updateNodeAction(projectId, id, {
                data: { reason: data.reason, alternatives: data.alternatives },
              })
              if (!result.ok) setError(result.error)
            })}
```

- [ ] **Step 9: Allow a decision node to be created**

The workspace toolbar currently hard-codes `'system'` as the type. Replace the `Add` button's handler and add a type selector. In `Workspace.tsx`, add state:

```tsx
const [type, setType] = useState<NodeType>('system')
```

with `import type { NodeType } from '@/domain/types'`, change the `add` function's call to `addNodeAction(projectId, value, type, selectedId)`, and insert this select immediately after the `new-node-title` input:

```tsx
        <select
          value={type} onChange={e => setType(e.target.value as NodeType)}
          className="rounded border px-2 py-1.5 text-sm"
          data-testid="new-node-type"
        >
          {['goal', 'capability', 'system', 'feature', 'requirement',
            'task', 'decision', 'question'].map(t => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
```

- [ ] **Step 10: Write the end-to-end test**

Create `tests/e2e/decisions.spec.ts`:

```ts
import { test, expect } from '@playwright/test'
import { ensureUser, signIn } from './helpers/user'

test.beforeAll(ensureUser)

test('records a decision with reasoning and alternatives that survive a reload', async ({ page }) => {
  await signIn(page)
  await page.goto('/dashboard')
  await page.getByTestId('project-name').fill('Decisions')
  await page.getByTestId('create-project').click()

  await page.getByTestId('new-node-title').fill('Use Clerk for authentication')
  await page.getByTestId('new-node-type').selectOption('decision')
  await page.getByTestId('add-node').click()

  await page.getByTestId('node-Use Clerk for authentication').click()
  await page.getByTestId('decision-reason').fill('Managed authentication and sessions')
  await page.getByTestId('decision-alternatives').fill('Auth0\nFirebase\nCustom')
  await page.getByTestId('decision-alternatives').blur()

  // A decision offers its own statuses, not Done.
  await expect(page.getByTestId('status-select')).toContainText('Accepted')
  await page.getByTestId('status-select').selectOption('accepted')

  await page.reload()
  await page.getByTestId('node-Use Clerk for authentication').click()
  await expect(page.getByTestId('decision-reason'))
    .toHaveValue('Managed authentication and sessions')
  await expect(page.getByTestId('decision-alternatives'))
    .toHaveValue('Auth0\nFirebase\nCustom')
})
```

- [ ] **Step 11: Run everything and commit**

Run: `npm test` then `npm run test:e2e`
Expected: PASS

```bash
git add -A
git commit -m "feat: record decision reasoning and alternatives in the data column"
```

## Done criteria for Phase 1

Phase 1 is complete when all of the following hold:

- `npm test` and `npm run test:e2e` both pass.
- `tests/e2e/acceptance.spec.ts` passes — a user can create a project, build a graph by hand, decompose a node, mark work done, see progress roll up, ask what to work on next, and find everything intact after a reload.
- No file under `src/domain/` imports `drizzle`, `react`, `next` or `@/db`.
- No source file makes a network call to any model provider.

## Deferred to Phase 2

Recorded in PRD §46.14, and deliberately absent here:

- AI context assembly (FR-031)
- Conversation scoping (§8.1)
- Analytics instrumentation for the §40 success metrics
- The AI change-proposal pipeline (§46.6) — the reference model is written down, but the mutation functions it will call are the ones built in Tasks 9, 10 and 11.
