import { resolveApiBase } from "../config/apiOrigin";

export function avatarUrl(filename?: string): string {
  if (!filename || filename === "default-avatar.png") {
    return "/default-avatar.svg";
  }
  const base = resolveApiBase();
  return base ? `${base}/avatars/${filename}` : `/avatars/${filename}`;
}
