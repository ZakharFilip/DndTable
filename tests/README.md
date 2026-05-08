# Tests (optional)

Минимальные unit-тесты на чистые модули. Изолированы от основного проекта:
- лежат целиком в этой папке;
- зависят только от `vitest` (dev-зависимость в корневом `package.json`);
- удаляются вместе с папкой и одной строкой `"test"` в `scripts` корневого `package.json`.

## Запуск

```
npm test
```

## Покрытие

- `HistoryManager.test.ts` — push/undo/redo + сброс redo после нового push.
- `geometry.test.ts` — `getObjectAabb` (chip/rect/повёрнутый), `objectInRect`, round-trip `screenToWorld`/`worldToScreen`.
- `TableController.test.ts` — `wheelZoom` clamping, drag invariant.
- `authPasswordPolicy.test.ts` — `AuthService._isPasswordStrong`.
