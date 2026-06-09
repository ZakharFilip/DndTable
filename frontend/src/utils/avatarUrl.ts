export function avatarUrl(filename?: string): string {
  if (!filename || filename === "default-avatar.png") {
    return "/default-avatar.svg";
  }
  return `/avatars/${filename}`;
}
