import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useAts } from "@/lib/ats-store";
import { TeamPage } from "@/components/team/TeamPage";

export const Route = createFileRoute("/_app/team")({
  head: () => ({
    meta: [
      { title: "Team – KandSys" },
      { name: "description", content: "Bjud in medarbetare och välj deras roll." },
      { property: "og:title", content: "Team – KandSys" },
      { property: "og:description", content: "Bjud in medarbetare och välj deras roll." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: TeamRoute,
});

function TeamRoute() {
  const { can } = useAts();
  if (!can("manageTeam")) return <Navigate to="/board" search={{ job: "", q: "" }} replace />;
  return <TeamPage />;
}
