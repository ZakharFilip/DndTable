# Деплой diplom-bridge на production (kabantable.space)

Инструкция для **администратора сервера партнёра**. Меняется только папка `diplom-bridge` и конфигурация окружения/файрвола/nginx.

## Что делает мост

Diplom (http://130.49.213.33) обращается к мосту по HTTP. Мост:

1. Логинится служебным пользователем `aisuppurt@bot.bot.bot`
2. Временно повышает его до Session Owner на выбранном столе
3. Применяет patch через основной backend
4. Отключает бота от стола

## Шаг 1. Служебный пользователь (один раз)

Из корня репозитория DndTable на сервере:

```bash
cd /opt/dndtable
npm -w backend run seed:support-bot
```

Ожидаемый вывод: `Создан пользователь` или `Обновлён пользователь` для `aisuppurt@bot.bot.bot`.

## Шаг 2. Файл `.env` моста

```bash
cd /opt/dndtable/diplom-bridge
cp .env.production.example .env
nano .env
```

Обязательно проверьте:

| Переменная | Значение |
|------------|----------|
| `MAIN_API_URL` | `https://kabantable.space` (не `http://localhost:4000`) |
| `MONGODB_URI` | та же строка, что в `backend/.env` |
| `DIPLOM_BRIDGE_BIND` | `0.0.0.0` |
| `DIPLOM_BRIDGE_PORT` | `4010` |

Почему не `localhost:4000`: в production backend выставляет session-cookie с флагом `Secure`. При HTTP к localhost cookie не сохраняются — мост не сможет авторизоваться (ошибка `UNAUTHORIZED` на `/api/sessions`).

## Шаг 3. Установка и запуск

```bash
cd /opt/dndtable/diplom-bridge
npm install
pm2 start ecosystem.config.cjs
pm2 save
```

Проверка на сервере:

```bash
curl -s http://127.0.0.1:4010/health
curl -s http://127.0.0.1:4010/health/deep
```

`/health/deep` должен вернуть `"ok": true` и `serviceUserId`. Если `"ok": false` — смотрите поле `error` и логи `pm2 logs diplom-bridge`.

## Шаг 4. Доступ снаружи (для Diplom)

**Вариант A — по IP и порту (уже работает, проще):**

Откройте порт `4010` в файрволе (если закрыт):

```bash
sudo ufw allow 4010/tcp
```

Diplom указывает: `PARTNER_API_URL=http://193.233.18.152:4010`

**Вариант B — через домен (опционально):**

Добавьте в nginx конфиг сайта фрагмент из `deploy/nginx-bridge.conf.example`, перезагрузите nginx.

Diplom указывает: `PARTNER_API_URL=https://kabantable.space/diplom-bridge`

## Шаг 5. Обновление кода моста

```bash
cd /opt/dndtable
git pull   # или скопируйте папку diplom-bridge
cd diplom-bridge
npm install
pm2 restart diplom-bridge
curl -s http://127.0.0.1:4010/health/deep
```

## Диагностика

| Симптом | Решение |
|---------|---------|
| `/health` OK, `/health/deep` 503 | Неверный `MAIN_API_URL`, пароль бота или `MONGODB_URI` |
| `UNAUTHORIZED` на API сессий | `MAIN_API_URL` должен быть `https://kabantable.space` |
| Diplom не достучится | Откройте порт 4010 или настройте nginx |
| Patch forbidden | Запустите `seed:support-bot`, проверьте MongoDB моста |

## Безопасность (опционально)

Задайте одинаковый ключ в `.env` моста и на Diplom:

```
DIPLOM_BRIDGE_API_KEY=длинная_случайная_строка
```

На Diplom: `PARTNER_BRIDGE_API_KEY=та_же_строка`
