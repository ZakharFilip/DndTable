import { isAdminEmail } from "./adminEmail.js";

export function toPublicUser(user: {
  _id: unknown;
  email: string;
  username: string;
  avatar?: string;
  friendCode?: string;
}) {
  return {
    id: String(user._id),
    email: user.email,
    username: user.username,
    avatar: user.avatar,
    friendCode: user.friendCode,
    isAdmin: isAdminEmail(user.email),
  };
}
