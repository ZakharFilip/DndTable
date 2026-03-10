// create-indexes.js

db = db.getSiblingDB("dndTableBD");

db.users.createIndex({ email: 1 }, { unique: true });
db.users.createIndex({ username: 1 }, { unique: true });

// Игровые сессии: по владельцу (мои сессии) и по публичным (список для присоединения)
db.gamesessions.createIndex({ createdBy: 1 });
db.gamesessions.createIndex({ isPrivate: 1, createdAt: -1 });

// Участники сессии: один пользователь — одна запись в сессии; запросы по сессии и по пользователю
db.session_participants.createIndex({ gameSessionId: 1, userId: 1 }, { unique: true });
db.session_participants.createIndex({ userId: 1 });

// Объекты на столе: выборка по сессии и по типу
db.table_objects.createIndex({ gameSessionId: 1 });
db.table_objects.createIndex({ gameSessionId: 1, type: 1 });

// Состояние сессии (вид камеры, настройки): один документ на сессию
db.session_state.createIndex({ gameSessionId: 1 }, { unique: true });

print("✔ Индексы успешно созданы");
