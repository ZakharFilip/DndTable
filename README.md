# DnDTable (MVP)\n\nMonorepo: backend (Node+TS+Express+Socket.IO+MongoDB), frontend (React+TS+Vite+Tailwind+PixiJS), shared packages.\n\n## Getting Started\n\n1. Install Node 18+.\n2. Install deps:\n   - Backend deps will be installed after scaffold.\n   - Frontend will be scaffolded via Vite.\n\n### Backend\n- Env file: `backend/.env` (copy from `.env.example`)\n- Dev: `npm run dev:backend`\n- Build: `npm -w backend run build`\n- Start: `npm start`\n\n### Frontend\n- Dev: `npm run dev:frontend`\n\n## Workspaces\n- `backend/` – API, realtime, models, ACL, ECS core\n- `frontend/` – React app\n- `packages/shared/` – shared types & schemas\n- `packages/scripts-sdk/` – future script SDK (stub)\n\n## License\nMIT\n*** End Patch```  }``` ***!
. Как запустить проект локально

Скачайте или распакуйте архив с проектом в удобную папку.

Откройте эту папку в терминале.

Установите зависимости (это одна команда, всё поставится автоматически):

npm install

Запустите локальный сервер разработки:

npm run dev

    Терминал покажет адрес вида http://localhost:5173. Откройте его в браузере — увидите рабочую версию сайта.

Полезные команды

    npm run dev — запустить сайт в режиме разработки (перезапускается сам при каждом изменении файлов).
    npm run build — собрать оптимизированную версию для публикации. Результат появится в папке dist.
    npm run preview — посмотреть собранную версию перед публикацией.
    npm run lint — проверить код на ошибки оформления (может быть полезно, если изменения делает разработчик).
