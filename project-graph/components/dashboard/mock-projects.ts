// Temporary fixture so the dashboard shell can be built and reviewed before the
// persistence layer exists. ADR-0001 puts projects in Postgres behind Drizzle;
// this is replaced by an ownership-scoped query in the project-list slice.

export type DashboardProject = {
  id: string
  name: string
  updatedAt: Date
}

const MINUTE = 60 * 1000
const HOUR = 60 * MINUTE
const DAY = 24 * HOUR

export const mockProjects: DashboardProject[] = [
  {
    id: "project_booking_marketplace",
    name: "Booking Marketplace",
    updatedAt: new Date(Date.now() - 12 * MINUTE),
  },
  {
    id: "project_structured",
    name: "Structured",
    updatedAt: new Date(Date.now() - 3 * HOUR),
  },
  {
    id: "project_ai_search_engine",
    name: "AI Search Engine",
    updatedAt: new Date(Date.now() - 6 * DAY),
  },
]
