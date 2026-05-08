import { describe, expect, it, vi } from "vitest";

// Avoid pulling in bcrypt / mongoose just for this trivial pure check.
vi.mock("bcrypt", () => ({ default: { hash: vi.fn(), compare: vi.fn() } }));
vi.mock("../backend/src/modules/users/user.model", () => ({ UserModel: {} }));

const { AuthService } = await import("../backend/src/modules/auth/auth.service");

describe("AuthService._isPasswordStrong", () => {
  it("rejects passwords shorter than 8 characters", () => {
    expect(AuthService._isPasswordStrong("Aa1xxx")).toBe(false);
  });

  it("rejects passwords without an uppercase letter", () => {
    expect(AuthService._isPasswordStrong("password1")).toBe(false);
  });

  it("rejects passwords without a lowercase letter", () => {
    expect(AuthService._isPasswordStrong("PASSWORD1")).toBe(false);
  });

  it("rejects passwords without a digit", () => {
    expect(AuthService._isPasswordStrong("Password")).toBe(false);
  });

  it("accepts passwords meeting all criteria", () => {
    expect(AuthService._isPasswordStrong("Password1")).toBe(true);
  });

  it("accepts passwords using cyrillic letters", () => {
    expect(AuthService._isPasswordStrong("Парол123ь")).toBe(true);
  });

  it("rejects non-string input", () => {
    expect(AuthService._isPasswordStrong(undefined as unknown as string)).toBe(false);
  });
});
