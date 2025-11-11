# Scenes & Objects

Задача: сцены и объекты с компонентами.

API:
- CRUD `/parties/:partyId/scenes`
- `/scenes/:sceneId/objects` (create/update/delete/move/batch)

Сделать:
- Модели: `Scene`, `SceneObject`
- Компоненты: Transform, Shape, Description, Visibility, Grid
- Валидация компонент (схемы из `@dnd-table/shared`)
- Версия объекта для конфликтов

Готово, когда:
- CRUD сцен и объектов работает
- Данные валидируются и сохраняются

