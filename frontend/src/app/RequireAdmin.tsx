import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useSession } from "../state/session";
import { Spinner } from "../components/ui";

export function RequireAdmin({ children }: { children: ReactNode }) {
  const { user, isReady } = useSession();

  if (!isReady) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!user?.isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}
