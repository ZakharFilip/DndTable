import { describe, expect, it } from "vitest";
import { isAdminEmail, ADMIN_EMAIL_SUFFIX } from "../backend/src/shared/adminEmail.js";

describe("isAdminEmail", () => {
  it("returns true for admin suffix", () => {
    expect(isAdminEmail(`kaban${ADMIN_EMAIL_SUFFIX}`)).toBe(true);
    expect(isAdminEmail(`KABAN${ADMIN_EMAIL_SUFFIX.toUpperCase()}`)).toBe(true);
  });

  it("returns false for regular emails", () => {
    expect(isAdminEmail("kaban@mail.ru")).toBe(false);
    expect(isAdminEmail("user@admin.admin.admin.evil.com")).toBe(false);
  });

  it("trims whitespace", () => {
    expect(isAdminEmail(`  admin${ADMIN_EMAIL_SUFFIX}  `)).toBe(true);
  });
});
