import { Link, Outlet, useLocation } from "react-router-dom";
import { MailboxPanel } from "../components/MailboxPanel";

const TITLES: Record<string, string> = {
  "/dashboard": "Главное меню",
  "/profile": "Профиль",
  "/sessions/join": "Присоединиться",
  "/sessions": "Мои сессии",
  "/sessions/create": "Создать сессию",
  "/records": "Записи игр",
};

export function AppShell() {
  const location = useLocation();
  const title = TITLES[location.pathname] ?? "DnD Table";

  return (
    <div className="min-h-screen bg-white text-gray-900">
      <header className="sticky top-0 z-40 flex items-center justify-between gap-4 border-b border-gray-200 bg-white px-4 py-3 shadow-sm">
        <div className="flex items-center gap-3 min-w-0">
          <Link
            to="/dashboard"
            className="text-sm text-indigo-600 hover:text-indigo-700 shrink-0"
          >
            ← Меню
          </Link>
          <h1 className="text-lg font-semibold truncate">{title}</h1>
        </div>
        <MailboxPanel />
      </header>
      <main>
        <Outlet />
      </main>
    </div>
  );
}
