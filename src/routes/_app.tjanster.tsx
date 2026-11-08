import { createFileRoute } from "@tanstack/react-router";
import { JobsPage } from "@/components/jobs/JobsPage";

export const Route = createFileRoute("/_app/tjanster")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { title: "Tjänster – KandSys" },
      { name: "description", content: "Hantera organisationens tjänster." },
      { property: "og:title", content: "Tjänster – KandSys" },
      { property: "og:description", content: "Hantera organisationens tjänster." },
    ],
  }),
  component: JobsPage,
});
