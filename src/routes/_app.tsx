import { createFileRoute, Navigate, Outlet } from "@tanstack/react-router";
import { useAts } from "@/lib/ats-store";
import { AppShell } from "@/components/layout/AppShell";

export const Route = createFileRoute("/_app")({
  component: AppLayout,
});

function AppLayout() {
  const { currentUser } = useAts();
  if (!currentUser) return <Navigate to="/login" replace />;
  return (
    <AppShell>
      <Outlet />
    </AppShell>
  );
}
