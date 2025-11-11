---
name: "Vertical 2 — Parties & Friends (BE+FE)"
about: Партии/участники/инвайты/команды + друзья
title: "[V2][Parties] Реализовать партии и друзей BE+FE"
labels: ["vertical:parties", "priority:P1", "area:backend", "area:frontend"]
assignees: []
---

## Кратко
Создание партии, инвайты участников, базовые команды (teams), список друзей и заявок.

## Область работ
- BE: `backend/src/modules/parties/`, `backend/src/modules/users/`
- FE: `frontend/src/pages/Dashboard.tsx`, `frontend/src/api/`, `frontend/src/state/`

## Acceptance Criteria
- Можно создать партию, пригласить пользователя, принять приглашение
- Видны участники и их роли
- Друзья: отправка, принятие, удаление

## Чеклист (Backend)
- [ ] Модели: `Party`, `Member` (role: GM/Player), `Team` (вложенные), `Invite`
- [ ] CRUD `/parties`, `/parties/:id/members`, `/parties/:id/invites`, `/parties/:id/teams`
- [ ] Users/Friends: `/friends` списки, заявки
- [ ] Валидация входных DTO (zod)
- [ ] Базовые проверки прав: владелец партии = GM

## Чеклист (Frontend)
- [ ] Dashboard: список партий, создание партии
- [ ] UI инвайтов: отправить/принять/отклонить
- [ ] Список друзей: отправить/принять/удалить
- [ ] Навигация в `/party/:id`

## Зависимости
- V1 Auth завершена
- Общие типы/DTO из `@dnd-table/shared`

## Вне скоупа
- Гранулярные ACL (перейдёт в V5)

## Тестирование
- [ ] Сценарий: создать партию → пригласить → принять → участник видит партию
- [ ] Проверка друзей: запрос → принятие → отображение


