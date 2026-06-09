import { describe, expect, it, vi, beforeEach } from "vitest";

const mockExists = vi.fn();
const mockFind = vi.fn();
const mockUpdateOne = vi.fn();

vi.mock("../backend/src/modules/users/user.model.js", () => ({
  UserModel: {
    exists: mockExists,
    find: mockFind,
    updateOne: mockUpdateOne,
  },
}));

const { FriendCodeGenerator } = await import("../backend/src/modules/users/FriendCodeGenerator.js");

describe("FriendCodeGenerator", () => {
  beforeEach(() => {
    mockExists.mockReset();
    mockFind.mockReset();
    mockUpdateOne.mockReset();
  });

  it("generateCandidate returns 6 digit string", () => {
    const code = FriendCodeGenerator.generateCandidate();
    expect(code).toMatch(/^\d{6}$/);
  });

  it("generateUnique retries on collision", async () => {
    mockExists.mockResolvedValueOnce(true).mockResolvedValueOnce(false);
    const code = await FriendCodeGenerator.generateUnique();
    expect(code).toMatch(/^\d{6}$/);
    expect(mockExists).toHaveBeenCalledTimes(2);
  });
});
