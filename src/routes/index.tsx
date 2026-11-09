import { createFileRoute, Navigate } from "@tanstack/react-router";
import { AuthLoadingScreen } from "@/components/layout/AuthLoadingScreen";
import { homePathFor } from "@/lib/ats-logic";
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
  const { currentUser, authReady } = useAts();
  if (!authReady) {
    return <AuthLoadingScreen />;
  }
  return <Navigate to={homePathFor(currentUser)} replace />;
}
