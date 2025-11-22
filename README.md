# DnDTable (MVP)

Виртуальный стол для настольных ролевых игр (2D). Монорепозиторий:
- Backend: Node.js + TypeScript, Express, Socket.IO, MongoDB (Mongoose)
- Frontend: React + TypeScript, Vite, TailwindCSS (PixiJS для канваса позже)
- Shared: общие типы/схемы (Zod)

Этот файл — быстрый онбординг: что установить, как запустить, где что лежит.

---

## Требования
- Node.js 18+ (рекомендовано LTS)
- npm (идёт вместе с Node)
- Git
- Локальный MongoDB (по умолчанию `mongodb://localhost:27017`)
  - MongoDB Community или Docker-контейнер
- Редактор: VS Code (по желанию)
  - Расширения: TypeScript, TailwindCSS IntelliSense (и ESLint позже)

Опционально (позже):
- MinIO/S3 для ассетов (на MVP используем локальную папку)

---

## Установка проекта

1) Клонирование
```
git clone <repo_url>
cd DnDTable
```

2) Переменные окружения
- Backend:
  - скопируйте `infra/backend.env.example` → `backend/.env`
  - при необходимости отредактируйте `MONGODB_URI`, `SOCKET_CORS_ORIGIN`, `ASSETS_DIR`
- Frontend:
  - скопируйте `infra/frontend.env.example` → `frontend/.env`
  - при необходимости отредактируйте `VITE_API_URL`, `VITE_SOCKET_URL`

3) Установка зависимостей
- Backend (из корня репо):
```
npm install --workspace backend
```
- Frontend:
```
cd frontend
npm install
```

Примечание (Windows PowerShell): не используйте `&&` между командами — запускайте их по одной строке.

Это я пишу, там насёр ещё ебучий, который я видимо не весь помню, вот ещё команды 
npm --workspace backend install express-validator
 
npm --workspace backend install bcrypt
Если команда выше обосрётся(такое может быть), то поменяем эту шелуху на bcryptjs и в коде придётся несколько строк поменять.(npm --workspace backend install bcryptjs
)



npm install async
либо:
npm install express-async-errors 


---
## MongoDB

Теперь пишет не чатик, а я.
Нужно ещё сделать MongoDB.
Нужно скачать Docker https://www.docker.com/
Делаешь там всё что надо, устанавливаешь.

Команды для проверки:
docker --version
docker-compose --version

Затем нужно создать БДшку, команда:

docker run -d ^
  --name mongodb ^
  -p 27017:27017 ^
  -e MONGO_INITDB_ROOT_USERNAME=admin ^
  -e MONGO_INITDB_ROOT_PASSWORD=passwd ^
  -e MONGO_INITDB_DATABASE=dndTableBD ^
  -v dnd_data:/data/db ^
  mongo:6


Потом соззать индексы, всё написанно в файле
docker exec -i mongodb mongosh -u admin -p passwd --authenticationDatabase admin < Путь_к_файлу\DndTable\MongoFUCK\create-indexes.js


## Запуск в разработке

В одном терминале (из корня):
```
npm run dev:backend
```
Бэкенд поднимется на `http://localhost:4000` (MongoDB должен быть запущен).

В другом терминале (из корня или `frontend/`):
```
npm run dev:frontend
```
Фронтенд запустится на `http://localhost:5173`.

Проверка бэкенда:
```
GET http://localhost:4000/health
```
Должен вернуть `{ ok: true, ... }`.

---

## Скрипты
- Запуск бэкенда (dev): `npm run dev:backend`
- Запуск фронтенда (dev): `npm run dev:frontend`
- Сборка:
  - Backend: `npm -w backend run build`
  - Frontend: `npm -w frontend run build`
- Прод-старт бэкенда: `npm start` (использует собранный `backend/dist`)

---

## Технологии
- Backend: Express (REST), Socket.IO (realtime), Mongoose (MongoDB), Zod (валидация), JWT (auth), CORS, dotenv
- Frontend: React + TS, Vite, TailwindCSS, React Router, (PixiJS для Canvas)
- Shared: `@dnd-table/shared` (типы/схемы), `@dnd-table/scripts-sdk` (заглушка под скрипты)

---

## Структура репозитория (кратко)
- `backend/` — сервер
  - `src/modules/auth/` — авторизация (register/login/refresh/logout)
  - `src/modules/users/` — профиль, друзья
  - `src/modules/parties/` — партии, участники, команды, инвайты
  - `src/modules/parties/acl/` — права (ACL)
  - `src/modules/scenes/` — сцены, объекты и компоненты (данные)
  - `src/modules/ecs/` — реестр компонент и операции
  - `src/modules/realtime/` — Socket.IO шлюз (join/applyOperation)
  - `src/assets/` — загрузка/выдача ассетов (локальная папка)
  - `src/storage/` — подключение Mongo и репозитории
  - `src/shared/` — общее (health, ошибки, middleware)
  - В каждом модуле лежит `README.md` с задачами и “готово, когда”
- `frontend/` — клиент
  - `src/app/` — shell и роутинг
  - `src/pages/` — страницы (`Login`, `Dashboard`, `Party`)
  - `src/api/` — REST клиент
  - `src/state/` — состояние (сессия, сцена)
  - `src/realtime/` — клиент Socket.IO
  - `src/party/` — панели редактора (Hierarchy, Inspector, Assets)
  - `src/canvas/` — PixiJS сцена и инструменты
  - В подпапках есть `README.md` с задачами
- `packages/`
  - `shared/` — общие типы/схемы (Zod)
  - `scripts-sdk/` — задел под скрипты (пока заглушка)
- `infra/`
  - пример `.env` для backend/frontend и `README.md`
- Корень:
  - `TASKS.md` — план по вертикалям (MVP, приоритеты и критерии готовности)

---

## Вертикали (MVP, порядок)
1) Auth (BE+FE)
2) Parties (+Friends) (BE+FE)
3) Scene/Objects (BE+FE)
4) Realtime (BE+FE)
5) ACL (BE+FE)
6) Assets (BE+FE)

Детали — в `TASKS.md` и отдельных README модулей.

---

## Частые проблемы
- MongoDB не запущен — бэкенд не стартует. Проверьте `MONGODB_URI`, запустите Mongo.
- CORS/Origins — проверьте `SOCKET_CORS_ORIGIN` и `VITE_*` в `.env`.
- Windows PowerShell — выполняйте команды построчно, без `&&`.
- Порты заняты — измените `PORT` (бэкенд) или порт Vite (фронтенд).

---

## Лицензия
MIT


