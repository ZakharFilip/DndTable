import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSession } from "../state/session";
import { logout } from "../api/auth";

export default function Dashboard() {
  const navigate = useNavigate();
  const { clearSession } = useSession();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const handleLogout = () => {
    setShowLogoutConfirm(true);
  };

  const confirmLogout = async () => {
    try {
      await logout();
    } catch {
      // If request fails, still clear local state. Cookie will expire naturally or be cleared on next server call.
    } finally {
      clearSession();
      setShowLogoutConfirm(false);
      navigate("/login", { replace: true });
    }
  };

  const cancelLogout = () => {
    setShowLogoutConfirm(false);
  };

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 flex items-center justify-center">
      <div className="w-full max-w-md border border-gray-800 rounded-xl bg-gray-900/80 p-6 shadow-lg">
        <h1 className="text-2xl font-semibold mb-6 text-center">
          Главное меню
        </h1>

        <div className="space-y-3">
          <button
            type="button"
            onClick={() => navigate("/sessions/join")}
            className="w-full px-4 py-2 rounded-md bg-indigo-600 hover:bg-indigo-500 text-sm font-medium transition-colors"
          >
            Присоединиться
          </button>

          <button
            type="button"
            onClick={() => navigate("/sessions/create")}
            className="w-full px-4 py-2 rounded-md bg-indigo-600 hover:bg-indigo-500 text-sm font-medium transition-colors"
          >
            Создать сессию
          </button>

          <button
            type="button"
            onClick={() => navigate("/records")}
            className="w-full px-4 py-2 rounded-md bg-gray-800 hover:bg-gray-700 text-sm font-medium transition-colors"
          >
            Записи игр
          </button>

          <button
            type="button"
            onClick={() => navigate("/profile")}
            className="w-full px-4 py-2 rounded-md bg-gray-800 hover:bg-gray-700 text-sm font-medium transition-colors"
          >
            Профиль
          </button>

          <button
            type="button"
            onClick={handleLogout}
            className="w-full px-4 py-2 rounded-md bg-red-600 hover:bg-red-500 text-sm font-medium transition-colors mt-2"
          >
            Выйти
          </button>
        </div>
      </div>

      {showLogoutConfirm && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/60">
          <div className="w-full max-w-sm rounded-lg bg-gray-900 border border-gray-800 p-5">
            <h2 className="text-lg font-semibold mb-3">
              Выйти из аккаунта?
            </h2>
            <p className="text-sm text-gray-400 mb-5">
              Вы уверены, что хотите выйти из аккаунта? Вас перенесёт на
              страницу авторизации.
            </p>

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={cancelLogout}
                className="px-4 py-2 rounded-md bg-gray-800 hover:bg-gray-700 text-sm"
              >
                Отмена
              </button>
              <button
                type="button"
                onClick={confirmLogout}
                className="px-4 py-2 rounded-md bg-red-600 hover:bg-red-500 text-sm font-medium"
              >
                Выйти
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

