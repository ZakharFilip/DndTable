
## ПРИЛОЖЕНИЕ Б

### Б.1 ER-модель информационной базы (текстовое описание)

**Сущность User.** Атрибуты: `_id`, `email` (уникальный), `username` (уникальный), `passwordHash`, `avatar`, `createdAt`, `updatedAt`. Связи: один пользователь может состоять в многих партиях через `PartyMember`; может быть владельцем партий; может иметь дружеские связи.

**Сущность Party.** Атрибуты: `_id`, `name`, `description`, `ownerId` (FK → User), `settings` (объект). Связи: Party 1—* PartyMember; Party 1—* Scene; Party 1—* Team; Party 1—* Asset; Party 1—* AclRule.

**Сущность PartyMember.** Атрибуты: `partyId`, `userId`, `role` ∈ {GM, Player}, `teamId` (опционально). Уникальность пары (partyId, userId).

**Сущность PartyInvite.** Атрибуты: `partyId`, `email` или `invitedUserId`, `status` ∈ {pending, accepted, rejected}, `role`, `createdAt`.

**Сущность Team.** Атрибуты: `partyId`, `name`, `parentTeamId` (самоссылка для иерархии отрядов).

**Сущность Scene.** Атрибуты: `partyId`, `name`, `order`, `settings` (размер сетки, фон). Связи: Scene 1—* SceneObject.

**Сущность SceneObject.** Атрибуты: `sceneId`, `key` (строковый стабильный id клиента), `version`, `parentId`, `order`, `components` (вложенный документ Transform, Shape, Description, Visibility, Grid). Рекурсивная связь parentId → SceneObject.

**Сущность GameSession.** Атрибуты: `_id`, `name`, `createdBy`, `isPrivate`, `description`. Связи: GameSession 1—* TableObject; связь с SessionState для viewport.

**Сущность TableObject.** Атрибуты: `gameSessionId`, `key`, `version`, геометрия и визуальные поля, `components`. Уникальный индекс (gameSessionId, key).

**Сущность Asset.** Атрибуты: `partyId`, `sceneId?`, `storageKey`, `mimeType`, `size`, `uploadedBy`.

**Сущность AclRule.** Атрибуты: `partyId`, `subject` (user/team/role), `action`, `effect` (allow/deny), `resourceScope`.

Кардинальности: удаление Party каскадно логически удаляет или архивирует связанные Scene (политика приложения); физическое каскадное удаление в MongoDB настраивается на уровне сервиса.

### Б.2 Диаграмма вариантов использования (текстовое описание)

**Актор Guest.** Варианты: зарегистрироваться, войти в систему.

**Актор User (аутентифицированный).** Варианты: просмотреть dashboard, редактировать профиль, управлять списком друзей.

**Актор GM.** Включает возможности User. Дополнительно: создать/изменить/удалить партию; пригласить участников; создать сцену; настроить ACL; загрузить ассет; создать игровую сессию; полный CRUD объектов сцены.

**Актор Player.** Включает возможности User. Дополнительно: принять приглашение; открыть сцену или сессию; перемещать разрешённые токены; просматривать видимые объекты.

**Граница системы** охватывает веб-клиент и сервер DnDTable. Внешние системы: браузер, MongoDB, файловое хранилище.

**Связи include:** UC «Редактирование сцены» включает UC «Проверка ACL» и UC «Синхронизация realtime».

**Связи extend:** UC «Конфликт версий» расширяет UC «Применение патча» при несовпадении baseVersion.

### Б.3 Диаграмма компонентов (текстовое описание)

**Компонент React SPA.** Подкомпоненты: Router, страницы Auth/Dashboard/SessionTable, подсистема tabletop (CanvasRenderer, TableController, TableSync, HistoryManager), HTTP-клиент с credentials.

**Компонент Express API.** Подкомпоненты: auth.router, gamesessions.router, errorHandler, session middleware.

**Компонент Socket.IO Gateway.** Обработчики joinTable, table:patch; интеграция с applyTablePatches.

**Компонент Mongoose Models.** User, GameSession, TableObject, SessionState и проектные модели Party, Scene.

**Компонент @dnd-table/shared.** Zod-схемы, типы патчей.

**Компонент FileStorage.** Локальный ASSETS_DIR или адаптер S3 (перспектива эксплуатации).

Интерфейсы: REST JSON между SPA и Express; WebSocket между SPA и Gateway; драйвер MongoDB между Express и БД.

### Б.4 Диаграмма последовательности применения патча (текстовое описание)

**Участники:** ClientA, ClientB, SocketGateway, GameSessionsService, MongoDB.

1. ClientA: пользователь перетаскивает объект → TableController обновляет локальное состояние → TableSync формирует batch ops с baseVersion.
2. ClientA → SocketGateway: emit `table:patch` { tableId, ops }.
3. SocketGateway → GameSessionsService: applyTablePatches(sessionId, ops).
4. GameSessionsService → MongoDB: findOneAndUpdate с фильтром version.
5a. При успехе: MongoDB возвращает документ с version+1; Service формирует AppliedOp[].
5b. При конфликте: запись в conflicts; ack с 409.
6. SocketGateway → ClientA: ack { success, applied, conflicts }.
7. SocketGateway → room table:{id}: emit `table:patchApplied` { applied }.
8. ClientB: обработчик применяет AppliedOp к локальной модели → CanvasRenderer перерисовывает.

Альтернатива: ClientA отправляет POST /api/sessions/:id/patch без сокета; шаги 3–7 аналогичны; broadcast инициируется через getIoInstance().

### Б.5 Диаграмма развёртывания (текстовое описание)

**Узел ClientDevice.** Артефакт: статический bundle React (HTML, JS, CSS). Протокол HTTPS к reverse proxy.

**Узел AppServer.** Артефакт: процесс Node.js (dist/backend). Порты: HTTP 4000, WebSocket upgrade. Зависимости: переменные окружения MONGODB_URI, SESSION_SECRET.

**Узел DatabaseServer.** Артефакт: MongoDB 6 (standalone или replica set). Порт 27017.

**Узел FileStorage.** Каталог ASSETS_DIR на диске AppServer или отдельный MinIO/S3.

**Промышленная конфигурация:** Nginx (TLS, static, proxy_pass) → несколько экземпляров AppServer за балансировщиком; Redis для Socket.IO adapter; MongoDB replica set; отдельный volume для ассетов.

### Б.6 Макет редактора сцены (текстовое описание зон UI)

**Зона Header.** Название сцены/сессии, индикатор syncStatus, кнопки сохранения и выхода.

**Зона Hierarchy (слева).** Дерево объектов с drag-reorder; контекстное меню удаления; фильтр по слоям.

**Зона Canvas (центр).** Игровое поле с сеткой; pan/zoom; выделение; инструменты рисования.

**Зона Inspector (справа).** Поля Transform, Shape, Description, Visibility; привязка image resourceId.

**Зона Toolbar (низ или верх).** Инструменты select, rect, ellipse, text, image; undo/redo; масштаб.

Соответствие маршруту `/session/:sessionId` в развёрнутой версии клиента.
