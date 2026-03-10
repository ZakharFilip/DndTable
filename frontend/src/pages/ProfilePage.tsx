import { Link } from "react-router-dom";
import { useSession } from "../state/session";

export default function ProfilePage() {
  const { user } = useSession();

  return (
    <div className="min-h-screen bg-white text-gray-900 p-6">
      <header className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-gray-900">Профиль</h1>
        <Link
          to="/dashboard"
          className="text-sm text-indigo-600 hover:text-indigo-700 underline-offset-2 hover:underline"
        >
          Назад в главное меню
        </Link>
      </header>

      <div className="border border-gray-200 rounded-lg p-4 bg-white shadow-sm max-w-xl space-y-3">
        {user ? (
          <>
            <div>
              <div className="text-sm text-gray-500">Никнейм</div>
              <div className="text-lg font-medium text-gray-900">{user.username}</div>
            </div>
            <div>
              <div className="text-sm text-gray-500">Почта</div>
              <div className="text-gray-900">{user.email}</div>
            </div>
          </>
        ) : (
          <p className="text-gray-600">
            Данные пользователя недоступны. Попробуйте войти в аккаунт ещё раз.
          </p>
        )}
      </div>
    </div>
  );
}

