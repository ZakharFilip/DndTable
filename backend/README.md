# Backend модули (обзор)

Цель: REST API + Realtime, MongoDB, валидация и права.

- `modules/auth/` — вход/регистрация, JWT, middleware
- `modules/users/` — профиль, друзья
- `modules/parties/` — партии, участники, инвайты, команды
- `modules/parties/acl/` — права (ACL), PermissionResolver
- `modules/scenes/` — сцены, объекты, компоненты (данные)
- `modules/ecs/` — реестр компонент и операции
- `modules/realtime/` — Socket.IO шлюз (join/applyOperation)
- `assets/` — загрузка/выдача файлов
- `scripts/` — песочница (позже)
- `storage/` — подключение Mongo и репозитории
- `shared/` — общее: health, ошибки, middleware

Смотри README в каждом модуле для задач и статуса.

