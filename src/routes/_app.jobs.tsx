import { createFileRoute } from "@tanstack/react-router";
import { JobsPage } from "@/components/jobs/JobsPage";

export const Route = createFileRoute("/_app/jobs")({
  head: () => ({
    meta: [
      { title: "Jobb – KandSys" },
      { name: "description", content: "Hantera organisationens jobb." },
      { property: "og:title", content: "Jobb – KandSys" },
      { property: "og:description", content: "Hantera organisationens jobb." },
    ],
  }),
  component: JobsPage,
});
