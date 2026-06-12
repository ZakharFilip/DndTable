# Infra

Переменные окружения, примеры конфигурации для деплоя и Nginx.

## Файлы

| Файл | Назначение |
|------|------------|
| `backend.env.example` | Локальная разработка → `backend/.env` |
| `frontend.env.example` | Локальная разработка → `frontend/.env` |
| `backend.env.production.example` | Продакшен backend → `backend/.env` на сервере |
| `frontend.env.production.example` | Prod-сборка frontend → `frontend/.env` перед `npm run build` |
| `nginx/dndtable.conf.example` | Nginx: статика + proxy API/WebSocket |

## Быстрый старт (dev)

```bash
cp infra/backend.env.example backend/.env
cp infra/frontend.env.example frontend/.env
```

## Деплой

Полная инструкция: [DEPLOY.md](../DEPLOY.md) в корне репозитория.
