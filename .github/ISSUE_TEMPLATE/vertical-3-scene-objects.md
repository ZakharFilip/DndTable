---
name: "Vertical 3 — Scene & Objects (BE+FE)"
about: Сцены, объекты, компоненты Transform/Shape/Description/Visibility/Grid
title: "[V3][Scene] Реализовать сцены и объекты BE+FE"
labels: ["vertical:scene", "priority:P1", "area:backend", "area:frontend"]
assignees: []
---

## Кратко
CRUD сцен/объектов. Компоненты и их валидация. На FE — редактор с панелями и базовым рендером.

## Область работ
- BE: `backend/src/modules/scenes/`, `backend/src/modules/ecs/`
- FE: `frontend/src/pages/Party.tsx`, `frontend/src/party/*`, `frontend/src/canvas/*`

## Acceptance Criteria
- Можно создать сцену, добавить объект с Transform/Shape, редактировать и удалять
- Базовый рендер на Canvas (rect/circle/image placeholder), инспектор меняет свойства

## Чеклист (Backend)
- [ ] Модели `Scene`, `SceneObject` (parentId?, order, components)
- [ ] Схемы компонент (подтягивать из `@dnd-table/shared`)
- [ ] CRUD: `/parties/:partyId/scenes`, `/scenes/:sceneId/objects`
- [ ] ECS-операции: set/remove component, reorder, parent/child
- [ ] Версия объекта для конфликтов

## Чеклист (Frontend)
- [ ] Shell редактора (Hierarchy, Inspector, Assets, Canvas)
- [ ] Рендер Transform+Shape (rect/circle), selection
- [ ] Инспектор редактирует компоненты и отправляет изменения

## Зависимости
- V2 Parties готов
- Типы/схемы в `@dnd-table/shared`

## Вне скоупа
- Realtime синхронизация (будет V4)

## Тестирование
- [ ] Сценарий: создать сцену → добавить объект → отредактировать → удалить
- [ ] Валидация на сервере (ошибки при неправильных данных)


