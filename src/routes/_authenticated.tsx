import { createFileRoute, Outlet, Navigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/_authenticated")({
  component: AuthGate,
});

function hasUnlock(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return (
      localStorage.getItem("manager_unlock") === "true" ||
      localStorage.getItem("cashier_unlock") === "true"
    );
  } catch {
    return false;
  }
}

function AuthGate() {
  const { session, loading } = useAuth();
  // Read device unlock after hydration so server and client markup match.
  const [hydrated, setHydrated] = useState(false);
  const [unlocked, setUnlocked] = useState(false);

  useEffect(() => {
    setUnlocked(hasUnlock());
    setHydrated(true);
  }, []);

  if (!hydrated || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-muted-foreground">
        Loading...
      </div>
    );
  }
  // Offline / unlocked-by-code path: don't wait for network auth.
  if (unlocked) return <Outlet />;
  if (!session) return <Navigate to="/" />;
  return <Outlet />;
}

