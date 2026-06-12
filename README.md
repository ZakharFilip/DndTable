# DnDTable (MVP)

Виртуальный стол для настольных ролевых игр (2D). Монорепозиторий на npm workspaces:

- **Backend:** Node.js + TypeScript, Express, Socket.IO, MongoDB (Mongoose)
- **Frontend:** React + TypeScript, Vite, TailwindCSS, HTML5 Canvas 2D
- **Shared:** общие типы и схемы (`@dnd-table/shared`, Zod)

Быстрый онбординг: что установить, как запустить, где что лежит.

---

## Требования

- Node.js 18+ (рекомендовано LTS)
- npm (идёт вместе с Node)
- Git
- MongoDB 6+ (локально или в Docker)
- Редактор: VS Code (по желанию)
  - Расширения: TypeScript, TailwindCSS IntelliSense, ESLint

Опционально (позже): MinIO/S3 для ассетов — на MVP используется локальная папка (`ASSETS_DIR`).

---

## Установка

### 1. Клонирование

```bash
git clone <repo_url>
cd DndTable
```

### 2. Переменные окружения

- **Backend:** скопируйте `infra/backend.env.example` → `backend/.env`
  - при необходимости измените `MONGODB_URI`, `SOCKET_CORS_ORIGIN`, `SESSION_SECRET`, `ASSETS_DIR`
- **Frontend:** скопируйте `infra/frontend.env.example` → `frontend/.env`
  - при необходимости измените `VITE_API_BASE`, `VITE_SOCKET_URL`

### 3. Зависимости

Из корня репозитория (устанавливает все workspaces):

```bash
npm install
```

> **Windows PowerShell:** не склеивайте команды через `&&` — выполняйте построчно.

---

## MongoDB

### Вариант A: Docker

Установите [Docker](https://www.docker.com/), затем:

```powershell
docker run -d ^
  --name mongodb ^
  -p 27017:27017 ^
  -e MONGO_INITDB_ROOT_USERNAME=admin ^
  -e MONGO_INITDB_ROOT_PASSWORD=passwd ^
  -e MONGO_INITDB_DATABASE=dndtable ^
  -v dnd_data:/data/db ^
  mongo:6
```

В `backend/.env` укажите URI с учётными данными, например:

```
MONGODB_URI=mongodb://admin:passwd@localhost:27017/dndtable?authSource=admin
```

### Вариант B: локальная установка

Запустите MongoDB Community на `mongodb://localhost:27017` и используйте `MONGODB_URI` из `infra/backend.env.example`.

### Индексы

После первого запуска создайте индексы скриптом `MongoFUCK/create-indexes.js`.

Имя базы в скрипте должно совпадать с именем в `MONGODB_URI` (по умолчанию в примере — `dndtable`). При необходимости поправьте строку `db.getSiblingDB(...)` в скрипте.

```powershell
docker exec -i mongodb mongosh -u admin -p passwd --authenticationDatabase admin < MongoFUCK\create-indexes.js
```

Для локального Mongo без auth:

```powershell
mongosh < MongoFUCK\create-indexes.js
```

---

## Запуск в разработке

Терминал 1 (из корня):

```bash
npm run dev:backend
```

Бэкенд: `http://localhost:4000` (MongoDB должен быть запущен).

Терминал 2 (из корня):

```bash
npm run dev:frontend
```

Фронтенд: `http://localhost:5173`.

Проверка бэкенда:

```
GET http://localhost:4000/health
```

Ожидается ответ `{ ok: true, ... }`.

---

## Скрипты

| Команда | Описание |
|---------|----------|
| `npm run dev:backend` | Backend в dev-режиме (tsx watch) |
| `npm run dev:frontend` | Frontend в dev-режиме (Vite) |
| `npm run build` | Сборка shared → backend → frontend |
| `npm start` | Прод-старт backend (`backend/dist`) |
| `npm test` | Unit-тесты (Vitest, папка `tests/`) |

---

## Технологии

- **Backend:** Express (REST), Socket.IO (realtime), Mongoose, Zod, express-session + connect-mongo, bcrypt, express-validator, multer (аватары)
- **Frontend:** React 19, Vite, TailwindCSS 4, React Router, Socket.IO client, HTML5 Canvas 2D (`TableController`, `CanvasRenderer`)
- **Shared:** `@dnd-table/shared` (типы, ACL, патчи стола), `@dnd-table/scripts-sdk` (заглушка под скрипты)

Редактор партий (`/party/:id`) — задел под PixiJS; основной игровой стол — Canvas 2D на `/sessions/:id`.

---

## Деплой

Пошаговая инструкция для VPS, Docker и PaaS: **[DEPLOY.md](DEPLOY.md)**.

Кратко: `npm run build` → `NODE_ENV=production npm start` (backend). Фронт отдаёт Nginx (`SERVE_STATIC=false`) или сам backend (`SERVE_STATIC=true` для Docker/PaaS). Нужны MongoDB, HTTPS и переменные из `infra/*.production.example`.

---

## Структура репозитория

```
backend/          — REST API + Socket.IO
  modules/
    auth/         — регистрация, вход, сессии
    users/        — профиль, поиск, аватары
    friends/      — друзья и заявки
    inbox/        — входящие уведомления
    gamesessions/ — игровые сессии, объекты стола, патчи, инвайты
    access/       — участники, команды, права (ACL), видимость
    scenes/       — сцены и объекты (данные, задел)
    ecs/          — реестр компонент и операции
    realtime/     — Socket.IO шлюз
  assets/         — загрузка/выдача файлов
  storage/        — MongoDB
  shared/         — health, ошибки, middleware

frontend/
  src/
    app/          — shell, роутинг, guards
    pages/        — Login, Dashboard, Sessions, SessionTable, Profile, Party
    api/          — REST-клиент
    state/        — контекст сессии
    realtime/     — Socket.IO клиент
    tabletop/     — модель стола, рендер, контроллер, синхронизация
    party/        — панели редактора партий (Hierarchy, Inspector, Assets)
    canvas/       — задел под PixiJS-редактор сцен
    components/   — UI-кит и layout

packages/
  shared/         — общие типы и Zod-схемы
  scripts-sdk/    — SDK для скриптов (заглушка)

infra/            — примеры .env, nginx
tests/            — unit-тесты (Vitest)
scripts/          — вспомогательные скрипты (индексы MongoDB)
MongoFUCK/        — скрипт создания индексов MongoDB
Dockerfile        — образ для production
docker-compose.yml — app + mongo для локального/серверного Docker
DEPLOY.md         — инструкция по выкладке на хостинг
TASKS.md          — план по вертикалям MVP
```

В каждом backend-модуле и многих frontend-подпапках есть свой `README.md` с задачами и критериями готовности.

---

## Основные маршруты (frontend)

| Путь | Назначение |
|------|------------|
| `/login`, `/register` | Авторизация |
| `/dashboard` | Главная после входа |
| `/sessions` | Список игровых сессий |
| `/sessions/create`, `/sessions/join` | Создание и присоединение |
| `/sessions/:id` | Виртуальный стол (Canvas) |
| `/party/:id` | Редактор партии (в разработке) |
| `/profile` | Профиль пользователя |
| `/privacy` | Политика конфиденциальности |

---

## Вертикали MVP (порядок)

1. **Auth** — вход/регистрация, серверные сессии
2. **Parties + Friends** — партии, друзья, инвайты
3. **Scene/Objects** — сцены и объекты (данные)
4. **Realtime** — синхронизация через Socket.IO и патчи стола
5. **ACL** — команды, права, видимость объектов (базовый MVP)
6. **Assets** — загрузка и привязка файлов

Детали и статус — в `TASKS.md` и README модулей.

---

## Тесты

```bash
npm test
```

Покрытие: `TableController`, геометрия, история undo/redo, ACL, auth и др. См. `tests/README.md`.

---

## Частые проблемы

- **MongoDB не запущен** — backend не стартует. Проверьте `MONGODB_URI` и что контейнер/сервис работает.
- **CORS / cookies** — `SOCKET_CORS_ORIGIN` на backend и `VITE_*` на frontend должны указывать на тот же origin фронта; запросы идут с `credentials: true`.
- **Windows PowerShell** — выполняйте команды построчно, без `&&`.
- **Порты заняты** — измените `PORT` (backend) или порт Vite (frontend).
- **Индексы** — при дубликатах email/username или медленных запросах убедитесь, что скрипт индексов применён к той же БД, что в `MONGODB_URI`.

---

## Лицензия

MIT
