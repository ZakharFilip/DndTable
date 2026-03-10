import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { createSession } from "../api/sessions";

export default function CreateSessionPage() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isPrivate, setIsPrivate] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await createSession({ name, description, isPrivate });
      navigate("/sessions");
    } catch (err: unknown) {
      const msg = err && typeof err === "object" && "response" in err
        ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
        : "Не удалось создать сессию";
      setError(msg || "Не удалось создать сессию");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white text-gray-900 p-6">
      <header className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-gray-900">Создать сессию</h1>
        <Link
          to="/sessions"
          className="text-sm text-indigo-600 hover:text-indigo-700 underline-offset-2 hover:underline"
        >
          Назад к списку сессий
        </Link>
      </header>

      <form onSubmit={handleSubmit} className="border border-gray-200 rounded-lg p-4 bg-white shadow-sm max-w-xl">
        {error && (
          <p className="mb-4 text-red-600 text-sm">{error}</p>
        )}
        <div className="mb-4">
          <label htmlFor="session-name" className="block text-sm font-medium text-gray-700 mb-1">
            Название
          </label>
          <input
            id="session-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-3 py-2 rounded border border-gray-300 bg-white text-gray-900"
            placeholder="Название сессии"
            required
          />
        </div>
        <div className="mb-4">
          <label htmlFor="session-description" className="block text-sm font-medium text-gray-700 mb-1">
            Описание
          </label>
          <textarea
            id="session-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
            className="w-full px-3 py-2 rounded border border-gray-300 bg-white text-gray-900"
            placeholder="Описание сессии"
          />
        </div>
        <div className="mb-4 flex items-center gap-2">
          <input
            id="session-private"
            type="checkbox"
            checked={isPrivate}
            onChange={(e) => setIsPrivate(e.target.checked)}
            className="rounded border-gray-300 text-indigo-600"
          />
          <label htmlFor="session-private" className="text-sm font-medium text-gray-700">
            Приватная сессия (не показывать в списке для присоединения)
          </label>
        </div>
        <button
          type="submit"
          disabled={loading}
          className="px-4 py-2 rounded bg-indigo-600 text-white hover:bg-indigo-500 disabled:opacity-50"
        >
          {loading ? "Создание…" : "Создать"}
        </button>
      </form>
    </div>
  );
}
