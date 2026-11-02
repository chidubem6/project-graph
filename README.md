# Structured

A collaborative system design workspace, in development under the repo name `project-graph`. The goal: describe a system in plain English, have an AI agent map it onto a shared canvas, refine the architecture with collaborators, and generate a technical specification from the result.

## Status

**Built so far:** the foundation.

- Sign-in and route protection with Clerk
- Project create, rename and delete, backed by an authenticated REST API
- PostgreSQL persistence through Prisma
- The editor shell, with a project sidebar and dialogs

**Not built yet:** the real-time canvas, AI generation, starter templates and spec generation. The planned stack for these is Liveblocks, React Flow, Trigger.dev and Vercel Blob.

## Tech stack

Next.js 16, React 19, TypeScript, Tailwind CSS, shadcn/ui, Clerk, Prisma and PostgreSQL.

## Getting started

The app lives in the nested `project-graph/` folder. You need Node.js, a PostgreSQL database and a Clerk application.

```bash
cd project-graph
npm install
cp .env.example .env.local
```

In `.env.local`, set `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` and `CLERK_SECRET_KEY`, and add a `DATABASE_URL` for your database.

Then set up the database and start the app:

```bash
npx prisma generate --config prisma7.config.ts
npx prisma migrate deploy --config prisma7.config.ts
npm run dev
```

The app runs at http://localhost:3000.

## API

All routes require a signed-in user.

| Method | Route | Purpose |
|---|---|---|
| `GET` | `/api/projects` | List projects |
| `POST` | `/api/projects` | Create a project |
| `PATCH` | `/api/projects/:projectId` | Update a project |
| `DELETE` | `/api/projects/:projectId` | Delete a project |

## Documentation

- [Product requirements](docs/Product%20Requirements%20Document.md)
- [Architecture decisions](docs/adr/README.md)
- [Architecture overview](project-graph/context/architecture-context.md)
- [Feature specs](project-graph/context/feature-specs/)
- [Progress tracker](project-graph/context/progress-tracker.md)
