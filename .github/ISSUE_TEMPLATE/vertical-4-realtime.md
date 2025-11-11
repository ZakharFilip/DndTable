---
name: "Vertical 4 — Realtime (BE+FE)"
about: Socket.IO синхронизация, комнаты party/scene, applyOperation
title: "[V4][Realtime] Реализовать синхронизацию BE+FE"
labels: ["vertical:realtime", "priority:P1", "area:backend", "area:frontend"]
assignees: []
---

## Кратко
Socket.IO: joinParty/joinScene, обработка applyOperation на сервере (валидация, ACL-стаб), рассылка opApplied. На FE — приём и обновление состояния.

## Область работ
- BE: `backend/src/modules/realtime/`, интеграция с scenes/ecs
- FE: `frontend/src/realtime/`, интеграция со store и canvas

## Acceptance Criteria
- Два клиента видят синхронные изменения одного и того же объекта
- Иденпотентность по `opId`, базовая проверка версии объекта

## Чеклист (Backend)
- [ ] Авторизация сокета по JWT
- [ ] Обработка `joinParty`, `joinScene` (комнаты)
- [ ] `applyOperation`: валидация, запись в БД, рассылка `opApplied`
- [ ] Иденпотентность по `opId`, версия объекта

## Чеклист (Frontend)
- [ ] Клиент Socket.IO, повторное соединение
- [ ] Подписка на `opApplied` → обновление store
- [ ] UX: индикатор соединения (по желанию)

## Зависимости
- V3 Scene/Objects готов

## Вне скоупа
- Полный ACL (в V5)

## Тестирование
- [ ] Открыть два клиента → выполнять операции → сравнить состояние
- [ ] Симулировать потерю соединения и повторное подключение


