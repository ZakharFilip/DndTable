import { z } from 'zod';
export const UserSchema = z.object({
    id: z.string(),
    email: z.string().email(),
    name: z.string().min(1).optional(),
    avatar: z.string().url().optional()
});
export const TransformComponentSchema = z.object({
    position: z.object({ x: z.number(), y: z.number() }),
    rotation: z.number().default(0),
    scale: z.object({ x: z.number().default(1), y: z.number().default(1) })
});
export const ShapeComponentSchema = z.object({
    kind: z.enum(['rect', 'circle', 'image']),
    // rect/circle params; image uses resourceId
    width: z.number().optional(),
    height: z.number().optional(),
    radius: z.number().optional(),
    resourceId: z.string().optional(),
    tint: z.number().optional()
});
export const DescriptionComponentSchema = z.object({
    text: z.string().max(2000).optional()
});
export const VisibilityComponentSchema = z.object({
    visibleTo: z.array(z.string()).optional(), // teamIds or userIds
    hidden: z.boolean().optional()
});
export const GridComponentSchema = z.object({
    enabled: z.boolean().default(true),
    size: z.number().default(50)
});
export const SceneObjectSchema = z.object({
    id: z.string(),
    sceneId: z.string(),
    parentId: z.string().nullable().optional(),
    order: z.number().default(0),
    components: z.record(z.string(), z.unknown())
});
export const RealtimeJoinParty = z.object({ partyId: z.string() });
export const RealtimeJoinScene = z.object({ partyId: z.string(), sceneId: z.string() });
/**
 * Tabletop (interactive table) object model.
 *
 * Note: this is intentionally independent from the ECS/SceneObject model above.
 * It is used by the MVP "interactive table" pages and can later be bridged into ECS.
 */
export const TabletopObjectTypeSchema = z.enum(["shape", "text", "image", "token"]);
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
export const TabletopAppearanceSchema = z.object({
    shape: z.enum(["rectangle", "ellipse"]).optional(),
    sprite: z.string().optional(), // URL / resource id / dataURL (MVP)
    fillColor: z.string().optional(),
    strokeColor: z.string().optional(),
    tintColor: z.string().optional(),
    opacity: z.number().min(0).max(1).optional(),
});
export const TabletopTextSchema = z.object({
    text: z.string().default(""),
    font: z.string().optional().default("Inter"),
    fontSize: z.number().optional().default(16),
    textColor: z.string().optional().default("#111827"),
    alignment: z.enum(["left", "center", "right"]).optional().default("left"),
});
export const TabletopBaseObjectSchema = z.object({
    id: z.string(),
    type: TabletopObjectTypeSchema,
    transform: TabletopTransformSchema,
    appearance: TabletopAppearanceSchema.optional().default({}),
    text: TabletopTextSchema.optional(),
    metadata: z.record(z.string(), z.unknown()).optional().default({}),
    groupId: z.string().optional().nullable(),
    layerId: z.string().optional().nullable(),
});
