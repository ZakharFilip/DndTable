# ACL (права)

Задача: проверка прав на действия (GM/Teams/Players + overrides).

Интерфейсы:
- `can(userId, action, scope): boolean`
- Действия: `party.*`, `scene.*`, `object.*`, `asset.*`

Сделать:
- Матрица разрешений, наследование от команд, оверрайды на игрока
- Middleware `requirePermission(action, scope)`

Готово, когда:
- Любой API/сокет вызов проходит единый чек прав

