import { createFileRoute, Navigate, Outlet } from "@tanstack/react-router";
import { useAts } from "@/lib/ats-store";
import { AppShell } from "@/components/layout/AppShell";
import { AuthLoadingScreen } from "@/components/layout/AuthLoadingScreen";

export const Route = createFileRoute("/_app")({
  component: AppLayout,
});

function AppLayout() {
  const { currentUser, authReady } = useAts();
  if (!authReady) {
    return <AuthLoadingScreen />;
  }
  if (!currentUser) return <Navigate to="/login" replace />;
  return (
    <AppShell>
      <Outlet />
    </AppShell>
  );
}
