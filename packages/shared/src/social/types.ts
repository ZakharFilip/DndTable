import { z } from "zod";

export const InboxMessageTypeSchema = z.enum([
  "friend_request",
  "friend_accepted",
  "friend_declined",
  "session_invite",
  "session_invite_accepted",
  "session_invite_declined",
]);
export type InboxMessageType = z.infer<typeof InboxMessageTypeSchema>;

export const InboxMessageStatusSchema = z.enum(["pending", "read", "acted"]);
export type InboxMessageStatus = z.infer<typeof InboxMessageStatusSchema>;

export const InboxActionSchema = z.enum(["accept", "decline"]);
export type InboxAction = z.infer<typeof InboxActionSchema>;

export const UserSearchResultSchema = z.object({
  id: z.string(),
  username: z.string(),
  avatar: z.string().optional(),
});
export type UserSearchResult = z.infer<typeof UserSearchResultSchema>;

export const FriendDtoSchema = z.object({
  userId: z.string(),
  username: z.string(),
  avatar: z.string().optional(),
  friendCode: z.string().optional(),
});
export type FriendDto = z.infer<typeof FriendDtoSchema>;

export const InboxMessageDtoSchema = z.object({
  id: z.string(),
  type: InboxMessageTypeSchema,
  status: InboxMessageStatusSchema,
  createdAt: z.string(),
  text: z.string(),
  actionable: z.boolean(),
  payload: z.record(z.string(), z.unknown()).optional(),
});
export type InboxMessageDto = z.infer<typeof InboxMessageDtoSchema>;

export const SessionInviteDtoSchema = z.object({
  id: z.string(),
  gameSessionId: z.string(),
  sessionName: z.string(),
  fromUserId: z.string(),
  fromUsername: z.string(),
  toUserId: z.string(),
  status: z.enum(["pending", "accepted", "declined"]),
  createdAt: z.string(),
});
export type SessionInviteDto = z.infer<typeof SessionInviteDtoSchema>;

export const DiscoverSessionDtoSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  isPrivate: z.boolean(),
  createdBy: z.string().optional(),
  createdAt: z.string(),
  isMine: z.boolean().optional(),
});
export type DiscoverSessionDto = z.infer<typeof DiscoverSessionDtoSchema>;
