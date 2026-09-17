import type { Project } from "@/types/project"

// Stand-in data until projects are persisted. Owned projects are the ones the
// signed-in user can rename and delete; shared projects are read-only here.
export const MY_PROJECTS: Project[] = [
  { id: "prj_checkout", name: "Checkout Platform", slug: "checkout-platform" },
  { id: "prj_ingest", name: "Event Ingest Pipeline", slug: "event-ingest-pipeline" },
  { id: "prj_search", name: "Search Service", slug: "search-service" },
]

export const SHARED_PROJECTS: Project[] = [
  { id: "prj_billing", name: "Billing Rewrite", slug: "billing-rewrite" },
  { id: "prj_identity", name: "Identity Provider", slug: "identity-provider" },
]
