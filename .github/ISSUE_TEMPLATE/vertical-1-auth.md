---
name: "Vertical 1 — Auth (BE+FE)"
about: Регистрация/логин/refresh/logout, guard, хранение токена
title: "[V1][Auth] Реализовать авторизацию BE+FE"
labels: ["vertical:auth", "priority:P1", "area:backend", "area:frontend"]
assignees: []
---

## Кратко
Регистрация/логин, JWT access/refresh, logout. На FE — формы, хранение токена, auto-refresh, guard маршрутов.

## Область работ
- BE: `backend/src/modules/auth/`, `backend/src/shared/`
- FE: `frontend/src/pages/Login.tsx`, `frontend/src/app/`, `frontend/src/api/`, `frontend/src/state/`

## Acceptance Criteria
- Можно зарегистрироваться и войти по email+паролю
- Защищённые API доступны только с access токеном
- Refresh токен обновляет access прозрачно
- FE роуты защищены guard'ом, сессия хранится и восстанавливается

## Чеклист (Backend)
- [ ] Модель `User` (email unique, passwordHash, name?, avatar?)
- [ ] POST `/auth/register` с валидацией
- [ ] POST `/auth/login` (выдача access/refresh)
- [ ] POST `/auth/refresh` (обновление access)
- [ ] POST `/auth/logout` (инвалидация refresh стратегии)
- [ ] Middleware `requireAuth`, `getUserFromReq`
- [ ] Rate limit на `/auth/*`
- [ ] Тесты happy-path + базовые ошибки

## Чеклист (Frontend)
- [ ] Страница `Login` с формой (валидация)
- [ ] API client с авторизационными заголовками
- [ ] Auto-refresh на 401
- [ ] Хранение сессии (store), редиректы/guard
- [ ] UX: ошибки входа/регистрации

## Зависимости
- Общие типы/схемы (`@dnd-table/shared`)
- MongoDB доступен локально

## Вне скоупа
- Соц.логины/SSO
- Сложные политики паролей

## Тестирование
- [ ] Ручной сценарий: register → login → /me → refresh → logout
- [ ] FE: редиректы, недоступность защищённых страниц без токена


