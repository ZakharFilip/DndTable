export const MAX_SESSIONS_PER_USER = 5;

export interface AdminSessionDto {
  id: string;
  name: string;
  description: string;
  isPrivate: boolean;
  isBlocked: boolean;
  createdBy: string;
  createdByUsername: string;
  createdAt: string;
}

export interface AdminUserDto {
  id: string;
  email: string;
  username: string;
  isBanned: boolean;
  isAdmin: boolean;
  sessionCount: number;
  createdAt: string;
}
