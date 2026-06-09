import { z } from 'zod';

export const UserSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  name: z.string().min(1).optional(),
  avatar: z.string().url().optional()
});
export type User = z.infer<typeof UserSchema>;

export const TransformComponentSchema = z.object({
  position: z.object({ x: z.number(), y: z.number() }),
  rotation: z.number().default(0),
  scale: z.object({ x: z.number().default(1), y: z.number().default(1) })
});
export type TransformComponent = z.infer<typeof TransformComponentSchema>;

export const ShapeComponentSchema = z.object({
  kind: z.enum(['rect', 'circle', 'image']),
  // rect/circle params; image uses resourceId
  width: z.number().optional(),
  height: z.number().optional(),
  radius: z.number().optional(),
  resourceId: z.string().optional(),
  tint: z.number().optional()
});
export type ShapeComponent = z.infer<typeof ShapeComponentSchema>;

export const DescriptionComponentSchema = z.object({
  text: z.string().max(2000).optional()
});
export type DescriptionComponent = z.infer<typeof DescriptionComponentSchema>;

export const VisibilityComponentSchema = z.object({
  visibleTo: z.array(z.string()).optional(), // teamIds or userIds
  hidden: z.boolean().optional()
});
export type VisibilityComponent = z.infer<typeof VisibilityComponentSchema>;

export const GridComponentSchema = z.object({
  enabled: z.boolean().default(true),
  size: z.number().default(50)
});
export type GridComponent = z.infer<typeof GridComponentSchema>;

export const SceneObjectSchema = z.object({
  id: z.string(),
  sceneId: z.string(),
  parentId: z.string().nullable().optional(),
  order: z.number().default(0),
  components: z.record(z.string(), z.unknown())
});
export type SceneObject = z.infer<typeof SceneObjectSchema>;

export const RealtimeJoinParty = z.object({ partyId: z.string() });
export const RealtimeJoinScene = z.object({ partyId: z.string(), sceneId: z.string() });

export type JoinPartyPayload = z.infer<typeof RealtimeJoinParty>;
export type JoinScenePayload = z.infer<typeof RealtimeJoinScene>;

/**
 * Tabletop (interactive table) object model.
 *
 * Note: this is intentionally independent from the ECS/SceneObject model above.
 * It is used by the MVP "interactive table" pages and can later be bridged into ECS.
 */
export const TabletopObjectTypeSchema = z.enum(["shape", "text", "image", "token"]);
export type TabletopObjectType = z.infer<typeof TabletopObjectTypeSchema>;

export const TabletopTransformSchema = z.object({
  position: z.object({
    x: z.number(),
    y: z.number(),
    z: z.number().optional().default(0),
  }),
  scale: z.object({
    x: z.number().optional().default(1),
    y: z.number().optional().default(1),
  }),
  rotation: z.number().optional().default(0), // degrees
  lockScale: z.boolean().optional().default(false),
  lockRotation: z.boolean().optional().default(false),
});
export type TabletopTransform = z.infer<typeof TabletopTransformSchema>;

export const TabletopAppearanceSchema = z.object({
  shape: z.enum(["rectangle", "ellipse"]).optional(),
  sprite: z.string().optional(), // URL / resource id / dataURL (MVP)
  fillColor: z.string().optional(),
  strokeColor: z.string().optional(),
  tintColor: z.string().optional(),
  opacity: z.number().min(0).max(1).optional(),
});
export type TabletopAppearance = z.infer<typeof TabletopAppearanceSchema>;

export const TabletopTextSchema = z.object({
  text: z.string().default(""),
  font: z.string().optional().default("Inter"),
  fontSize: z.number().optional().default(16),
  textColor: z.string().optional().default("#111827"),
  alignment: z.enum(["left", "center", "right"]).optional().default("left"),
});
export type TabletopText = z.infer<typeof TabletopTextSchema>;

export const TabletopBaseObjectSchema = z.object({
  id: z.string(),
  type: TabletopObjectTypeSchema,
  transform: TabletopTransformSchema,
  appearance: TabletopAppearanceSchema.optional().default({}),
  text: TabletopTextSchema.optional(),
  metadata: z.record(z.string(), z.unknown()).optional().default({}),
  groupId: z.string().optional().nullable(),
  layerId: z.string().optional().nullable(),
  ownerUserId: z.string().optional().nullable(),
});
export type TabletopBaseObject = z.infer<typeof TabletopBaseObjectSchema>;

/**
 * Tabletop patch ops: shared between backend (apply with optimistic concurrency)
 * and frontend (queue + send via socket).
 *
 * Kept here so a single change to the wire format updates both sides.
 */
export type TablePatchAction = "create" | "update" | "delete";

export type TablePatchOp =
  | {
      opId: string;
      action: "create";
      key: string;
      object: {
        type: string;
        x: number;
        y: number;
        sortOrder?: number;
        props?: Record<string, unknown>;
      };
    }
  | {
      opId: string;
      action: "update";
      key: string;
      baseVersion: number;
      patch: {
        x?: number;
        y?: number;
        sortOrder?: number;
        props?: Record<string, unknown>;
      };
    }
  | {
      opId: string;
      action: "delete";
      key: string;
      baseVersion: number;
    };

export type AppliedOp =
  | {
      opId: string;
      action: "create";
      key: string;
      version: number;
      object: {
        type: string;
        x: number;
        y: number;
        sortOrder: number;
        props: Record<string, unknown>;
      };
    }
  | {
      opId: string;
      action: "update";
      key: string;
      baseVersion: number;
      version: number;
      patch: {
        x?: number;
        y?: number;
        sortOrder?: number;
        props?: Record<string, unknown>;
      };
    }
  | {
      opId: string;
      action: "delete";
      key: string;
      baseVersion: number;
      version: number;
    };

export * from "./access/index.js";
export * from "./social/index.js";

