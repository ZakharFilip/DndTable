# Сценарий A: VPS + Nginx + PM2 (подробно)

Пошаговая инструкция для Ubuntu VPS. Краткий обзор других сценариев — в [DEPLOY.md](DEPLOY.md).

Если «всё сделал по инструкции, но не работает» — пройдите **контрольные точки** после каждого шага и раздел [Диагностика](#диагностика-если-не-работает) в конце.

---

## Ваш сервер: kabantable.space

| Параметр | Значение |
|----------|----------|
| Домен | `kabantable.space` |
| IP VPS | `193.233.18.152` |
| DNS | A-запись `kabantable.space` → `193.233.18.152` |
| Путь проекта | `/opt/dndtable` |
| Backend (внутри VPS) | `http://127.0.0.1:4000` |
| Публичный сайт | `https://kabantable.space` |

**Проверка DNS** (должен вернуть `193.233.18.152`):

```bash
dig +short kabantable.space
```

**`backend/.env` на VPS** (после Certbot):

```env
NODE_ENV=production
PORT=4000
MONGODB_URI=mongodb://127.0.0.1:27017/dndtable
SESSION_SECRET=<openssl rand -base64 48>
SESSION_COOKIE_NAME=dnd.sid
SESSION_MAX_AGE_MS=604800000
SOCKET_CORS_ORIGIN=https://kabantable.space
SERVE_STATIC=false
TRUST_PROXY=1
```

До Certbot временно: `SOCKET_CORS_ORIGIN=http://kabantable.space`.

**Nginx** — в конфиге замените `YOUR_DOMAIN` на `kabantable.space`:

```nginx
server_name kabantable.space;
```

**Certbot:**

```bash
sudo certbot --nginx -d kabantable.space
```

**Быстрая проверка после деплоя:**

```bash
curl -s https://kabantable.space/health
# {"ok":true,...}
```

---

## Как устроен деплoy

```
Браузер  →  Nginx (443/80)  →  frontend/dist     (страницы React)
                           └→  Node :4000         (/auth, /api, /health, /avatars, /session-sprites, /socket.io)
                                    └→  MongoDB
```

- **Nginx** отдаёт статику из `frontend/dist` и проксирует API/WebSocket на backend.
- **Backend** (`pm2`) слушает только `127.0.0.1:4000` — снаружи напрямую не нужен.
- **Один домен** для фронта и API — cookie-сессии работают без доп. настроек.

---

## Что нужно до начала

| Требование | Зачем |
|------------|-------|
| VPS с Ubuntu 22.04 или 24.04 | Инструкция под `apt` |
| Домен | HTTPS и cookie `secure` в production |
| DNS A-запись домена → IP VPS | Certbot и доступ по имени |
| SSH-доступ к серверу | Установка и настройка |
| Открыты порты **80** и **443** | Nginx + Let's Encrypt |

Проверка DNS (на своём ПК или на VPS):

```bash
dig +short kabantable.space
# должен вернуть IP вашего VPS
```

Firewall (если включён UFW):

```bash
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw enable
sudo ufw status
```

---

## Шаг 0. Установка базового ПО

```bash
sudo apt update
sudo apt install -y git curl nginx certbot python3-certbot-nginx

curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

node -v    # v20.x
npm -v

sudo npm install -g pm2
```

---

## Шаг 1. MongoDB на VPS

### Ubuntu 22.04 (jammy)

```bash
curl -fsSL https://www.mongodb.org/static/pgp/server-7.0.asc | \
  sudo gpg -o /usr/share/keyrings/mongodb-server-7.0.gpg --dearmor

echo "deb [ arch=amd64,arm64 signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse" | \
  sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list

sudo apt update
sudo apt install -y mongodb-org
```

### Ubuntu 24.04 (noble)

Для 24.04 используйте MongoDB 8.0:

```bash
curl -fsSL https://www.mongodb.org/static/pgp/server-8.0.asc | \
  sudo gpg -o /usr/share/keyrings/mongodb-server-8.0.gpg --dearmor

echo "deb [ arch=amd64,arm64 signed-by=/usr/share/keyrings/mongodb-server-8.0.gpg ] https://repo.mongodb.org/apt/ubuntu noble/mongodb-org/8.0 multiverse" | \
  sudo tee /etc/apt/sources.list.d/mongodb-org-8.0.list

sudo apt update
sudo apt install -y mongodb-org
```

Если `E: Unable to locate package mongodb-org` — неверный codename в `.list` (см. `lsb_release -cs`).

### Запуск MongoDB

```bash
sudo systemctl start mongod
sudo systemctl enable mongod
sudo systemctl status mongod
```

**Контрольная точка:**

```bash
mongosh --eval "db.runCommand({ ping: 1 })"
# { ok: 1 }
```

---

## Шаг 2. Клонирование проекта

```bash
sudo mkdir -p /opt/dndtable
sudo chown $USER:$USER /opt/dndtable

git clone <URL_ВАШЕГО_РЕПО> /opt/dndtable
cd /opt/dndtable

npm install
```

---

## Шаг 3. Переменные окружения

### Backend

```bash
cp infra/backend.env.production.example backend/.env
nano backend/.env
```

Пример для **локального MongoDB** (до HTTPS):

```env
NODE_ENV=production
PORT=4000
MONGODB_URI=mongodb://127.0.0.1:27017/dndtable
SESSION_SECRET=ВСТАВЬТЕ_СЛУЧАЙНУЮ_СТРОКУ
SESSION_COOKIE_NAME=dnd.sid
SESSION_MAX_AGE_MS=604800000
SOCKET_CORS_ORIGIN=http://kabantable.space
SERVE_STATIC=false
TRUST_PROXY=1
```

Сгенерировать секрет:

```bash
openssl rand -base64 48
```

**Важно:**

- `SOCKET_CORS_ORIGIN` — **точный** origin в браузере: протокол + домен, **без** `/` в конце.
- До Certbot: `http://kabantable.space`. **После** Certbot — смените на `https://kabantable.space` и перезапустите PM2.
- `SERVE_STATIC=false` — фронт отдаёт Nginx, не Node.

### Frontend (перед сборкой)

```bash
cp infra/frontend.env.production.example frontend/.env
```

Для одного домена (рекомендуется) оставьте **пустым**:

```env
VITE_API_BASE=
VITE_SOCKET_URL=
```

Пустые значения = запросы на тот же хост, с которого открыт сайт.

---

## Шаг 4. Индексы MongoDB

```bash
cd /opt/dndtable
mongosh < MongoFUCK/create-indexes.js
```

**Контрольная точка:**

```bash
mongosh dndtable --eval "db.users.getIndexes()"
# должен быть unique index на email
```

---

## Шаг 5. Сборка

```bash
cd /opt/dndtable
npm run build
```

Предупреждения про `woff2` и размер chunk — **не ошибка**, если в конце есть `✓ built`.

**Контрольная точка:**

```bash
test -f frontend/dist/index.html && echo "OK: frontend собран"
test -f backend/dist/server.js && echo "OK: backend собран"
```

---

## Шаг 6. Запуск backend (PM2)

```bash
cd /opt/dndtable
pm2 start ecosystem.config.cjs
pm2 save
pm2 startup
# выполните команду, которую выведет pm2 startup (sudo env PATH=...)
```

PM2 запускает `backend/dist/server.js` с рабочей папкой `backend/`, чтобы подхватился `backend/.env`.

**Контрольная точка:**

```bash
curl -s http://127.0.0.1:4000/health
# {"ok":true,...}

pm2 logs dndtable-api --lines 20
# Connected to MongoDB
# DnD Backend listening on port 4000
```

Если health не отвечает:

```bash
pm2 logs dndtable-api --err --lines 50
cat backend/.env
mongosh --eval "db.runCommand({ ping: 1 })"
```

---

## Шаг 7. Nginx (только HTTP — до Certbot)

**Не копируйте** `dndtable.conf.example` с SSL до получения сертификата — Nginx упадёт с ошибкой про `/etc/letsencrypt/live/YOUR_DOMAIN/...`.

### 7.1. Подготовить конфиг

```bash
sudo cp /opt/dndtable/infra/nginx/dndtable.http.conf.example /etc/nginx/sites-available/dndtable
sudo nano /etc/nginx/sites-available/dndtable
```

Замените **оба** `YOUR_DOMAIN` на ваш домен, например:

```nginx
server_name dnd.example.com;
```

Проверьте путь:

```nginx
root /opt/dndtable/frontend/dist;
```

### 7.2. Включить сайт, отключить default

```bash
sudo rm -f /etc/nginx/sites-enabled/default
sudo ln -sf /etc/nginx/sites-available/dndtable /etc/nginx/sites-enabled/dndtable
sudo nginx -t
sudo systemctl reload nginx
```

**Контрольная точка** (с VPS):

```bash
curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1/
# 200

curl -s http://127.0.0.1/health
# {"ok":true,...}
```

С вашего ПК в браузере: `http://kabantable.space` — должна открыться страница входа.

---

## Шаг 8. SSL (Certbot)

```bash
sudo certbot --nginx -d kabantable.space
```

Certbot добавит HTTPS и редирект с HTTP. Следуйте подсказкам (email, согласие).

**После Certbot обязательно:**

```bash
nano /opt/dndtable/backend/.env
```

Измените:

```env
SOCKET_CORS_ORIGIN=https://kabantable.space
```

```bash
pm2 restart dndtable-api
```

Без HTTPS в `SOCKET_CORS_ORIGIN` вход и API после Certbot **не будут работать** (CORS + secure cookie).

**Контрольная точка:**

```bash
curl -s https://kabantable.space/health
# {"ok":true,...}
```

В браузере: `https://kabantable.space` — замок в адресной строке.

---

## Шаг 9. Финальная проверка

| Проверка | Ожидание |
|----------|----------|
| `https://kabantable.space` | Страница Login |
| `https://kabantable.space/health` | JSON `{ "ok": true }` |
| Регистрация / вход | В DevTools → Application → Cookies есть `dnd.sid` |
| `/sessions` после входа | Список сессий |
| Стол `/sessions/:id` | Объекты двигаются; в Network есть WebSocket `/socket.io/` |
| Профиль → аватар | Загрузка и отображение |

---

## Частые ошибки (что упускают)

### 1. Nginx: `cannot load certificate ... YOUR_DOMAIN`

Скопировали SSL-конфиг **до** Certbot. Решение: используйте [dndtable.http.conf.example](infra/nginx/dndtable.http.conf.example), затем `certbot --nginx`.

### 2. `YOUR_DOMAIN` не заменён

В конфиге Nginx должно быть реальное имя, не плейсхолдер.

### 3. `SOCKET_CORS_ORIGIN` не совпадает с URL в браузере

| Открываете | Должно быть в `.env` |
|------------|----------------------|
| `http://site.ru` | `http://site.ru` |
| `https://site.ru` | `https://site.ru` |
| `https://www.site.ru` | `https://www.site.ru` |

Без `www` и с `www` — **разные** origin. Выберите один и настройте DNS + Nginx + CORS одинаково.

### 4. Забыли сменить CORS на `https://` после Certbot

Симптом: сайт открывается, login/API — CORS error или нет cookie.

### 5. Backend не читает `.env`

Файл должен быть `backend/.env`, не корневой `.env`. PM2 через [ecosystem.config.cjs](ecosystem.config.cjs) стартует из папки `backend/`.

### 6. MongoDB не запущен

```bash
sudo systemctl status mongod
pm2 logs dndtable-api
# часто: MongoServerSelectionError
```

### 7. Не применены индексы

Регистрация может падать или тормозить. Выполните `mongosh < MongoFUCK/create-indexes.js`.

### 8. Фронт стучится в `localhost:4000`

Пересоберите с пустым `frontend/.env`:

```bash
cd /opt/dndtable
npm run build
sudo systemctl reload nginx
```

### 9. HTTPS показывает «Welcome to nginx!», а HTTP работает

**Причина:** порт **443** обслуживает сайт `default`, а не `dndtable`. Certbot мог повесить SSL на default, или default не отключили до/после certbot.

**Исправление на VPS** (для kabantable.space):

```bash
# 1. Посмотреть, кто слушает 443
sudo nginx -T 2>/dev/null | grep -E "listen 443|server_name"

# 2. Отключить дефолтный сайт
sudo rm -f /etc/nginx/sites-enabled/default

# 3. Проверить, что сертификат уже есть
sudo certbot certificates
# должна быть строка Certificate Name: kabantable.space

# 4. Поставить полный конфиг (HTTP редирект + HTTPS + ваше приложение)
sudo cp /opt/dndtable/infra/nginx/dndtable.kabantable.conf.example /etc/nginx/sites-available/dndtable
sudo ln -sf /etc/nginx/sites-available/dndtable /etc/nginx/sites-enabled/dndtable

# 5. Если сертификата ещё нет:
# sudo certbot certonly --nginx -d kabantable.space

sudo nginx -t
sudo systemctl reload nginx
```

**Проверка:**

```bash
curl -sI https://kabantable.space | head -5
curl -s https://kabantable.space/health
# не должно быть HTML «Welcome to nginx»
```

Затем в `backend/.env`: `SOCKET_CORS_ORIGIN=https://kabantable.space` и `pm2 restart dndtable-api`.

### 10. Конфликт `default` site в Nginx

```bash
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl reload nginx
```

### 11. Порт 4000 закрыт снаружи — это нормально

Backend только на localhost; снаружи нужны 80/443.

---

## Диагностика: если не работает

Выполните на VPS и сохраните вывод:

```bash
echo "=== DNS ==="
dig +short kabantable.space

echo "=== Mongo ==="
systemctl is-active mongod
mongosh --eval "db.runCommand({ ping: 1 })"

echo "=== Backend ==="
pm2 status
curl -s http://127.0.0.1:4000/health

echo "=== Nginx ==="
sudo nginx -t
curl -s -o /dev/null -w "HTTP %{http_code}\n" http://127.0.0.1/
curl -s http://127.0.0.1/health

echo "=== Build ==="
ls -la /opt/dndtable/frontend/dist/index.html
ls -la /opt/dndtable/backend/dist/server.js

echo "=== Env (без секретов) ==="
grep -E '^(NODE_ENV|PORT|MONGODB_URI|SOCKET_CORS_ORIGIN|SERVE_STATIC)=' /opt/dndtable/backend/.env | sed 's/MONGODB_URI=.*/MONGODB_URI=***/'

echo "=== PM2 logs ==="
pm2 logs dndtable-api --lines 30 --nostream
```

### Симптом → причина

| Симптом | Что проверить |
|---------|----------------|
| Белая страница | `frontend/dist/index.html`, `npm run build`, логи Nginx `sudo tail /var/log/nginx/error.log` |
| Картинки на столе не грузятся / белый экран после DnD | в Nginx должен быть блок `location /session-sprites/` **до** `location /`; `curl -I https://ВАШ_ДОМЕН/session-sprites/<sessionId>/<file>` → `Content-Type: image/*`, не `text/html` |
| 404 на `/session-sprites/...` | Nginx уже проксирует на backend, но файла нет на диске: `find /opt/dndtable/backend -path '*session-sprites*' -type f`; `pm2 logs` → строка `Session sprites dir:`; проверка `curl -I http://127.0.0.1:4000/session-sprites/<sessionId>/<file>` |
| 502 Bad Gateway на `/api` или `/health` | `pm2 status`, `curl 127.0.0.1:4000/health` |
| CORS в консоли | `SOCKET_CORS_ORIGIN` = exact origin |
| Login не держится | HTTPS + `https://` в CORS; cookie `dnd.sid` в DevTools |
| WebSocket failed | блок `location /socket.io/` в Nginx |
| `nginx -t` failed | SSL-пути / опечатка в `server_name` |

---

## Обновление после `git pull`

```bash
cd /opt/dndtable
git pull
npm install
npm run build
pm2 restart dndtable-api
sudo nginx -t && sudo systemctl reload nginx
```
sudo systemctl reload nginx

После обновления nginx-конфига убедитесь, что есть отдельный блок `location /session-sprites/` **перед** `location /` (иначе браузер получит `index.html` вместо JPEG).

---

## Порядок шагов (шпаргалка)

```
0. apt: node, nginx, certbot, pm2
1. MongoDB install + start
2. git clone + npm install
3. backend/.env + frontend/.env
4. mongosh < create-indexes.js
5. npm run build
6. pm2 start + curl 127.0.0.1:4000/health
7. nginx HTTP config (http.conf.example) + nginx -t
8. certbot --nginx
9. SOCKET_CORS_ORIGIN=https://... + pm2 restart
10. проверка login + socket
```

---

См. также: [DEPLOY.md](DEPLOY.md) (сценарии B/C), [README.md](README.md) (разработка локально).
