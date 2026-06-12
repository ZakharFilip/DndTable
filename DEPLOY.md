# Деплой DnDTable

Инструкция по выкладке проекта на хостинг. Репозиторий поддерживает три сценария:

| Сценарий | Когда использовать | Кто отдаёт фронт |
|----------|-------------------|------------------|
| **A. VPS + Nginx** | Полный контроль, свой сервер | Nginx |
| **B. Docker Compose** | Быстрый старт с Mongo в контейнере | Node (`SERVE_STATIC=true`) |
| **C. PaaS** | Railway, Render, Fly.io без ручного Nginx | Node (`SERVE_STATIC=true`) |

Рекомендуется **один публичный домен** для фронта и API — авторизация через cookie-сессии.

---

## Что нужно заранее (вне репозитория)

1. **Домен** и DNS A-запись на IP сервера (для HTTPS).
2. **Сервер** — VPS (Ubuntu 22/24) или аккаунт PaaS.
3. **MongoDB** — [MongoDB Atlas](https://www.mongodb.com/atlas) (проще) или контейнер/локальный инстанс.
4. **SSL** — Let's Encrypt (Certbot на VPS) или встроенный TLS у PaaS.

---

## Переменные окружения

### Backend (`backend/.env`)

Скопируйте шаблон:

```bash
cp infra/backend.env.production.example backend/.env
```

| Переменная | Обязательно | Описание |
|------------|-------------|----------|
| `NODE_ENV` | да | `production` |
| `MONGODB_URI` | да | Строка подключения MongoDB |
| `SESSION_SECRET` | да | Длинная случайная строка (`openssl rand -base64 48`) |
| `SOCKET_CORS_ORIGIN` | да | Публичный URL сайта, напр. `https://yourdomain.com` |
| `SERVE_STATIC` | да | `false` для Nginx, `true` для Docker/PaaS |
| `PORT` | нет | По умолчанию `4000` |
| `TRUST_PROXY` | нет | `1` за Nginx (включается автоматически при `NODE_ENV=production`) |

### Frontend (перед `npm run build`)

```bash
cp infra/frontend.env.production.example frontend/.env
```

| Переменная | Same-origin (рекомендуется) | Отдельный API-домен |
|------------|----------------------------|---------------------|
| `VITE_API_BASE` | пусто | `https://api.yourdomain.com` |
| `VITE_SOCKET_URL` | пусто | `https://api.yourdomain.com` |

При пустых значениях фронт в production обращается к текущему хосту.

---

## Индексы MongoDB

После первого подключения к БД выполните скрипт [MongoFUCK/create-indexes.js](MongoFUCK/create-indexes.js). Имя БД в скрипте — `dndtable` (должно совпадать с `MONGODB_URI`).

**Локальный mongosh:**

```bash
mongosh < MongoFUCK/create-indexes.js
```

**Docker (контейнер `mongo` из docker-compose):**

```bash
docker exec -i dndtable-mongo-1 mongosh < MongoFUCK/create-indexes.js
```

Или скрипт-обёртка (Linux/macOS/Git Bash):

```bash
chmod +x scripts/mongo-create-indexes.sh
./scripts/mongo-create-indexes.sh docker dndtable-mongo-1
```

**MongoDB Atlas:** Network Access → добавьте IP сервера; Database → Connect → URI в `MONGODB_URI`.

---

## Сценарий A: VPS + Nginx + PM2

**Подробная пошаговая инструкция с контрольными точками и диагностикой:** **[DEPLOY-VPS.md](DEPLOY-VPS.md)**.

Ниже — краткая версия. Если что-то не работает, откройте DEPLOY-VPS.md (раздел «Частые ошибки» и «Диагностика»).

### Порядок (важно)

1. MongoDB → env → индексы → `npm run build`
2. PM2 → проверка `curl http://127.0.0.1:4000/health`
3. Nginx **HTTP** (`infra/nginx/dndtable.http.conf.example`) — **не** SSL-конфиг до Certbot
4. Certbot → сменить `SOCKET_CORS_ORIGIN` на `https://...` → `pm2 restart`

### 1. Установка ПО на Ubuntu

```bash
sudo apt update
sudo apt install -y nginx certbot python3-certbot-nginx
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
sudo npm install -g pm2
```

MongoDB — см. [DEPLOY-VPS.md § Шаг 1](DEPLOY-VPS.md#шаг-1-mongodb-на-vps).

### 2. Клонирование и сборка

```bash
sudo mkdir -p /opt/dndtable
sudo chown $USER:$USER /opt/dndtable
git clone <repo_url> /opt/dndtable
cd /opt/dndtable

cp infra/backend.env.production.example backend/.env
cp infra/frontend.env.production.example frontend/.env
nano backend/.env   # MONGODB_URI, SESSION_SECRET, SOCKET_CORS_ORIGIN=http://yourdomain.com, SERVE_STATIC=false

npm install
npm run build
```

### 3. Индексы MongoDB

```bash
mongosh < MongoFUCK/create-indexes.js
```

### 4. Запуск backend

```bash
cd /opt/dndtable
pm2 start ecosystem.config.cjs
pm2 save
pm2 startup
curl -s http://127.0.0.1:4000/health
```

### 5. Nginx (только HTTP, до Certbot)

```bash
sudo cp /opt/dndtable/infra/nginx/dndtable.http.conf.example /etc/nginx/sites-available/dndtable
sudo nano /etc/nginx/sites-available/dndtable   # замените YOUR_DOMAIN
sudo rm -f /etc/nginx/sites-enabled/default
sudo ln -sf /etc/nginx/sites-available/dndtable /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

Не используйте `dndtable.conf.example` (с SSL) до получения сертификата — будет ошибка `cannot load certificate`.

### 6. SSL

```bash
sudo certbot --nginx -d yourdomain.com
```

Затем в `backend/.env`: `SOCKET_CORS_ORIGIN=https://yourdomain.com` и `pm2 restart dndtable-api`.

### 7. Проверка

- `https://yourdomain.com/health` → `{ "ok": true, ... }`
- Регистрация / вход — cookie `dnd.sid` в DevTools
- `/sessions/:id` — Socket.IO в Network
- Аватар в профиле

---

## Сценарий B: Docker Compose

### 1. Подготовка env

```bash
cp infra/backend.env.production.example backend/.env
cp infra/frontend.env.production.example frontend/.env
```

В `backend/.env`:

```env
NODE_ENV=production
SERVE_STATIC=true
SESSION_SECRET=<секрет>
SOCKET_CORS_ORIGIN=http://localhost:4000
```

Для локального теста `SOCKET_CORS_ORIGIN` = URL, с которого открываете браузер.

### 2. Запуск

```bash
docker compose up -d --build
```

Приложение: `http://localhost:4000` (фронт + API в одном контейнере).

### 3. Индексы

```bash
docker exec -i $(docker compose ps -q mongo) mongosh < MongoFUCK/create-indexes.js
```

### 4. Production с доменом

Поставьте перед контейнером Nginx/Caddy с TLS и проксируйте на `127.0.0.1:4000` (включая `/socket.io/`). Обновите `SOCKET_CORS_ORIGIN` на `https://yourdomain.com`.

### Только app (MongoDB Atlas)

```bash
# backend/.env — MONGODB_URI на Atlas
docker compose -f docker-compose.prod.yml up -d --build
```

---

## Сценарий C: PaaS (Railway, Render, Fly.io)

1. Подключите репозиторий, укажите **Dockerfile** или build command: `npm install && npm run build`, start: `npm start`.
2. Задайте env на платформе (см. таблицу backend выше). Обязательно:
   - `NODE_ENV=production`
   - `SERVE_STATIC=true`
   - `MONGODB_URI` (Atlas)
   - `SESSION_SECRET`
   - `SOCKET_CORS_ORIGIN` = публичный URL сервиса
3. Build-time env для Vite: `VITE_API_BASE` и `VITE_SOCKET_URL` оставьте пустыми (same-origin).
4. **Persistent volume** для `/app/backend/uploads/avatars` — иначе аватары пропадут при рестарте.
5. Убедитесь, что платформа поддерживает **WebSocket** (нужен для стола).

---

## Обновление релиза

**VPS:**

```bash
cd /opt/dndtable
git pull
npm install
npm run build
pm2 restart dndtable-api
```

**Docker:**

```bash
git pull
docker compose up -d --build
```

---

## Чеклист перед открытием доступа

- [ ] `SESSION_SECRET` — уникальный, не из примера
- [ ] `MONGODB_URI` — рабочий, IP сервера в whitelist Atlas
- [ ] Индексы MongoDB применены
- [ ] HTTPS включён
- [ ] `SOCKET_CORS_ORIGIN` = точный URL фронта (без `/` в конце)
- [ ] `SERVE_STATIC` согласован с Nginx/Docker
- [ ] Аватары на persistent disk (volume)
- [ ] `/health` отвечает OK
- [ ] Login + cookie + realtime на столе работают

---

## Troubleshooting

### Не сохраняется вход / нет cookie

- Сайт должен быть на **HTTPS** в production (`secure` cookie).
- `SOCKET_CORS_ORIGIN` должен совпадать с origin в браузере.
- Фронт и API на одном домене — проще всего.

### CORS error

Проверьте `SOCKET_CORS_ORIGIN` в `backend/.env`. Не используйте `*` с `credentials: true`.

### WebSocket 502 / realtime не работает

- Nginx: блок `location /socket.io/` с `Upgrade` и `Connection "upgrade"`.
- PaaS: включите WebSocket в настройках сервиса.

### Фронт обращается к localhost:4000

Пересоберите фронт с правильным `frontend/.env` или пустыми `VITE_*` для same-origin:

```bash
npm run build
```

### Аватары пропали после рестарта

Смонтируйте volume на `backend/uploads/avatars` (Docker) или не удаляйте папку на VPS.

### Ошибки bcrypt при Docker build

В Dockerfile уже установлены build-tools. На Alpine-образах может понадобиться `bcryptjs` — см. README.

---

## Архитектура (VPS + Nginx)

```
Браузер
   │ HTTPS
   ▼
Nginx ── / ──────────────► frontend/dist (статика)
   │
   ├── /auth, /api, /health, /avatars ──► Node :4000
   └── /socket.io/ (WebSocket) ─────────► Node :4000
                                              │
                                              ▼
                                         MongoDB
```

Подробнее о структуре проекта: [README.md](README.md).
