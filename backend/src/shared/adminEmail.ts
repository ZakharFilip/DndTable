export const ADMIN_EMAIL_SUFFIX = "@admin.admin.admin";

export function isAdminEmail(email: string): boolean {
  return email.toLowerCase().trim().endsWith(ADMIN_EMAIL_SUFFIX);
}
