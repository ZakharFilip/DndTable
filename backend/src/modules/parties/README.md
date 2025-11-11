# Parties

Задача: партии, участники, инвайты, команды.

API:
- CRUD `/parties`
- `/parties/:id/members`
- `/parties/:id/invites`
- `/parties/:id/teams`

Сделать:
- Модели: `Party`, `Member` (role: GM/Player), `Team` (вложенные), `Invite`
- Инвайты по email/пользователю

Готово, когда:
- Можно создать партию, приглашать, принимать инвайт
- Участники и команды сохраняются

