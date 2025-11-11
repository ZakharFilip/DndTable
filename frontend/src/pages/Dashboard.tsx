import { Link } from 'react-router-dom';

export default function Dashboard() {
  return (
    <div className="p-6 text-gray-100 bg-gray-950 min-h-screen">
      <h1 className="text-2xl font-semibold mb-4">Главное меню</h1>
      <div className="space-y-2">
        <Link className="text-indigo-400 hover:underline" to="/party/demo">Открыть демо-партию</Link>
      </div>
    </div>
  );
}


