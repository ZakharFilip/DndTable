import { Link } from "react-router-dom";
import { useSession } from "../state/session";

export default function ProfilePage() {
  const { user } = useSession();

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 p-6">
      <header className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Профиль</h1>
        <Link
          to="/dashboard"
          className="text-sm text-indigo-400 hover:text-indigo-300 underline-offset-2 hover:underline"
        >
          Назад в главное меню
        </Link>
      </header>

      <div className="border border-gray-800 rounded-lg p-4 bg-gray-900/60 max-w-xl space-y-3">
        {user ? (
          <>
            <div>
              <div className="text-sm text-gray-400">Никнейм</div>
              <div className="text-lg font-medium">{user.username}</div>
            </div>
            <div>
              <div className="text-sm text-gray-400">Почта</div>
              <div>{user.email}</div>
            </div>
          </>
        ) : (
          <p className="text-gray-400">
            Данные пользователя недоступны. Попробуйте войти в аккаунт ещё раз.
          </p>
        )}
      </div>
    </div>
  );
}

