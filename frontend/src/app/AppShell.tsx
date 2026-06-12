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
    <div className="ui-zoom min-h-screen bg-background text-text">
      <header
        className="sticky top-0 z-40 flex items-center justify-between gap-4 px-4 py-0 min-h-[52px] shadow-card"
        style={{
          background: "var(--ds-color-chrome)",
          backdropFilter: "blur(12px)",
          borderBottom: "1px solid var(--ds-color-structure-muted)",
        }}
      >
        <div className="flex items-center gap-3 min-w-0">
          {showMenuLink && (
            <Link
              to="/dashboard"
              className="text-sm font-medium text-primary hover:text-primary-hover shrink-0 transition-colors duration-150"
            >
              ← Меню
            </Link>
          )}
          <h1 className="font-display text-lg font-semibold truncate text-text tracking-tight">
            {title}
          </h1>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <MailboxPanel />
          <Link
            to="/profile"
            className="flex items-center gap-2 text-sm text-text-secondary hover:text-text transition-colors duration-150 rounded-[var(--ds-radius-md)] px-2 py-1 hover:bg-[var(--ds-color-base-subtle)]"
            title="Профиль"
          >
            <Avatar filename={user?.avatar} size={28} />
            <span className="hidden sm:inline max-w-[120px] truncate font-body">
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
