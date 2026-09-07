# Structured v0.1 — Build Specification

## 1. Goal

Release the smallest version of Structured that proves the core product idea:

> A user can create a project, break it into a visual hierarchy of nodes, reorganise that hierarchy, and return later without losing their work.

The release is successful if a new user can go from an idea to a persisted project structure without needing any explanation.

---

# 2. Core User Flow

```text
Landing page
    ↓
Sign in / sign up
    ↓
Dashboard
    ↓
Create project
    ↓
Enter project name
    ↓
Project workspace
    ↓
Root node created
    ↓
Add child nodes
    ↓
Edit / delete / move nodes
    ↓
Changes persist
    ↓
Return to dashboard
    ↓
Reopen project
```

This is the complete v0.1 product.

Anything that does not support this flow is out of scope.

---

# 3. Routes

## `/`

Landing page.

Responsibilities:

- Explain what Structured does.
- Provide a CTA to start using Structured.
- Send unauthenticated users to the authentication flow.
- Send authenticated users toward the dashboard.

---

## `/sign-in`

Unified authentication page.

Authentication methods:

- Google
- GitHub
- Email OTP

After successful authentication:

```text
Existing user → /dashboard
New user → onboarding if required → /dashboard
```

For v0.1, onboarding should be extremely small or skipped entirely unless there is information you genuinely need.

---

## `/dashboard`

Shows all projects belonging to the authenticated user.

Minimum UI:

```text
Structured

Your Projects

[ Booking Marketplace ]
[ Structured ]
[ AI Search Engine ]

+ New Project
```

Each project card should show:

- Project name
- Last updated time
- Link to open project

Actions:

- Create project
- Open project
- Delete project

Optional for v0.1:

- Rename project

---

## `/projects/[projectId]`

The main Structured workspace.

This is the actual product.

Minimum UI:

```text
← Projects

Booking Marketplace

                    ┌─────────────────────┐
                    │ Booking Marketplace │
                    └──────────┬──────────┘
                               │
               ┌───────────────┼───────────────┐
               ↓               ↓               ↓
        Authentication       Booking        Payments
             │                 │                │
          SMS OTP         Select service      Stripe
```

The user must be able to manipulate this structure.

---

# 4. Core Features

## Feature 1 — Authentication

### User story

As a user, I want to authenticate so my projects belong to me.

### Required behaviour

The application must know:

```text
Who is the current user?
```

Unauthenticated users should not be able to access:

```text
/dashboard
/projects/*
```

Authenticated users should not be able to access projects belonging to someone else.

### Technical responsibilities

- Configure Clerk.
- Configure `ClerkProvider`.
- Configure Clerk middleware/proxy.
- Protect application routes.
- Retrieve the authenticated `userId` on the server.

---

# 5. Feature 2 — Create Project

### User story

As a user, I want to create a project so I have somewhere to structure my idea.

### UI

Button:

```text
+ New Project
```

Clicking it opens either:

```text
Project name:
[________________]

Cancel     Create
```

or a dedicated page.

For v0.1, a modal is sufficient.

### Behaviour

When the user creates:

```text
"Booking Marketplace"
```

the backend should:

1. Create the project.
2. Associate it with the authenticated user.
3. Create its root node.
4. Redirect to the project workspace.

Example database state:

```text
Project
id: project_123
name: Booking Marketplace
userId: user_123
```

and:

```text
Node
id: node_001
projectId: project_123
name: Booking Marketplace
type: root
```

---

# 6. Feature 3 — List Projects

### User story

As a user, I want to see my projects when I return.

### Behaviour

Dashboard queries:

```text
all projects where project.userId = currentUserId
```

Render each one as a project card.

Empty state:

```text
You don't have any projects yet.

Create your first project
```

---

# 7. Feature 4 — Load Project

### User story

As a user, I want to open an existing project.

### Behaviour

When requesting:

```text
/projects/abc
```

the server must:

1. Authenticate the user.
2. Fetch project `abc`.
3. Verify the project belongs to the user.
4. Fetch its nodes.
5. Fetch its edges.
6. Render the graph.

If the project doesn't exist:

```text
404
```

If it belongs to another user:

```text
404 or forbidden
```

Do not expose someone else's project.

---

# 8. Feature 5 — Add Node

### User story

As a user, I want to break a project into smaller pieces.

Example:

```text
Booking Marketplace
```

User selects it and adds:

```text
Authentication
```

Result:

```text
Booking Marketplace
└── Authentication
```

### Data operation

Create:

```text
Node:
id
projectId
name
```

Then create:

```text
Edge:
sourceNodeId = Booking Marketplace
targetNodeId = Authentication
type = contains
```

The UI should update after creation.

---

# 9. Feature 6 — Add Child Node

Every node can contain another node.

Example:

```text
Booking Marketplace
└── Authentication
```

Add:

```text
Email OTP
```

Result:

```text
Booking Marketplace
└── Authentication
    └── Email OTP
```

This behaviour should work recursively.

There should not be different code for:

```text
root → child
```

and:

```text
child → grandchild
```

They are the same operation:

```text
create node
create contains edge
```

---

# 10. Feature 7 — Rename Node

### User story

As a user, I want to refine my project structure.

Example:

```text
Auth
```

becomes:

```text
Authentication
```

### Behaviour

Update:

```text
node.name
```

The graph should reflect the new name.

---

# 11. Feature 8 — Delete Node

### User story

As a user, I want to remove parts of my structure.

You need to make an explicit product decision.

For v0.1:

> Deleting a node deletes the node and everything underneath it.

Example:

```text
Authentication
├── Google
├── GitHub
└── Email OTP
```

Deleting `Authentication` deletes the complete subtree.

Show a confirmation:

```text
Delete "Authentication"?

This will also delete 3 child nodes.

Cancel    Delete
```

Do not allow deletion of the root node.

The project itself should be deleted through the project-level delete action.

---

# 12. Feature 9 — Move Node

### User story

As a user, I want to reorganise my thinking.

Before:

```text
Booking
└── Email OTP

Authentication
```

Move `Email OTP` to `Authentication`.

After:

```text
Booking

Authentication
└── Email OTP
```

### Backend operation

Your structure uses edges.

Therefore moving a node means:

```text
delete old contains edge
create new contains edge
```

The node itself does not need to be recreated.

### Constraints

A node:

- Cannot become its own parent.
- Cannot be moved beneath one of its descendants.
- Cannot belong to two parents in v0.1.
- Must remain within the same project.

For the first release, use a simple:

```text
Move to:
[ Authentication ▼ ]
```

You do not need drag-and-drop yet.

---

# 13. Feature 10 — Persist Changes

This is mandatory.

Refresh:

```text
/projects/123
```

and the same structure must appear.

This means the database, not React state, is the source of truth.

React state may temporarily represent the UI, but permanent changes must be written to your database.

---

# 14. Data Model

## User

Managed by Clerk.

You primarily need:

```text
clerkUserId
```

---

## Project

```text
Project
-------
id
userId
name
createdAt
updatedAt
```

Relationship:

```text
User
  ↓
many Projects
```

---

## Node

```text
Node
----
id
projectId
name
createdAt
updatedAt
```

Relationship:

```text
Project
  ↓
many Nodes
```

---

## Edge

```text
Edge
----
id
projectId
sourceNodeId
targetNodeId
type
createdAt
```

For v0.1:

```text
type = contains
```

Example:

```text
Project
   ↓ contains
Authentication
   ↓ contains
Email OTP
```

Constraint:

```text
one incoming "contains" edge per node
```

except the root node, which has none.

This preserves a tree structure while keeping your graph architecture extensible later.

---

# 15. Backend Operations

Think of these as the application's core commands.

You need approximately:

```text
createProject(name)

getProjects()

getProject(projectId)

deleteProject(projectId)

createNode(projectId, parentNodeId, name)

renameNode(nodeId, name)

deleteNode(nodeId)

moveNode(nodeId, newParentNodeId)
```

These may eventually become:

- Server Actions
- Route handlers
- Service functions

Do not obsess over the transport mechanism initially.

The important thing is that the domain operations are clear.

---

# 16. Security Rules

Every write operation must verify ownership.

Never trust:

```text
projectId
nodeId
userId
```

simply because the browser sent them.

Example:

```text
moveNode(nodeId, newParentId)
```

should verify:

```text
current authenticated user
    ↓
owns project
    ↓
node belongs to project
    ↓
new parent belongs to same project
    ↓
move is valid
```

The frontend hiding buttons is not authorization.

Authorization belongs on the server.

---

# 17. Frontend Components

Do not design fifty components in advance.

You will probably need something around:

```text
DashboardPage

ProjectCard

CreateProjectDialog

ProjectWorkspace

ProjectGraph

NodeCard

NodeActions

AddNodeDialog

RenameNodeDialog

MoveNodeDialog

DeleteNodeDialog
```

Some of these may eventually merge.

Build components when their responsibility becomes clear.

---

# 18. Graph Rendering

The UI needs to translate:

```text
nodes + edges
```

into a visual hierarchy.

Example input:

```text
Nodes:
A = Booking Marketplace
B = Authentication
C = Payments
D = Email OTP

Edges:
A → B
A → C
B → D
```

Render:

```text
Booking Marketplace
├── Authentication
│   └── Email OTP
└── Payments
```

For the first version, prioritise:

```text
correct structure
```

over:

```text
perfect animations
```

You can improve layout later.

---

# 19. UI States

Every important screen should account for:

## Loading

```text
Loading project...
```

## Empty

```text
You don't have any projects.
```

## Error

```text
Something went wrong.
```

## Saving

For operations where useful:

```text
Saving...
```

## Success

Usually the changed UI itself is sufficient feedback.

Do not add toast notifications for every tiny action.

---

# 20. Error Cases

At minimum handle:

```text
Project not found

Node not found

Unauthorized project access

Project creation failure

Node creation failure

Invalid parent

Attempted cyclic move

Database failure
```

The user should never be left looking at a permanently broken UI with no indication of what happened.

---

# 21. What Is Explicitly NOT In v0.1

Do not implement:

- AI-generated project structures
- AI chat
- Collaboration
- Teams
- Permissions
- Sharing
- Public projects
- Shared nodes
- Multiple parents
- Dependencies
- Comments
- Notifications
- Due dates
- Kanban boards
- Task completion
- Calendar
- File uploads
- Billing
- Subscriptions
- Analytics
- Mobile application
- Native application
- Offline mode
- Templates
- Marketplace
- Version history
- Complex onboarding
- Drag-and-drop unless trivial to add

These are future features.

They are not prerequisites for proving Structured.

---

# 22. Recommended Implementation Order

Do not attempt to build everything simultaneously.

## Phase 1 — Skeleton

- [ ] Landing page exists
- [ ] Authentication works
- [ ] `/dashboard` is protected
- [ ] `/projects/[id]` is protected

---

## Phase 2 — Projects

- [ ] Create `Project` database model
- [ ] Create project
- [ ] List projects
- [ ] Open project
- [ ] Delete project
- [ ] Verify project ownership

At this point:

```text
User
↓
Dashboard
↓
Create project
↓
Open project
```

must work completely.

---

## Phase 3 — Nodes

- [ ] Create `Node` model
- [ ] Create `Edge` model
- [ ] Automatically create root node
- [ ] Add child node
- [ ] Load nodes
- [ ] Load edges
- [ ] Rename node
- [ ] Delete node

At this point the hierarchy works logically even if the visual design is ugly.

---

## Phase 4 — Visual Graph

- [ ] Convert node/edge data into UI graph
- [ ] Display parent-child relationships
- [ ] Make nodes selectable
- [ ] Attach node actions
- [ ] Handle large enough structures gracefully

---

## Phase 5 — Reorganisation

- [ ] Move node
- [ ] Prevent multiple parents
- [ ] Prevent self-parenting
- [ ] Prevent cycles
- [ ] Verify both nodes belong to the same project

---

## Phase 6 — Product Polish

- [ ] Empty dashboard state
- [ ] Loading states
- [ ] Error states
- [ ] Delete confirmations
- [ ] Basic responsive layout
- [ ] Improve node spacing
- [ ] Add project title/header
- [ ] Remove obvious development/debug UI

---

# 23. Definition of Done

Structured v0.1 is ready when this test passes:

### Fresh user

1. Visit Structured.
2. Authenticate.
3. Reach dashboard.
4. Click `New Project`.
5. Create `Build a booking marketplace`.
6. Enter the project.
7. Add `Authentication`.
8. Add `Booking`.
9. Add `Payments`.
10. Add `Email OTP` underneath Authentication.
11. Rename `Email OTP` to `Email verification`.
12. Add another node.
13. Move that node to another parent.
14. Delete a node.
15. Refresh the page.
16. Verify the graph is unchanged.
17. Return to dashboard.
18. Reopen the project.
19. Verify everything still exists.
20. Sign out.
21. Verify the project can no longer be accessed.

If all of those work, you have a releasable product slice.

---

# 24. Development Rule

When working on this release, ask:

> Does this directly help a user create, structure, reorganise, or return to their project?

If no, it probably does not belong in v0.1.

Do not expand scope just because you discover an interesting feature while coding.

Finish the vertical slice first.

---

# 25. Immediate Next Milestone

Given the current state of Structured, the development target should be:

```text
AUTHENTICATED USER
       ↓
   DASHBOARD
       ↓
 CREATE PROJECT
       ↓
 PROJECT WORKSPACE
       ↓
 PERSISTED ROOT NODE
```

Do not start graph manipulation until this entire path works.

Then add:

```text
ADD CHILD
↓
RENAME
↓
DELETE
↓
MOVE
```

one operation at a time.
