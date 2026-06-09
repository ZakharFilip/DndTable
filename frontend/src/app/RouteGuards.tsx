import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useSession } from "../state/session";
import { Spinner } from "../components/ui";

function AuthLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <Spinner size="lg" />
    </div>
  );
}

export function RequireAuth({ children }: { children: ReactNode }) {
  const { user, isReady } = useSession();
  const location = useLocation();

  if (!isReady) {
    return <AuthLoading />;
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return children;
}

export function RedirectIfAuth({ children }: { children: ReactNode }) {
  const { user, isReady } = useSession();

  if (!isReady) {
    return <AuthLoading />;
  }

  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}
