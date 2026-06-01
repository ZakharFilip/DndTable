# План по вертикалям (MVP)

Приоритет: Auth → Parties → Scene/Objects → Realtime → ACL → Assets

## Вертикаль 1: Авторизация (BE+FE)
- BE: `/auth/register`, `/auth/login`, `/auth/refresh`, `/auth/logout`, middleware requireAuth
- FE: форма входа, хранение токенов, авто‑refresh, guard роутов
- Готово, когда: можно войти, получить защищённые данные, токены обновляются

## Вертикаль 2: Партии и Друзья (BE+FE)
- BE: CRUD партии, участники, инвайты, базовые команды (teams), друзья
- FE: список партий, создание, приглашения; список друзей
- Готово, когда: можно создать партию, пригласить, присоединиться, видеть друзей

## Вертикаль 3: Сцена и Объекты (BE+FE)
- BE: `Scene`, `SceneObject`, компоненты (Transform, Shape, Description, Visibility, Grid)
- FE: редактор (Hierarchy/Inspector/Canvas), CRUD объектов, базовый рендер
- Готово, когда: объект создаётся/редактируется/рисуется на сцене

## Вертикаль 4: Realtime (BE+FE)
- BE: Socket.IO, joinParty/joinScene, applyOperation, рассылка opApplied
- FE: подключение сокета, получение/применение оповещений
- Готово, когда: 2 клиента видят синхронные изменения

## Вертикаль 5: ACL (BE+FE) — в работе / MVP tabletop
- BE: `backend/src/modules/access/` — команды, grants, `PermissionResolver` / `VisibilityResolver` в `@dnd-table/shared`
- REST: `/api/sessions/:id/access/*`, join, enforcement на `table:patch` + socket session
- FE: Team Settings (header), разрешения объекта в Inspector, `useSessionAccess`
- Готово, когда: действия ограничены правами, UI их меняет (базовый MVP реализован)

## Вертикаль 6: Assets (BE+FE)
- BE: загрузка/раздача файлов, привязка к party/scene, ACL
- FE: загрузчик и выбор картинки в Shape
- Готово, когда: можно загрузить и отрисовать картинку в объекте


