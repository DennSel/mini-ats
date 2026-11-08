import { createFileRoute } from "@tanstack/react-router";
import { zodValidator, fallback } from "@tanstack/zod-adapter";
import { z } from "zod";
import { BoardPage } from "@/components/board/BoardPage";

const searchSchema = z.object({
  job: fallback(z.string(), "").default(""),
  q: fallback(z.string(), "").default(""),
});

export const Route = createFileRoute("/_app/board")({
  validateSearch: zodValidator(searchSchema),
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { title: "Flöde – KandSys" },
      { name: "description", content: "Kandidater per rekryteringsstadie." },
      { property: "og:title", content: "Flöde – KandSys" },
      { property: "og:description", content: "Kandidater per rekryteringsstadie." },
    ],
  }),
  component: BoardRoute,
});

function BoardRoute() {
  const search = Route.useSearch();
  return <BoardPage job={search.job} q={search.q} />;
}
