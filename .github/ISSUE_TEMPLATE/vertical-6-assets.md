---
name: "Vertical 6 — Assets (BE+FE)"
about: Загрузка/раздача ассетов, привязка к объектам (Shape image)
title: "[V6][Assets] Реализовать работу с ассетами BE+FE"
labels: ["vertical:assets", "priority:P2", "area:backend", "area:frontend"]
assignees: []
---

## Кратко
Хранение ассетов в локальной папке (MVP), API загрузки и выдачи, ACL. На FE — загрузчик и выбор картинки в Shape.

## Область работ
- BE: `backend/src/assets/`, интеграция с scenes/objects
- FE: `frontend/src/party/Assets/`, интеграция с инспектором Shape

## Acceptance Criteria
- Файл можно загрузить, получить его URI и использовать как image-ресурс объекта
- ACL не позволяет доступ к чужим ассетам

## Чеклист (Backend)
- [ ] POST `/assets` (multipart), GET `/assets/:id`
- [ ] Хранение метаданных (тип, размер, владелец/partyId/sceneId)
- [ ] Адаптер локального диска (`ASSETS_DIR`)
- [ ] ACL проверка доступа

## Чеклист (Frontend)
- [ ] Панель Assets: загрузка, список, превью
- [ ] Инспектор: выбрать asset для Shape (kind = image)
- [ ] Обновление Canvas с новым ресурсом

## Зависимости
- V3 Scene/Objects, V5 ACL

## Вне скоупа
- S3/MinIO (можно позже подменить адаптер)

## Тестирование
- [ ] Загрузка файла → появляется в списке → привязка к объекту → отображение
- [ ] Доступ к ассету другим пользователем без прав запрещён


