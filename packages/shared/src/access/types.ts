import { z } from "zod";

/** Typed permissions — not free-form strings. */
export const PermissionSchema = z.enum([
  "MoveObject",
  "CreateObject",
  "DeleteObject",
  "ModifyVisibility",
  "ModifyPermissions",
  "ModifyTransform",
  "ChangeObjectProperties",
]);
export type Permission = z.infer<typeof PermissionSchema>;

export const PERMISSIONS = PermissionSchema.options;

export const PermissionValueSchema = z.enum(["Undefined", "Allow", "Deny"]);
export type PermissionValue = z.infer<typeof PermissionValueSchema>;

/** Stored in DB as Allow | Deny only; missing grant = Undefined. */
export const StoredPermissionValueSchema = z.enum(["Allow", "Deny"]);
export type StoredPermissionValue = z.infer<typeof StoredPermissionValueSchema>;

export const VisibilityValueSchema = z.enum(["Inherit", "Visible", "Hidden"]);
export type VisibilityValue = z.infer<typeof VisibilityValueSchema>;

export const StoredVisibilityValueSchema = z.enum(["Visible", "Hidden"]);
export type StoredVisibilityValue = z.infer<typeof StoredVisibilityValueSchema>;

export const PermissionContextSchema = z.enum(["Default"]);
export type PermissionContext = z.infer<typeof PermissionContextSchema>;

export const TEAM_SLUG_SESSION_OWNER = "session-owner" as const;
export const TEAM_SLUG_VISITORS = "visitors" as const;
