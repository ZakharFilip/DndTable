# ECS ядро

Задача: реестр компонент и базовые операции над объектами.

Интерфейсы:
- `ComponentRegistry.register(name, schema)`
- `applyOperation(object, op)`

Сделать:
- Регистрация базовых компонент (Transform, Shape, ...)
- Операции: set/remove component, parent/child, order

Готово, когда:
- Сервер валидирует/применяет операции единообразно

