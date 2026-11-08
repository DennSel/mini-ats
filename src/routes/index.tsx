import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useAts } from "@/lib/ats-store";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { title: "KandSys" },
      { name: "description", content: "KandSys – hantera tjänster och kandidater." },
      { property: "og:title", content: "KandSys" },
      { property: "og:description", content: "KandSys – hantera tjänster och kandidater." },
    ],
  }),
  component: Index,
});

function Index() {
  const { currentUser } = useAts();
  return <Navigate to={currentUser ? "/board" : "/login"} replace />;
}
