// create-indexes.js

db = db.getSiblingDB("dndTableBD");

db.users.createIndex({ email: 1 }, { unique: true });
db.users.createIndex({ username: 1 }, { unique: true });

// Игровые сессии: по владельцу (мои сессии) и по публичным (список для присоединения)
db.gamesessions.createIndex({ createdBy: 1 });
db.gamesessions.createIndex({ isPrivate: 1, createdAt: -1 });

print("✔ Индексы успешно созданы");
