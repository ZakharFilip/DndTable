import { Link } from "react-router-dom";

export default function JoinSessionPage() {
  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 p-6">
      <header className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Присоединиться к сессии</h1>
        <Link
          to="/dashboard"
          className="text-sm text-indigo-400 hover:text-indigo-300 underline-offset-2 hover:underline"
        >
          Назад в главное меню
        </Link>
      </header>

      <div className="border border-gray-800 rounded-lg p-4 bg-gray-900/60">
        <p className="text-gray-400">
          Здесь позже будет список доступных сессий с фильтрами и поиском.
        </p>
      </div>
    </div>
  );
}

