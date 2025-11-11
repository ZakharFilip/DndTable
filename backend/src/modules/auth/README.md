# Auth

Задача: регистрация, логин, refresh, logout, защита роутов.

API:
- POST `/auth/register` { email, password, name? }
- POST `/auth/login` { email, password }
- POST `/auth/refresh`
- POST `/auth/logout`

Сделать:
- Модель `User` (email unique, passwordHash, name, avatar?)
- Сервис хеширования пароля (bcrypt)
- Выдача JWT (access/refresh), хранение refresh (в БД или jwt-стратегия)
- Middleware `requireAuth`
- Rate limit на `/auth/*`

Готово, когда:
- Пользователь регистрируется и входит
- `/users/me` отдаёт профиль только с JWT
- refresh обновляет токены прозрачно

