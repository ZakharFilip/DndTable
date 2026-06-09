import { Link, Outlet, useLocation } from "react-router-dom";
import { MailboxPanel } from "../components/MailboxPanel";
import { Avatar } from "../components/Avatar";
import { useSession } from "../state/session";

const TITLES: Record<string, string> = {
  "/dashboard": "Главное меню",
  "/profile": "Профиль",
  "/sessions/join": "Присоединиться",
  "/sessions": "Мои сессии",
  "/sessions/create": "Создать сессию",
};

export function AppShell() {
  const location = useLocation();
  const { user } = useSession();
  const title = TITLES[location.pathname] ?? "DnD Table";
  const showMenuLink = location.pathname !== "/dashboard";

  return (
    <div className="min-h-screen bg-background text-text">
      <header className="sticky top-0 z-40 flex items-center justify-between gap-4 border-b border-border bg-surface/95 backdrop-blur-sm px-4 py-3 shadow-card">
        <div className="flex items-center gap-3 min-w-0">
          {showMenuLink && (
            <Link
              to="/dashboard"
              className="text-sm font-medium text-primary hover:text-primary-hover shrink-0"
            >
              ← Меню
            </Link>
          )}
          <h1 className="text-lg font-semibold truncate text-text">{title}</h1>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <MailboxPanel />
          <Link
            to="/profile"
            className="flex items-center gap-2 text-sm text-text-secondary hover:text-text"
            title="Профиль"
          >
            <Avatar filename={user?.avatar} size={28} />
            <span className="hidden sm:inline max-w-[120px] truncate">
              {user?.username ?? "Профиль"}
            </span>
          </Link>
        </div>
      </header>
      <main>
        <Outlet />
      </main>
    </div>
  );
}
