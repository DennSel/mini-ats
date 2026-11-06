import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useAts } from "@/lib/ats-store";
import { canAccessAdmin } from "@/lib/ats-logic";
import { AdminPage } from "@/components/admin/AdminPage";

export const Route = createFileRoute("/_app/admin")({
  head: () => ({
    meta: [
      { title: "Admin – KandSys" },
      { name: "description", content: "Användare och organisationer." },
      { property: "og:title", content: "Admin – KandSys" },
      { property: "og:description", content: "Användare och organisationer." },
    ],
  }),
  component: AdminRoute,
});

function AdminRoute() {
  const { currentUser } = useAts();
  if (!canAccessAdmin(currentUser)) return <Navigate to="/board" replace />;
  return <AdminPage />;
}
