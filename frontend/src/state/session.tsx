// frontend/src/state/session.ts
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { me } from "../api/auth";

interface User {
  id: string;
  email: string;
  username: string;
  avatar?: string;
}

interface SessionContextValue {
  user: User | null;
  isReady: boolean;
  setUser: (user: User) => void;
  clearSession: () => void;
  refreshSession: () => Promise<void>;
}

const SessionContext = createContext<SessionContextValue | undefined>(undefined);

export const SessionProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUserState] = useState<User | null>(null);
  const [isReady, setIsReady] = useState(false);

  const setUser = (u: User) => {
    setUserState(u);
  };

  const clearSession = () => {
    setUserState(null);
  };

  const refreshSession = async () => {
    try {
      const resp = await me();
      if (resp?.success && resp?.data?.user) {
        setUserState(resp.data.user as User);
      } else {
        setUserState(null);
      }
    } catch {
      setUserState(null);
    } finally {
      setIsReady(true);
    }
  };

  useEffect(() => {
    void refreshSession();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const value = useMemo(
    () => ({ user, isReady, setUser, clearSession, refreshSession }),
    [user, isReady]
  );

  return (
    <SessionContext.Provider value={value}>
      {children}
    </SessionContext.Provider>
  );
};

SessionProvider.displayName = "SessionProvider";

export const useSession = (): SessionContextValue => {
  const ctx = useContext(SessionContext);
  if (!ctx) {
    throw new Error("useSession must be used within SessionProvider");
  }
  return ctx;
};