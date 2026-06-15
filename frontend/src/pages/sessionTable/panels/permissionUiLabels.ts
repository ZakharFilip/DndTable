import type { Permission } from "@dnd-table/shared";

export const PERM_LABELS: Record<Permission, string> = {
  MoveObject: "Перемещение",
  CreateObject: "Создание",
  DeleteObject: "Удаление",
  ModifyVisibility: "Видимость",
  ModifyPermissions: "Права",
  ModifyTransform: "Трансформ",
  ChangeObjectProperties: "Свойства",
};

export const GRANT_UI_LABELS = {
  Undefined: "—",
  Allow: "Разрешить",
  Deny: "Запретить",
  Mixed: "Разное",
} as const;

export const VISIBILITY_UI_LABELS = {
  Inherit: "Наследовать",
  Visible: "Видимо",
  Hidden: "Скрыто",
  Mixed: "Разное",
} as const;
