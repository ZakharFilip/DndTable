import { z } from "zod";
import {
  PermissionSchema,
  PermissionContextSchema,
  StoredPermissionValueSchema,
  StoredVisibilityValueSchema,
} from "./types.js";

export const TeamDtoSchema = z.object({
  id: z.string(),
  gameSessionId: z.string(),
  name: z.string(),
  slug: z.string().optional(),
  isSystem: z.boolean().default(false),
  isDefaultForNewUsers: z.boolean().default(false),
  parentTeamId: z.string().nullable().optional(),
});
export type TeamDto = z.infer<typeof TeamDtoSchema>;

export const ParticipantDtoSchema = z.object({
  userId: z.string(),
  username: z.string().optional(),
  email: z.string().optional(),
  teamIds: z.array(z.string()),
  joinedAt: z.string().optional(),
});
export type ParticipantDto = z.infer<typeof ParticipantDtoSchema>;

export const GlobalPermissionGrantSchema = z.object({
  teamId: z.string(),
  permission: PermissionSchema,
  value: StoredPermissionValueSchema,
  context: PermissionContextSchema.optional(),
});
export type GlobalPermissionGrant = z.infer<typeof GlobalPermissionGrantSchema>;

export const ObjectPermissionGrantSchema = z.object({
  objectKey: z.string(),
  teamId: z.string(),
  permission: PermissionSchema,
  value: StoredPermissionValueSchema,
});
export type ObjectPermissionGrant = z.infer<typeof ObjectPermissionGrantSchema>;

export const ObjectVisibilityGrantSchema = z.object({
  objectKey: z.string(),
  teamId: z.string(),
  value: StoredVisibilityValueSchema,
});
export type ObjectVisibilityGrant = z.infer<typeof ObjectVisibilityGrantSchema>;

export const SessionAccessConfigSchema = z.object({
  gameSessionId: z.string(),
  defaultTeamId: z.string().nullable(),
  sessionOwnerUserId: z.string(),
});
export type SessionAccessConfig = z.infer<typeof SessionAccessConfigSchema>;

export const AccessSnapshotSchema = z.object({
  config: SessionAccessConfigSchema,
  teams: z.array(TeamDtoSchema),
  participants: z.array(ParticipantDtoSchema),
  globalGrants: z.array(GlobalPermissionGrantSchema),
  objectPermissionGrants: z.array(ObjectPermissionGrantSchema),
  objectVisibilityGrants: z.array(ObjectVisibilityGrantSchema),
});
export type AccessSnapshot = z.infer<typeof AccessSnapshotSchema>;

export const ViewerContextSchema = z.object({
  userId: z.string(),
  teamIds: z.array(z.string()),
});
export type ViewerContext = z.infer<typeof ViewerContextSchema>;
