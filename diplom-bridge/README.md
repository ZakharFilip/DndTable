# Diplom Bridge

Изолированный модуль интеграции с проектом **Diplom**. Основной код партнёрского сайта (`backend/`, `frontend/`) **не изменяется**.

Мост поднимает отдельный HTTP-сервер, проксирует запросы на основной API и через MongoDB временно повышает права служебного бота до **Session Owner** на нужной игровой сессии.

## Зачем нужен мост

На обновлённом сайте партнёра:

- `POST /api/sessions/:id/patch` требует участника сессии и проверяет ACL (`PatchAuthorization`);
- гость в команде **Visitors** по умолчанию **не может** создавать/менять объекты;
- приватные сессии недоступны без участника.

Мост автоматически:

1. Входит служебным пользователем на основной API (cookie-сессия).
2. Перед `full` / `patch` добавляет бота в `session_participants` и команду `session-owner`.
3. Проксирует запрос на основной backend (с Socket.IO broadcast).
4. После запроса снимает бота с сессии (если `AUTO_LEAVE_AFTER_REQUEST=true`).

## Служебный пользователь

На сервере партнёра (из корня репозитория):

```bash
cd /opt/dndtable
npm -w backend run seed:support-bot
```

Ожидаемый вывод:

```
Создан пользователь: aisuppurt@bot.bot.bot (AiSupportBOT), friendCode: 042817
```

или `Обновлён пользователь: ...`, если уже был в БД.

Вход на сайте:

- Email: `AiSuppurt@BOT.BOT.BOT`
- Пароль: `UltraSekretusBotusParolus`

## Запуск моста

```bash
cd diplom-bridge
cp .env.example .env
npm install
npm run dev
```

По умолчанию мост слушает **порт 4010**.

## Настройка Diplom

В `Backend/.env` проекта Diplom:

```env
PARTNER_API_URL=http://localhost:4010
PARTNER_SERVICE_EMAIL=aisuppurt@bot.bot.bot
PARTNER_SERVICE_PASSWORD=UltraSekretusBotusParolus
```

`PARTNER_MONGODB_URI` больше не обязателен — join/leave делает мост.

## API (совместим с клиентом Diplom)

| Метод | Путь | Описание |
|-------|------|----------|
| POST | `/auth/login` | Прокси логина |
| GET | `/auth/me` | Текущий пользователь |
| GET | `/api/sessions` | Мои сессии |
| GET | `/api/sessions/public` | Публичные сессии |
| POST | `/api/sessions/:id/join` | Join + повышение прав |
| POST | `/api/sessions/:id/leave` | Снятие бота с сессии |
| GET | `/api/sessions/:id/full` | Снимок стола |
| POST | `/api/sessions/:id/patch` | Применение patch ops |

Опционально: заголовок `X-Diplom-Bridge-Key` если задан `DIPLOM_BRIDGE_API_KEY`.

## Ограничения

- Модуль не заменяет **сайт-админа** (`*@admin.admin.admin`) — это отдельная роль для панели `/api/admin`.
- Для редактирования столов бот получает права **владельца сессии** (Session Owner team), а не глобального админа сайта.
