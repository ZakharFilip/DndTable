# Realtime

Задача: синхронные изменения через Socket.IO.

События:
- `joinParty` { partyId }
- `joinScene` { partyId, sceneId }
- `applyOperation` { opId, actorId, targetId, type, payload, version }
- `opApplied` (broadcast)

Сделать:
- Авторизация сокета по JWT
- Валидация и ACL операций, запись в БД, рассылка
- Идемпотентность по `opId`

Готово, когда:
- Два клиента видят одни и те же изменения

