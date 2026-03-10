# Структура БД: состояние сессии (масштабируемая)

База: **MongoDB** (БД `dndTableBD`). Коллекции создаются при первой вставке; скрипт создаёт индексы.

---

## Существующие коллекции (без изменений)

### `users`
| Поле         | Тип     | Описание                    |
|-------------|----------|-----------------------------|
| _id         | ObjectId | PK                          |
| email       | string   | уникальный                  |
| username    | string   | уникальный                  |
| passwordHash| string   |                             |
| avatar      | string   | опционально                 |
| createdAt   | Date     | timestamps                  |
| updatedAt   | Date     | timestamps                  |

### `gamesessions`
| Поле       | Тип      | Описание                    |
|------------|----------|-----------------------------|
| _id        | ObjectId | PK                          |
| name       | string   | название сессии             |
| description| string   | описание                    |
| isPrivate  | boolean  | приватная/публичная         |
| createdBy  | ObjectId | FK → users._id (владелец)   |
| createdAt  | Date     | timestamps                  |
| updatedAt  | Date     | timestamps                  |

---

## Новые коллекции для состояния сессии

### 1. `session_participants` — участники сессии

Связь «многие-ко-многим» между пользователями и игровыми сессиями. Один пользователь может быть в нескольких сессиях; в одной сессии — много участников.

| Поле          | Тип      | Описание |
|---------------|----------|----------|
| _id           | ObjectId | PK       |
| gameSessionId | ObjectId | FK → gamesessions._id |
| userId        | ObjectId | FK → users._id |
| role          | string   | опционально: "gm", "player" и т.д. (расширяемо) |
| joinedAt      | Date     | время входа в сессию |
| meta          | object   | **JSON**: произвольные данные (цвет фишки, курсор, настройки). Новые поля добавляются без смены схемы. |

**Уникальность:** пара `(gameSessionId, userId)` — один пользователь один раз в сессии.

**Индексы:**  
- `(gameSessionId, userId)` — unique (запрос участников сессии + проверка дубликата).  
- `(userId)` — список сессий пользователя.

---

### 2. `table_objects` — объекты на столе

Объекты, лежащие на столе сессии (фишки, токены, карты и т.д.). Тип задаётся полем `type`, специфичные атрибуты — в `props` (JSON), чтобы не менять схему при добавлении новых типов.

| Поле          | Тип      | Описание |
|---------------|----------|----------|
| _id           | ObjectId | PK       |
| gameSessionId | ObjectId | FK → gamesessions._id |
| type          | string   | тип объекта: "chip", "token", "card" и т.д. |
| x             | number   | позиция по X (мировые координаты) |
| y             | number   | позиция по Y (мировые координаты) |
| sortOrder     | number   | опционально: порядок отрисовки (z-order) |
| props         | object   | **JSON**: атрибуты по типу. Примеры: chip → `{ color, radius }`, card → `{ imageId, face }`. Новые типы и поля — только через props. |
| createdAt     | Date     | timestamps |
| updatedAt     | Date     | timestamps |

**Индексы:**  
- `(gameSessionId)` — выборка всех объектов сессии.  
- `(gameSessionId, type)` — фильтр по типу.  
- при необходимости: `(gameSessionId, sortOrder)` для сортировки по слоям.

---

### 3. `session_state` — глобальное состояние сессии (вид, настройки)

Один документ на сессию: камера (pan/zoom), настройки сетки, фон и т.д. Чтобы не раздувать `gamesessions` и не плодить коллекции при добавлении настроек, используем документ с фиксированными полями и `meta` (JSON).

| Поле          | Тип      | Описание |
|---------------|----------|----------|
| _id           | ObjectId | PK       |
| gameSessionId | ObjectId | FK → gamesessions._id, **уникальный** (1:1 с сессией) |
| viewport      | object   | опционально: `{ panX, panY, scale }` — состояние камеры. Можно расширять (например, minScale, maxScale). |
| meta          | object   | **JSON**: прочие настройки (сетка, фон, правила видимости и т.д.). Расширение без смены схемы. |
| updatedAt     | Date     | время последнего обновления состояния |

**Индекс:**  
- `(gameSessionId)` — unique (поиск/обновление состояния по сессии).

---

## Связи между таблицами

```
users
  ↑ createdBy
  |  (1:N)
gamesessions  ←—— session_state (1:1 по gameSessionId)
  |
  ├—— session_participants (N:M через gameSessionId, userId)
  |       ↑ userId
  |       users
  |
  └—— table_objects (1:N по gameSessionId)
```

- **users ↔ gamesessions:** один пользователь создаёт много сессий (`gamesessions.createdBy`).
- **users ↔ gamesessions (участие):** через `session_participants`: у сессии много участников, у пользователя много сессий.
- **gamesessions ↔ table_objects:** у одной сессии много объектов на столе.
- **gamesessions ↔ session_state:** у сессии один документ состояния (вид + meta).

---

## Масштабируемость

1. **Новые типы объектов:** новое значение `type` в `table_objects` и нужные поля в `props`. Схему коллекции не меняем.
2. **Новые поля участника:** пишем в `session_participants.meta`.
3. **Новые настройки сессии/стола:** пишем в `session_state.viewport` (если про камеру/вид) или в `session_state.meta`.
4. **Новые коллекции:** при появлении сущностей (например, чат, логи ходов) добавляются отдельные коллекции с FK на `gameSessionId` и при необходимости на `userId`; индексы — по этим полям.

**Скрипт индексов (готов к выполнению):** `MongoFUCK/create-indexes.js` — создаёт индексы для всех коллекций, включая новые. Коллекции появятся при первой вставке данных приложением; скрипт при необходимости создаст пустую коллекцию при создании индекса.

Запуск (из корня репозитория, при запущенном MongoDB):

```bash
docker exec -i mongodb mongosh -u admin -p passwd --authenticationDatabase admin < MongoFUCK/create-indexes.js
```

Либо подключиться к той же БД, что использует приложение (`dndTableBD`), и выполнить содержимое скрипта в mongosh.
