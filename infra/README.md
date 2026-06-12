# Infra

Переменные окружения, примеры конфигурации для деплоя и Nginx.

## Файлы

| Файл | Назначение |
|------|------------|
| `backend.env.example` | Локальная разработка → `backend/.env` |
| `frontend.env.example` | Локальная разработка → `frontend/.env` |
| `backend.env.production.example` | Продакшен backend → `backend/.env` на сервере |
| `frontend.env.production.example` | Prod-сборка frontend → `frontend/.env` перед `npm run build` |
| `nginx/dndtable.http.conf.example` | Nginx **до Certbot** (только HTTP) |
| `nginx/dndtable.conf.example` | Nginx **после** Certbot (SSL вручную; обычно certbot правит сам) |

## Быстрый старт (dev)

```bash
cp infra/backend.env.example backend/.env
cp infra/frontend.env.example frontend/.env
```

## Деплой

Полная инструкция: [DEPLOY.md](../DEPLOY.md) в корне репозитория.

**VPS + Nginx:** [DEPLOY-VPS.md](../DEPLOY-VPS.md) — подробно, с диагностикой.
