# Product Requirements Document

## Working Title: Project Graph

**Document status:** Draft\
**Product stage:** V1 / MVP\
**Primary platform:** Web\
**Primary users:** Software developers, technical founders, indie hackers, students and small software teams

---

# 1. Product Summary

Project Graph is an AI-assisted software planning and execution tool that transforms a high-level software idea into a structured, interactive graph of smaller goals, capabilities, systems, requirements, technical decisions and tasks.

A user begins by describing a software product in natural language.

For example:

> “I want to build a marketplace where customers can discover independent beauty professionals, see their work, view availability and book appointments.”

Project Graph analyses the description and creates a visual representation of the product.

Example:

```text
Booked
│
├── Authentication
├── Provider Discovery
├── Provider Profiles
├── Availability
├── Booking
├── Payments
└── Account Management
```

Each part of the project can subsequently be decomposed further.

For example:

```text
Authentication
│
└── Phone Authentication
    │
    └── SMS OTP
        │
        ├── Send OTP
        ├── Verify OTP
        ├── Rate Limiting
        ├── Session Creation
        └── Error Handling
```

Users can continue discussing their project with an AI assistant.

The AI can propose additions, removals, restructures and dependencies within the graph as the software design evolves.

Nodes can be marked as complete, allowing the user to visually track their progression from an abstract idea toward a completed product.

The long-term goal is for the graph to become the living model of the software project: what is being built, why decisions were made, how components depend on one another and eventually where those components exist in the codebase.

---

# 2. Problem

Software projects often begin as relatively simple ideas:

> “I want to build X.”

However, implementing the idea requires understanding and coordinating many smaller concerns:

- authentication
- onboarding
- data models
- APIs
- user interfaces
- payments
- permissions
- search
- error handling
- infrastructure
- testing
- deployment
- technical decisions
- dependencies between systems

Developers therefore have to maintain a large mental model of the software.

This becomes increasingly difficult as the project grows.

Existing tools only solve pieces of this problem.

### Chat-based AI tools

AI assistants can help developers reason about individual problems, but knowledge becomes fragmented across different conversations.

A developer may discuss:

```text
Authentication → Chat conversation A
Payments       → Chat conversation B
Search         → Chat conversation C
Database       → notes
Tasks          → GitHub
Architecture   → diagram
```

There is no persistent representation of how those decisions form one system.

### Task management tools

Tools such as Linear, Jira and Trello are effective at tracking predefined work but generally assume the developer already knows what tasks need to exist.

They do not primarily solve:

> “What does this idea actually break down into?”

### Mind-mapping tools

Mind maps represent concepts visually but generally do not understand software semantics, dependencies, implementation decisions or project state.

The user must manually maintain the map.

### Documentation tools

Documentation captures information but becomes disconnected from execution and frequently becomes outdated.

---

# 3. Product Hypothesis

If developers can convert a large software idea into an AI-maintained visual graph of smaller executable units, they will find it easier to:

- understand the complete system
- determine what should be built next
- avoid forgetting requirements
- reason about dependencies
- preserve architectural decisions
- measure progress
- manage AI-assisted development
- reduce cognitive load

The graph therefore becomes an external representation of the developer's mental model of the software.

---

# 4. Product Vision

Project Graph should eventually answer five fundamental questions about a software project:

### What are we building?

Represented through goals, capabilities, features and requirements.

### How does it work?

Represented through systems, components and relationships.

### Why was it designed this way?

Represented through technical and product decisions.

### What remains to be done?

Represented through tasks, statuses and dependencies.

### Where does it exist?

Eventually represented through connections between graph nodes and the actual codebase.

The long-term model is:

```text
IDEA
 ↓
PRODUCT GOALS
 ↓
CAPABILITIES
 ↓
SYSTEMS
 ↓
REQUIREMENTS
 ↓
DECISIONS
 ↓
TASKS
 ↓
IMPLEMENTATION
 ↓
CODE
```

---

# 5. V1 Objective

V1 should prove one core hypothesis:

> A developer finds an AI-generated and AI-maintained project graph useful enough to use while actively building software.

V1 does **not** need to manage the entire software development lifecycle.

The primary loop is:

```text
Describe idea
      ↓
Generate graph
      ↓
Explore project
      ↓
Discuss part of project with AI
      ↓
AI proposes graph changes
      ↓
User accepts changes
      ↓
Work on individual nodes
      ↓
Mark work complete
      ↓
See overall progress
      ↓
Continue refining project
```

---

# 6. Target User

## Primary Persona

### Individual Developer / Technical Founder

A person building a software product largely independently or within a small team.

They may use AI heavily while developing.

Typical characteristics:

- understands basic software engineering
- frequently starts projects from broad ideas
- uses ChatGPT, Claude, Codex or similar AI tools
- struggles to keep project decisions organised
- wants to know what to build next
- wants visibility into project progress
- prefers visual organisation over large documents
- may use GitHub but does not want heavy project-management overhead

---

# 7. Jobs To Be Done

### JTBD 1 — Decomposition

> When I have an idea for software, help me understand what the product actually consists of.

### JTBD 2 — Focus

> When the project feels large, show me the smallest meaningful unit I can work on next.

### JTBD 3 — Project Memory

> When I return to a part of the project, show me what decisions have already been made and why.

### JTBD 4 — Change Management

> When I change a requirement, help me understand what other parts of the software are affected.

### JTBD 5 — Progress

> When I complete work, show me that I am getting closer to completing the overall product.

---

# 8. Core Product Concepts

## 8.1 Project

The highest-level object.

Example:

```text
Booked
```

A project contains:

- project description
- graph
- project conversations
- nodes
- relationships
- progress
- project metadata

---

# 9. Graph Model

The project should internally be represented as a graph rather than a strict tree.

The UI may display hierarchical relationships where useful, but a node may have relationships with multiple other nodes.

Example:

```text
Provider Calendar
       │
       ↓
Availability
       │
       ↓
Booking ← Service
       │
       ↓
Payment
```

This allows the system to represent actual software dependencies.

---

# 10. Node Types

Nodes should have semantic meaning.

V1 should support the following node types.

## Goal

Represents a high-level desired outcome.

Example:

> Allow customers to book beauty professionals.

---

## Capability

Represents something the product must fundamentally be capable of doing.

Examples:

- discover providers
- book appointments
- process payments
- authenticate users

---

## System

Represents a technical or logical subsystem.

Examples:

- authentication
- booking system
- payments
- search
- notifications

---

## Requirement

Represents behaviour that must exist.

Example:

> Users must be able to authenticate using their phone number.

---

## Feature

Represents a user-facing capability.

Example:

> Search providers by location.

---

## Decision

Represents a chosen implementation or product decision.

Example:

```text
Decision: Use Clerk

Reason:
Managed authentication and session infrastructure.

Alternatives:
- Auth0
- Firebase
- custom authentication
```

---

## Task

Represents executable work.

Examples:

- create phone number input screen
- configure Clerk project
- create OTP verification flow
- add authentication middleware

Tasks can be marked complete.

---

## Question

Represents something unresolved.

Example:

> Should providers be allowed to require booking approval?

Questions should remain visible until resolved.

---

# 11. Node Relationships

V1 stores four relationship types. See §46.10.

### Contains

```text
Authentication
    contains
Phone OTP
```

Hierarchy is stored as a `contains` edge, not as a field on the node. A node has
one parent in V1, enforced in the database. See §46.2.

### Depends On

```text
Booking
depends on
Availability
```

### Implements

```text
Use Clerk
implements
Phone Authentication
```

### Related To

Used where no stronger relationship exists.

### Blocks — a reading, not a stored type

`blocks` is not stored. "Database Schema blocks Booking API" and "Booking API
depends on Database Schema" are the same fact about the same pair of nodes.
Only `depends_on` is recorded, and it is displayed from both ends: as
"Depends on" on one node's panel and as "Blocks" on the other's. See §46.10.

---

# 12. Node Structure

Each node should contain:

```text
id
project_id
title
description
type
status
data
pos_x
pos_y
deleted_at
created_at
updated_at
```

There is no `parent_id`. Hierarchy is an edge. See §46.2.

`data` is a JSON column holding fields specific to a node type — a Decision's
reasoning and alternatives, for instance. Anything filtered or sorted on gets a
real column; anything only displayed goes in `data`. See §46.3.

`pos_x` and `pos_y` are null when a node is automatically positioned, and set
once the user drags it. See §46.8.

Every relationship, including containment, is an edge:

```text
id
project_id
source_node_id
target_node_id
type
deleted_at
```

---

# 13. Node Status

V1 should support:

```text
Not Started
In Progress
Blocked
Done
```

Questions may additionally support:

```text
Open
Resolved
```

Decisions may support:

```text
Proposed
Accepted
Rejected
```

A node with children cannot be set to Done. It reaches Done only when all of its
descendants are resolved. See §46.4.

---

# 14. Primary User Flow — Project Creation

## Step 1

User creates a new project.

The interface asks:

> What are you building?

The user enters a natural-language description.

Example:

> Booked is a marketplace where customers discover independent beauty professionals based on their work, see their services and availability and book appointments.

---

## Step 2

AI analyses the description.

The AI extracts:

- product name
- primary users
- primary product goal
- major capabilities
- obvious systems
- unresolved assumptions

---

## Step 3

AI creates an initial graph.

Example:

```text
Booked
│
├── Authentication
├── Discovery
├── Provider Profiles
├── Services
├── Availability
├── Booking
├── Payments
└── Account Management
```

Initial generation should favour clarity over completeness.

The AI should generally create approximately 5–15 high-level nodes rather than immediately generating dozens of implementation tasks.

---

# 15. Progressive Decomposition

Users should be able to decompose any node further.

Example:

User selects:

```text
Authentication
```

And prompts:

> Break this down. I want users to sign in using SMS OTP.

AI proposes:

```text
Authentication
│
└── Phone Authentication
    │
    ├── Phone Entry
    ├── Send OTP
    ├── Verify OTP
    ├── Session Management
    ├── Rate Limiting
    └── Error Handling
```

The user can approve or reject the proposed changes.

---

# 16. AI Project Chat

Every project should include an AI conversation interface.

The AI should have access to the current graph.

Users should be able to say things such as:

> Add Stripe payments.

> Break authentication into smaller tasks.

> We aren't building messaging in V1.

> Providers should approve some bookings.

> What should I work on next?

> What parts of the system does this change affect?

The AI should respond using the project context rather than treating every message as a new isolated conversation.

---

# 17. AI Graph Modification

The AI should **not silently modify the project graph**.

For meaningful structural changes, the system should generate a proposal.

Example:

```text
Proposed Changes

+ Add Booking Mode
+ Add Instant Booking
+ Add Approval Required
+ Add Pending Booking Status
+ Add Provider Notification

Affected existing nodes:
• Booking
• Availability
• Notifications
```

User actions:

```text
Accept
Reject
Modify
```

Only accepted proposals mutate the graph.

This protects users from losing control of their project model.

---

# 18. Contextual Node Chat

Users should be able to select a node and discuss specifically that part of the system.

Example:

```text
Selected Node:
OTP Rate Limiting
```

User:

> What's the best way to implement this?

The AI receives:

- project context
- selected node
- parent nodes
- child nodes
- dependencies
- existing decisions
- related requirements

This allows the conversation to remain focused.

---

# 19. Node Detail Panel

Clicking a node should open a detail panel.

Example:

```text
Authentication

Type
System

Status
In Progress

Purpose
Allow customers to securely identify themselves.

Requirements
✓ Phone number authentication
✓ OTP verification
○ Session expiry

Decisions
• Clerk selected as authentication provider

Dependencies
• User account system

Open Questions
• Should email recovery be supported?

Notes
...
```

---

# 20. Graph Interaction

Users must be able to:

- zoom
- pan
- select nodes
- expand nodes
- collapse nodes
- reposition nodes
- open node details
- add nodes manually
- delete nodes
- edit node titles
- edit descriptions
- change node status

The interface should remain usable as projects become larger.

---

# 21. Graph Views

V1 should provide at least two conceptual views.

## Full Project View

Shows the broader project structure.

Useful for understanding the entire software product.

---

## Focus View

Shows one selected node and its nearby relationships.

Example:

```text
Authentication
      ↓
Phone Auth
      ↓
OTP
   ↙  ↓  ↘
Send Verify Rate Limit
```

This prevents large projects from becoming visually overwhelming.

---

# 22. Progress Tracking

Users mark leaf nodes complete. A node with children is never marked Done
directly — its state derives from what is beneath it. See §46.4.

Example:

```text
OTP Authentication

Send OTP             ✓
Verify OTP           ✓
Rate Limiting        ✓
Error Handling       ✓
Integration Tests    ○

Progress: 80%
```

Higher levels should aggregate progress.

Example:

```text
Authentication    80%
Booking           45%
Search            90%
Payments           0%
```

Project-level progress can then be displayed.

Progress is `resolved descendants / all descendants`, counting every node type.
A Question counts as resolved when Resolved; a Decision when Accepted or
Rejected; everything else when Done. An unresolved question is genuine
outstanding work and is counted.

Progress is computed on read, never stored. See §46.4.

---

# 23. "What Should I Work On Next?"

One major product capability should be helping users determine the next actionable unit of work.

The system should consider:

- incomplete tasks
- dependencies
- blocked tasks
- project priority
- parent requirements

Example:

> Recommended next task: Implement OTP verification endpoint.

Reason:

> OTP sending is complete and verification is required before session creation can be implemented.

This turns the product from passive documentation into an execution tool.

---

# 24. Decision Tracking

Technical and product decisions should be first-class objects.

Example:

```text
Use Clerk for Authentication

Status:
Accepted

Reason:
Clerk provides managed authentication, sessions and React Native support.

Alternatives:
• Auth0
• Firebase Authentication
• Custom authentication

Related system:
Authentication
```

Users should later be able to ask:

> Why did we use Clerk?

And receive an answer based on stored project decisions.

---

# 25. Open Questions

The system should identify ambiguity rather than inventing requirements.

Example:

If a user says:

> Customers should book providers.

Possible unresolved questions include:

```text
Does the provider need to approve bookings?

Are bookings always instant?

Can customers cancel?

Are deposits required?
```

AI may create Question nodes rather than making assumptions.

This is critical.

The product should help the developer discover missing requirements, not confidently fabricate them.

---

# 26. AI Behaviour Requirements

The AI should follow several principles.

## Prefer first principles

Initial decomposition should represent product capabilities rather than frameworks.

Bad:

```text
Booked
├── React
├── Node
├── PostgreSQL
└── Redis
```

Better:

```text
Booked
├── Authentication
├── Discovery
├── Availability
├── Booking
└── Payments
```

Technology decisions should appear later where appropriate.

---

## Separate requirement from implementation

Example:

```text
Requirement
Users authenticate using phone numbers.

Implementation Decision
Use Clerk.
```

These must not be treated as equivalent concepts.

---

## Avoid unnecessary decomposition

The AI should not create hundreds of nodes immediately.

Decomposition should be progressive.

---

## Identify dependencies

When appropriate, the AI should recognise relationships.

Example:

```text
Booking → depends on → Availability
```

---

## Preserve existing decisions

The AI should consider previous decisions before proposing incompatible changes.

---

## Surface contradictions

Example:

Existing decision:

> All bookings are instant.

New requirement:

> Providers must approve every booking.

The system should identify the contradiction.

---

## Never silently assume critical product behaviour

Ambiguity should result in questions or explicitly labelled assumptions.

---

# 27. Core Screens

V1 requires the following primary interfaces.

## Dashboard

Displays existing projects.

Actions:

- create project
- open project
- delete project

---

## New Project

Contains:

```text
Project Name

Describe what you're building

[Generate Project]
```

---

## Project Workspace

Primary application interface.

Suggested layout:

```text
┌───────────────────────────────────────────────┐
│ Project Header                                │
├──────────────┬────────────────┬───────────────┤
│              │                │               │
│ Navigation   │ Graph Canvas   │ Node Details  │
│              │                │               │
│              │                │               │
├──────────────┴────────────────┴───────────────┤
│ AI Project Chat                               │
└───────────────────────────────────────────────┘
```

Exact layout can change during design.

---

# 28. Functional Requirements

## Project Management

**FR-001**\
Users must be able to create a project.

**FR-002**\
Users must be able to provide a natural-language description of the project.

**FR-003**\
Users must be able to reopen previously created projects.

**FR-004**\
Projects must persist between sessions.

---

## Graph Generation

**FR-010**\
The system must generate an initial graph from the project description.

**FR-011**\
The graph must contain one root project node.

**FR-012**\
The AI should generate high-level capabilities before implementation details.

**FR-013**\
Generated nodes must have semantic types.

---

## Graph Interaction

**FR-020**\
Users must be able to select nodes.

**FR-021**\
Users must be able to move nodes.

**FR-022**\
Users must be able to zoom and pan.

**FR-023**\
Users must be able to collapse and expand sections.

**FR-024**\
Users must be able to manually create nodes.

**FR-025**\
Users must be able to edit nodes.

**FR-026**\
Users must be able to delete nodes.

---

## AI Chat

**FR-030**\
Users must be able to chat with AI within a project.

**FR-031**\
The AI must receive relevant graph context.

**FR-032**\
Users must be able to chat about a selected node.

**FR-033**\
The AI must be able to propose changes to the graph.

**FR-034**\
Graph changes proposed by AI must require user approval.

---

## Progress

**FR-040**\
Users must be able to mark tasks as Not Started, In Progress, Blocked or Done.

**FR-041**\
The system must visually distinguish completed nodes.

**FR-042**\
The system should calculate progress for decomposed project sections.

---

## Dependencies

**FR-050**\
Users must be able to create dependency relationships.

**FR-051**\
AI should be able to propose dependency relationships.

**FR-052**\
Dependencies should be visible within the project.

---

## Decisions

**FR-060**\
Users must be able to record implementation decisions.

**FR-061**\
Decisions should store reasoning.

**FR-062**\
Decisions should support alternatives.

**FR-063**\
AI must be able to retrieve existing decisions when answering future questions.

---

# 29. Non-Functional Requirements

## Performance

Graph interaction should feel immediate.

Normal graph interactions should not require AI requests.

AI operations may occur asynchronously from UI interactions, but the product should clearly show when generation is occurring.

---

## Reliability

Project state must persist reliably.

AI generation failure must not corrupt existing graph state.

---

## Explainability

Users should be able to understand why major AI-generated graph changes were proposed.

---

## Control

Users remain the authority over project state.

The AI assists rather than autonomously redesigning the project.

---

# 30. Suggested Technical Model

The exact architecture is not mandated by this PRD, but the product naturally requires several major components.

```text
Frontend
   │
   ↓
Application API
   │
   ├── Project Service
   ├── Graph Service
   ├── AI Orchestration Service
   └── Authentication
            │
            ↓
        Database
```

Possible graph representation:

```text
Project
  │
  ├── Nodes
  │
  ├── Edges
  │
  ├── Conversations
  │
  └── AI Change Proposals
```

A relational database stores nodes and edges. A dedicated graph database is not
necessary for V1.

The database must be Postgres or equivalent: the single-parent rule requires a
partial unique index, the `data` column requires JSON, and progress rollup
requires recursive queries. Technology is settled in §46.12.

---

# 31. Suggested Core Entities

```text
User
Project
Node
Edge
Tag
NodeTag
Conversation
Message
ChangeProposal
```

`Decision` is not a separate entity. Decisions and Questions are node types
sharing the `Node` table, so an edge can point at them exactly as it points at a
System. See §46.3.

`Tag` and `NodeTag` support tagging and highlighting. See §46.7.

---

# 32. AI Structured Output

AI graph generation should ideally return structured output rather than prose.

Nodes are never identified by name. Two nodes can share a title, and a name
cannot distinguish "reference the node that exists" from "create a new one".
Existing nodes are referenced by id; nodes created within the same proposal are
given a temporary `NEW-n` reference.

```json
{
  "nodes_to_create": [
    { "ref": "NEW-1", "title": "Phone Authentication", "type": "system" },
    { "ref": "NEW-2", "title": "Send OTP", "type": "task" }
  ],
  "edges_to_create": [
    { "source": "n_7c2e", "target": "NEW-1", "type": "contains" },
    { "source": "NEW-1",  "target": "NEW-2", "type": "contains" }
  ],
  "explanation": "Passwordless phone OTP requires sending and verifying codes."
}
```

The backend validates every reference before modifying project state, and
re-validates at the moment the user accepts. Application is a single
transaction. See §46.6.

---

# 33. AI Change Proposal Model

A proposed graph change should conceptually contain:

```text
Proposal
│
├── nodes_to_create
├── nodes_to_update
├── nodes_to_delete
├── edges_to_create
├── edges_to_delete
├── explanation
└── affected_nodes
```

The application should display this proposal before committing the change.

---

# 34. V1 Scope

V1 ships in two phases. See §46.1.

## Phase 1 — no AI

A complete working product with no AI in it.

- user accounts
- project creation
- interactive graph
- semantic node types
- manual node creation and editing
- node detail panel
- dependency relationships
- decision nodes
- status tracking
- progress calculation
- tagging, highlighting and filtering
- canvas layout with pinned positions
- next-task recommendation, computed
- deletion with undo
- project persistence

## Phase 2 — AI

- natural-language project descriptions
- AI initial decomposition
- project chat
- contextual node chat
- AI graph change proposals
- graph change approval

---

# 35. Explicit V1 Non-Goals

The following should **not** be required for V1:

- GitHub integration
- automatic code generation
- automatic codebase analysis
- automatic PR creation
- Jira integration
- Linear integration
- VS Code extension
- autonomous development agents
- automatic deployment
- team permissions
- enterprise collaboration
- real-time multiplayer editing
- automatic architecture generation
- complete project-management replacement
- advanced sprint planning
- time tracking
- mobile application

These may become future features but should not delay validation of the core product.

---

# 36. Potential V2 — Codebase Integration

A future version may connect nodes to source code.

Example:

```text
Authentication
      ↓
OTP Verification
      ↓
verifyOtp.ts
```

Nodes could display implementation status such as:

```text
OTP Rate Limiting

Specification        ✓
Implementation       ✓
Unit Tests           ✓
Integration Tests    ○
Documentation        ○
```

The graph would then represent both intended software behaviour and actual implementation.

---

# 37. Potential V2 — GitHub Integration

Possible capabilities:

- connect GitHub repository
- associate commits with nodes
- associate pull requests with nodes
- detect files relevant to nodes
- infer implementation progress
- display implementation history
- identify graph nodes potentially affected by code changes

---

# 38. Potential V2 — Impact Analysis

When requirements change, AI could analyse the graph.

Example:

User:

> Providers must approve bookings.

System:

```text
This change potentially affects:

• Booking status model
• Availability
• Customer notifications
• Provider notifications
• Provider dashboard
• Customer booking UI
```

The user could then approve corresponding project changes.

This could become one of the product's strongest differentiators.

---

# 39. Potential V2 — AI Development Workflow

Eventually a node could become executable by coding agents.

Example:

```text
Task:
Implement OTP rate limiting

Context:
Authentication → Phone Authentication → OTP

Requirements:
• 3 sends per 10 minutes
• Rate limit by phone
• Rate limit by IP
• Return 429 when exhausted

Dependencies:
• Redis
• OTP send endpoint

[Send to Coding Agent]
```

The graph would then become the control plane through which developers coordinate AI-assisted software development.

---

# 40. Success Metrics

V1 should primarily measure whether users receive recurring value from the project graph.

## Activation

Percentage of users who:

1. create a project
2. generate a graph
3. interact with at least one generated node

---

## Decomposition Engagement

Percentage of projects where users decompose at least one initial node further.

This is particularly important because progressive decomposition is the core behaviour being tested.

---

## Graph Modification

Number of:

- AI proposals generated
- AI proposals accepted
- manual node edits
- nodes added

---

## Execution

Percentage of projects where at least one node is marked complete.

---

## Retention

Percentage of users who return to the same project on another day.

This may be the strongest early indicator that the product is becoming genuine project infrastructure rather than a one-time visualisation generator.

---

# 41. North Star Behaviour

The ideal recurring behaviour is:

```text
Developer starts work
        ↓
Opens Project Graph
        ↓
Checks current project state
        ↓
Chooses a node
        ↓
Works on it
        ↓
Updates graph
        ↓
Makes/refines decisions
        ↓
Returns later
```

If users generate a graph once and never return, the product has not solved the intended problem.

---

# 42. Key Product Risks

## Risk 1 — AI creates generic decompositions

If every project produces:

```text
Frontend
Backend
Database
Authentication
Testing
```

the product will not provide enough value.

The decomposition must reflect the actual product domain.

---

## Risk 2 — Graph becomes overwhelming

Large software projects could contain hundreds of nodes.

Mitigations include:

- progressive decomposition
- collapsing sections
- focus mode
- search
- semantic filtering

---

## Risk 3 — Users spend more time organising than building

The product must reduce project-management overhead rather than create additional work.

AI should therefore perform much of the maintenance.

---

## Risk 4 — AI changes project intent

The AI must preserve developer control.

Graph mutations should be explicit and reviewable.

---

## Risk 5 — Becomes another task manager

The differentiator is not task tracking.

The differentiator is:

> AI-assisted decomposition and maintenance of the developer's mental model of the software.

Task completion supports this concept but should not become the entire product.

---

# 43. Product Principles

### Start with intent, not technology

Understand what the software must accomplish before deciding how it is implemented.

### Decompose progressively

Do not overwhelm users with unnecessary detail.

### Preserve context

Past requirements and decisions should inform future conversations.

### Make ambiguity visible

Unknown requirements should become questions.

### Show relationships

Software systems are graphs, not isolated lists.

### Keep humans authoritative

AI proposes; the developer decides.

### Move toward execution

Every level of decomposition should eventually lead to actionable work.

---

# 44. V1 Acceptance Scenario

A successful V1 should support the following complete scenario.

A user enters:

> “I want to build Booked, a marketplace where customers discover independent beauty providers, view their work and availability and book appointments.”

The system generates:

```text
Booked

├── Authentication
├── Discovery
├── Provider Profiles
├── Services
├── Availability
├── Booking
└── Payments
```

The user selects Authentication and says:

> Use passwordless phone OTP.

The system proposes:

```text
Authentication
└── Phone Authentication
    └── OTP
        ├── Send OTP
        ├── Verify OTP
        ├── Rate Limiting
        └── Session Management
```

The user accepts.

The user then says:

> Use Clerk.

The system creates a proposed decision:

```text
Decision:
Use Clerk for authentication
```

The user accepts.

The user marks:

```text
Configure Clerk ✓
Phone number screen ✓
OTP verification screen ✓
```

Authentication progress updates.

The user later asks:

> What should I build next?

The AI recommends an incomplete, unblocked requirement based on the current project graph.

The user closes the application.

When they return later, the graph, decisions, progress and conversation context remain intact.

If the application accomplishes this experience well, V1 has validated the core concept.

---

# 45. Product Definition

Project Graph is:

> **An AI-assisted visual system that turns software ideas into structured, executable project models and continuously maintains that model as the software evolves.**

Its primary purpose is not to draw diagrams.

Its purpose is to help developers move reliably from:

```text
“I want to build this.”
```

to:

```text
“I know exactly what needs to be built next,
why it exists,
what it depends on,
and how close I am to finishing.”
```

---

# 46. Technical Decisions

This section records design decisions resolved after the initial draft, with the
reasoning behind each. Earlier sections have been corrected to agree with it; the
notes below record what changed and why.

---

## 46.1 Build Order — Manual First, AI Second

V1 is built in two phases.

**Phase 1 — Manual.**
The application is a fully working graph tool with no AI. A user can create a
project, create nodes by hand, connect them, edit them, set status, tag them,
view the detail panel and see progress. Everything in the product works without
a single AI call.

**Phase 2 — AI.**
AI generation, project chat, contextual node chat and change proposals are added
on top.

The AI is not given its own way of modifying the graph. It calls the same
create / update / move / delete operations the interface calls. This means the
mutation layer is exercised and correct before any AI touches it, and an AI
change proposal reduces to a list of operations that already exist.

---

## 46.2 Hierarchy Is Stored As Edges

**Corrects §12** — nodes no longer have a `parent_id` field.

Parent/child is a `contains` row in the edges table, identical in form to
`depends_on`, `blocks`, `implements` and `related_to`.

```sql
nodes(id, project_id, title, description, type, status, data, created_at, updated_at)
edges(id, project_id, source_node_id, target_node_id, type)
```

For V1 a node may have only one parent. This is enforced by the database:

```sql
CREATE UNIQUE INDEX one_parent ON edges(target_node_id) WHERE type = 'contains';
```

Rationale:

- Every structural change — create, move, connect, restructure — becomes the
  same kind of operation over one table. Moving a node is a delete plus a create
  on `edges`. This keeps the Phase 2 change-proposal pipeline (§33) to a single
  code path rather than one path for re-parenting and another for everything else.
- "What is connected to this node?" is a single query. It is needed by the detail
  panel (§19), focus view (§21), next-task selection (§23) and future impact
  analysis (§38).
- Shared nodes (§9's graph-not-tree intent) become available later by dropping
  the index. No migration, no query rewrite.

---

## 46.3 All Node Types Share One Table

**Corrects §31** — `Decision` is no longer a separate database entity.

All eight node types (§10) are rows in `nodes`, distinguished by a `type` column.
Type-specific fields live in a JSON `data` column.

| Field | Storage | Reason |
|---|---|---|
| `title`, `description`, `type`, `status` | Columns | Filtered, sorted and queried |
| Decision `reason`, `alternatives` | `data` JSON | Display only |

Rule for placing a new field: **if it is filtered or sorted on, it is a column;
if it is only displayed, it goes in `data`.**

Rationale:

- Decisions and Questions must be connectable by edges (§11's `implements`
  example, §24's related system). One table means one id space, so an edge can
  point at anything without conditional joins.
- Only one type currently carries extra fields. Per-type detail tables would be
  machinery built for a single subtype.

If Decisions later grow richer, promoting `data` into a `decision_details` table
keyed by node id is a contained migration — node ids do not move, so edges, the
canvas and the proposal pipeline are unaffected.

---

## 46.4 Status And Progress Are Two Different Things

**Clarifies §13 and §22.**

`status` is a value the user asserts and is stored on the node.
`progress` is a percentage derived from a node's descendants and is never stored.

**Leaf nodes** (nothing underneath) have a status the user sets freely, and no
percentage.

**Parent nodes** (something underneath) show a percentage. The user may set
Not Started, In Progress or Blocked. **Done is not offered** — a parent reaches
Done only by all of its descendants being resolved.

Progress is `resolved descendants / all descendants`, counting every node type:

| Type | Counts as resolved when |
|---|---|
| Goal, Capability, System, Requirement, Feature, Task | status is `Done` |
| Question | status is `Resolved` |
| Decision | status is `Accepted` or `Rejected` |

An unresolved question is genuine outstanding work and is counted. A rejected
decision has been answered and is counted as resolved.

Derived behaviour:

- A parent that reaches 100% is Done, even if it was marked Blocked.
- Decomposing a node that was marked Done supersedes that status — it becomes a
  parent, and its state is derived from its new children. The interface should
  say so when it happens.
- Progress is computed on read. The entire project graph is loaded to render the
  canvas, so rollups are arithmetic over data already in memory. There is no
  cache to invalidate.

Because adding a Question lowers a parent's percentage, the detail panel should
also show an open-question count separately, so the drop reads as new
information rather than lost work.

---

## 46.5 The Detail Panel Is A Graph Query

**Clarifies §19.**

Most of the node detail panel is not fields on the node. It is other nodes
reached by edges:

| Panel section | Source |
|---|---|
| Title, Type, Purpose | Columns on the node |
| Progress | Computed from descendants |
| Requirements, Decisions, Open Questions | Child nodes, grouped by `type` |
| Dependencies | Nodes reached by `depends_on` edges |

The panel is therefore one row plus everything one hop away, grouped by edge type
and node type.

**Naming:** the purpose field is labelled **Purpose**, not "Goal". `Goal` is a
node type (§10) representing a product-level outcome near the root of the graph.
Reusing the word for a per-node description field would make a Goal node's panel
read "Goal: <something that is not the goal>".

---

## 46.6 AI Change Proposals — Reference Model (Phase 2)

Deferred to Phase 2, recorded here so the approach is not relost.

**Corrects the slug-based example in §32.**

AI output must never identify nodes by name. Two nodes can share a title, and a
name cannot express the difference between "reference the existing node" and
"create a new one".

- The graph is sent to the AI **with node ids**.
- Existing nodes are referenced **by id**.
- Nodes created within the same proposal are given a temporary `NEW-n` reference.

```text
create NEW-1 "Phone Authentication"
create NEW-2 "Send OTP"
put NEW-1 inside 7
put NEW-2 inside NEW-1
```

Every reference is then unambiguous by its shape. Validation before any write:

- every id reference exists and belongs to this project
- every `NEW-n` reference is defined in the same proposal
- no unrecognised references
- no `contains` edge creating a second parent or a cycle

Any failure rejects the entire proposal.

Application rules:

- Re-validate at the moment the user accepts, not only at generation. If a
  referenced node was deleted in between, the proposal is stale and is refused
  rather than applied differently from what was previewed.
- Apply as a single database transaction. Partial application is not possible,
  satisfying §29.

---

## 46.7 Tagging And Highlighting

Phase 1 feature. Delivers the "semantic filtering" mitigation named in Risk 2,
which no section of §34 otherwise provides.

```sql
tags(id, project_id, name, color, priority)
node_tags(node_id, tag_id)
```

A tag is its own row rather than a string on the node, because a tag carries a
colour and a priority, and because renaming a tag must happen in one place rather
than across every node holding it.

Rules:

- A node may carry many tags.
- Tag priority is a per-project ordered list. Where a node carries several tags,
  the canvas highlights it using the highest-priority tag. The detail panel lists
  every tag the node has.
- A tag applies only to the node it is placed on. There is no inheritance.
- A "tag this node and everything beneath it" action writes explicit tag rows for
  each descendant. Nodes added afterwards are not tagged automatically.
- Tags attach to nodes rather than positions, so restructuring preserves them.

Derived capabilities:

- **Filtering.** Showing only nodes carrying a given tag reduces a large graph to
  a workable one. This is the primary mitigation for Risk 2.
- **Tagged progress.** The §46.4 rollup, filtered to tagged nodes, yields
  "MVP is 40% complete" — progress toward a release rather than progress toward
  everything ever added to the graph.

Rationale for explicit tags over inheritance: an inherited tag makes a node's
tags depend on where it sits, so moving a node silently changes them, and the
detail panel cannot explain why a node is highlighted. Explicit rows keep stored
state and displayed state identical.

---

## 46.8 Canvas Layout And Node Positions

Phase 1 feature. Satisfies FR-021.

Positions are stored as nullable columns on the node:

```sql
nodes(..., pos_x REAL NULL, pos_y REAL NULL)
```

A null position means the node is **unpinned** and its position is computed.
A non-null position means the node is **pinned** and stays where the user put it.

Rules:

- Automatic layout computes positions for unpinned nodes from the graph structure.
- Dragging a node writes `pos_x` / `pos_y`, pinning it. Automatic layout treats
  pinned nodes as fixed and arranges the remaining nodes around them.
- Newly created nodes are unpinned and placed near their parent, so a decomposition
  that adds fifteen nodes at once produces a readable result with no manual work.
- A "tidy up" action clears every pin and re-runs layout across the project. It
  discards manual arrangement, so it must be confirmed.

Nothing the user has positioned by hand is ever moved without the user asking.

**Note on storage.** Position is held in real columns rather than the `data` JSON
of §46.3. Dragging writes position continuously, and rewriting a JSON document on
every frame of a drag is materially worse than writing two numeric columns.
Position is also core to every node rather than specific to a type.

---

## 46.9 Deletion

Phase 1 feature. Satisfies FR-026.

Deleting a node deletes everything contained beneath it.

Rules:

- The delete cascades down `contains` edges, removing the node and every
  descendant.
- Every edge touching a deleted node is removed, including edges arriving from
  outside the deleted branch. A `depends_on` edge pointing into a deleted subtree
  cannot survive it, or the canvas would draw arrows to nodes that no longer exist.
- `node_tags` rows for deleted nodes are removed.
- Deletion is confirmed with an explicit count: "This deletes Authentication and
  11 nodes beneath it."
- Deletion is reversible for the session.

**Mechanism.** Deletion is a soft delete: nodes and edges carry a `deleted_at`
timestamp, and undo clears it. This preserves ids, so restoring a branch also
restores the edges that pointed into it from elsewhere. Re-creating deleted rows
instead would assign new ids and silently lose those incoming relationships.

The cost is that every read filters on `deleted_at IS NULL`, which belongs in a
shared query layer rather than being repeated. Soft-deleted rows should be purged
on a schedule so they do not accumulate indefinitely.

---

## 46.10 Relationship Types

**Corrects §11** — `blocks` is no longer a stored relationship type.

V1 stores four edge types:

| Type | Meaning |
|---|---|
| `contains` | Hierarchy. Enforced single-parent and acyclic (§46.2) |
| `depends_on` | This node requires another node before it can proceed |
| `implements` | A Decision realises a Requirement or Feature |
| `related_to` | A connection with no stronger meaning |

**`blocks` is a reading, not a record.** "A blocks B" and "B depends on A" state
the same fact about the same pair of nodes. Storing both would allow one
relationship to exist in two forms, requiring every query to search both
directions and permitting a user to record the same dependency twice without the
application noticing.

A single `depends_on` edge is therefore displayed from both ends:

```text
On Booking's panel        Depends on:  Availability
On Availability's panel   Blocks:      Booking
```

The user keeps whichever word reads naturally from where they are standing.

**Why `depends_on` exists.** It carries three capabilities that `contains` cannot:

1. **Ordering.** §23's recommendation is only meaningful because dependencies
   establish what is startable. Without them the system can identify unfinished
   work but not workable work, which is a list rather than a plan.
2. **Cross-branch impact.** JTBD 4 and §38 ask what a change affects. Affected
   nodes routinely sit in unrelated branches — Notifications under Account
   Management depending on Booking — and no traversal of the hierarchy will
   find them. Following `depends_on` in reverse will.
3. **Meaningful Blocked status.** §13's Blocked is otherwise an assertion with
   nothing behind it. With dependencies it is derivable and explainable.

`depends_on` is also what makes the project a graph rather than an outline. If
containment were the only relationship, the model would be a tree, and §9's
intent along with the §2 critique of mind-mapping tools would not hold.

---

## 46.11 Dependency Cycles

`contains` edges are always acyclic — a node cannot be contained by its own
descendant, and such an edge is rejected.

`depends_on` edges may form cycles, and are permitted.

```text
Booking      → depends on → Availability
Availability → depends on → Payments
Payments     → depends on → Booking
```

Rules:

- The edge is created. The user is not blocked from recording what they are
  thinking.
- Every node participating in a cycle is marked on the canvas as a circular
  dependency, and the detail panel names the other nodes in the loop.
- "What should I work on next" (§23) detects cycles and reports them as a
  finding, rather than silently omitting nodes that can never become startable.

Rationale: a circular dependency is normally a genuine discovery about the design
rather than a mistake in data entry. Surfacing it follows §43's principle of
making ambiguity visible, and matches §25's treatment of unresolved questions —
the product's role is to reveal problems, not to prevent them from being
expressed. Rejecting the edge would hide the finding and interrupt the user
mid-thought.

---

## 46.12 Technology

| Concern | Choice |
|---|---|
| Application framework | Next.js |
| Database | Postgres, via Supabase |
| Authentication | Supabase Auth |
| Query layer | Drizzle |
| Graph canvas | React Flow |
| Automatic layout | dagre or elk, driving React Flow positions |
| Hosting | Vercel |

**Postgres is a requirement, not a preference.** Three decisions in this section
depend on Postgres features:

- §46.2's single-parent rule is a partial unique index (`WHERE type = 'contains'`).
- §46.3's `data` column requires JSONB.
- §46.4's progress rollup walks descendants with a recursive CTE.

Any replacement database must provide all three.

**React Flow** is chosen because nodes render as React components, which is where
most of this product's interface work lives — the §19 detail card, tag colours
(§46.7), status and progress chips (§46.4), and cycle warnings (§46.11). It
provides pan, zoom, selection and dragging directly, and accepts externally
computed positions, which is what §46.8 requires. Cytoscape.js handles larger
graphs better but renders custom node interfaces considerably less well.

---

## 46.13 Next Task Recommendation

Phase 1 feature, computed rather than generated. Satisfies §23 with no AI call.

**Candidates.** A node is a candidate when all of the following hold:

- its status is unresolved, per the mapping in §46.4
- it is a leaf — JTBD 2 asks for the smallest meaningful unit of work
- every node it `depends_on` is resolved

**Ranking.** Candidates are ordered by:

1. tag priority — a node carrying the highest-priority tag first, so MVP work
   outranks work that is not in the MVP (§46.7)
2. how much it unblocks — the number of nodes transitively depending on it,
   descending
3. position in the graph, shallower first, as a tie-break

**Explanation.** The reason is generated from the rule rather than written by a
model:

> Verify OTP — Send OTP is complete, and Session Creation is waiting on this.

**Cycles.** Nodes inside a `depends_on` cycle can never become startable. Per
§46.11 they are reported as a finding rather than silently omitted:

> 3 nodes are in a circular dependency and cannot be started: Booking,
> Availability, Payments.

**Nothing available.** When no candidate exists the system must say which case
applies — everything is done, everything remaining is blocked by unresolved
dependencies, or the only remaining work is inside a cycle. Returning nothing
without explanation is not acceptable.

This capability is testable: for a given graph, the recommended node is a fixed,
assertable value.

---

## 46.14 Still Open — Phase 2

- How much of the graph is packed into AI context, and how (FR-031)
- Conversation scoping — per project, per node, or both (§8.1)
- Analytics instrumentation for the §40 success metrics
