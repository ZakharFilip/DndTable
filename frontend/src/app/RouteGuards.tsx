import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useSession } from "../state/session";

export function RequireAuth({ children }: { children: ReactNode }) {
  const { user, isReady } = useSession();
  const location = useLocation();

  if (!isReady) {
    return (
      <div className="min-h-screen bg-gray-950 text-gray-100 p-6">
        <div className="text-gray-400">Загрузка...</div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return children;
}

export function RedirectIfAuth({ children }: { children: ReactNode }) {
  const { user, isReady } = useSession();

  if (!isReady) {
    return (
      <div className="min-h-screen bg-gray-950 text-gray-100 p-6">
        <div className="text-gray-400">Загрузка...</div>
      </div>
    );
  }

  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}

