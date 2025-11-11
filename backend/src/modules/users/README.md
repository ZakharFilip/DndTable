# Users & Friends

Задача: профиль пользователя и система друзей.

API:
- GET `/users/me`, PATCH `/users/me`
- GET `/friends`
- POST `/friends/request` { userId }
- POST `/friends/accept` { userId }
- DELETE `/friends/:userId`

Сделать:
- Модель дружбы (двунаправленная связь/заявки)
- Ограничения/валидация, rate limit

Готово, когда:
- Можно отправить запрос, принять, удалить друга
- Профиль редактируется

