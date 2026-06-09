const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:4000";

export function avatarUrl(filename?: string): string {
  if (!filename || filename === "default-avatar.png") {
    return "/default-avatar.svg";
  }
  return `${API_BASE}/avatars/${filename}`;
}
