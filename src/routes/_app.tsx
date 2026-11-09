import { createFileRoute, Navigate, Outlet } from "@tanstack/react-router";
import { useAts } from "@/lib/ats-store";
import { AppShell } from "@/components/layout/AppShell";

export const Route = createFileRoute("/_app")({
  component: AppLayout,
});

function AppLayout() {
  const { currentUser, authReady } = useAts();
  if (!authReady) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">
        Laddar…
      </div>
    );
  }
  if (!currentUser) return <Navigate to="/login" replace />;
  return (
    <AppShell>
      <Outlet />
    </AppShell>
  );
}
