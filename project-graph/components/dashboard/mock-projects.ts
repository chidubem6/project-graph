// Temporary fixture so the dashboard shell can be built and reviewed before the
// persistence layer exists. ADR-0001 puts projects in Postgres behind Drizzle;
// this is replaced by an ownership-scoped query in the project-list slice.
//
// Note `description`: the build spec's Project model is only id/name/userId, so
// the schema slice needs a column adding for this to survive.

export type DashboardProject = {
  id: string
  name: string
  description: string
}

export const mockProjects: DashboardProject[] = [
  {
    id: "project_booking_marketplace",
    name: "Booking Marketplace",
    description:
      "Two-sided marketplace where customers book time with local service providers.",
  },
  {
    id: "project_structured",
    name: "Structured",
    description:
      "Turns a product description into a graph of goals, capabilities and tasks.",
  },
  {
    id: "project_ai_search_engine",
    name: "AI Search Engine",
    description:
      "Semantic search over internal documents with cited, grounded answers.",
  },
  {
    id: "project_habit_tracker",
    name: "Habit Tracker",
    description:
      "Daily streaks and reminders, with a weekly review that surfaces what slipped.",
  },
  {
    id: "project_invoice_portal",
    name: "Invoice Portal",
    description:
      "Clients view, download and settle invoices without a support round trip.",
  },
  {
    id: "project_team_wiki",
    name: "Team Wiki",
    description:
      "Internal docs that stay current because they are owned, dated and reviewed.",
  },
]
