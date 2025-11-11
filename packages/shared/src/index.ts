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


