import { Link } from "react-router-dom";

export default function GameRecordsPage() {
  return (
    <div className="min-h-screen bg-white text-gray-900 p-6">
      <header className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-gray-900">Записи игр</h1>
        <Link
          to="/dashboard"
          className="text-sm text-indigo-600 hover:text-indigo-700 underline-offset-2 hover:underline"
        >
          Назад в главное меню
        </Link>
      </header>

      <div className="border border-gray-200 rounded-lg p-4 bg-white shadow-sm">
        <p className="text-gray-600">
          Здесь позже появится список сохранённых сессий, логов и отчётов о
          играх.
        </p>
      </div>
    </div>
  );
}

