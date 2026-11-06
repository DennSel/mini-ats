import { createFileRoute } from "@tanstack/react-router";
import { CandidatesPage } from "@/components/candidates/CandidatesPage";

export const Route = createFileRoute("/_app/candidates")({
  head: () => ({
    meta: [
      { title: "Kandidater – KandSys" },
      { name: "description", content: "Alla sparade kandidater, även vilande." },
      { property: "og:title", content: "Kandidater – KandSys" },
      { property: "og:description", content: "Alla sparade kandidater, även vilande." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: CandidatesPage,
});
