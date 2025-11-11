---
name: "Vertical 5 — ACL (BE+FE)"
about: Права GM/Teams/Players, вычисление эффективных разрешений, UI настроек
title: "[V5][ACL] Реализовать систему прав BE+FE"
labels: ["vertical:acl", "priority:P1", "area:backend", "area:frontend"]
assignees: []
---

## Кратко
Матрица разрешений, наследование через команды, оверрайды на игрока. Middleware проверки прав. UI для GM: назначение ролей/команд, базовые права.

## Область работ
- BE: `backend/src/modules/parties/acl/`, интеграция с parties/scenes/realtime
- FE: `frontend/src/party/Permissions/` (страницы/панели)

## Acceptance Criteria
- Действия проверяются единым `PermissionResolver`
- GM может менять права в UI, изменения влияют на API/сокет

## Чеклист (Backend)
- [ ] Cправочник действий: `party.*`, `scene.*`, `object.*`, `asset.*`
- [ ] PermissionResolver: наследование команд, оверрайды игрока
- [ ] Middleware `requirePermission(action, scope)`
- [ ] Включить проверки в чувствительные эндпоинты/сокет-команды

## Чеклист (Frontend)
- [ ] UI для GM: список участников/команд, базовые права (переключатели)
- [ ] Валидация на клиенте (серый/недоступный UI при отсутствии прав)

## Зависимости
- V2 Parties, V4 Realtime

## Вне скоупа
- Сложные правила на уровне отдельных компонентов объекта

## Тестирование
- [ ] Пользователь без права не может выполнить действие
- [ ] GM меняет право → действие становится доступным/недоступным


