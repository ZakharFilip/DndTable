// frontend/src/state/session.ts
import React, {
  createContext,
  useContext,
  useState,
  type ReactNode,
} from "react";

interface User {
  id: string;
  email: string;
  username: string;
  avatar?: string;
}

interface SessionContextValue {
  token: string | null;
  user: User | null;
  setSession: (token: string, user: User) => void;
  clearSession: () => void;
}

const SessionContext = createContext<SessionContextValue | undefined>(undefined);

export const SessionProvider = ({ children }: { children: ReactNode }) => {
  const [token, setToken] = useState<string | null>(localStorage.getItem("token"));

  const [user, setUser] = useState<User | null>(() => {
    const raw = localStorage.getItem("user");
    if (!raw) return null;
    try {
      return JSON.parse(raw) as User;
    } catch {
      return null;
    }
  });

  const setSession = (t: string, u: User) => {
    localStorage.setItem("token", t);
    localStorage.setItem("user", JSON.stringify(u));
    setToken(t);
    setUser(u);
  };

  const clearSession = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setToken(null);
    setUser(null);
  };

  return (
    <SessionContext.Provider value={{ token, user, setSession, clearSession }}>
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