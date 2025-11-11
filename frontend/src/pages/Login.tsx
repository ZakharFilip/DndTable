export default function Login() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-950 text-gray-100">
      <div className="w-full max-w-sm space-y-4">
        <h1 className="text-2xl font-semibold">Вход</h1>
        <form className="space-y-3">
          <input className="w-full rounded border border-gray-700 bg-gray-900 px-3 py-2" placeholder="Email" />
          <input className="w-full rounded border border-gray-700 bg-gray-900 px-3 py-2" placeholder="Пароль" type="password" />
          <button type="button" className="w-full rounded bg-indigo-600 px-3 py-2 hover:bg-indigo-500">
            Войти
          </button>
        </form>
      </div>
    </div>
  );
}


