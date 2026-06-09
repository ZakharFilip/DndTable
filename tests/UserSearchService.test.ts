import { describe, expect, it, vi, beforeEach } from "vitest";

const mockFind = vi.fn();

vi.mock("../backend/src/modules/users/user.model.js", () => ({
  UserModel: {
    find: mockFind,
  },
}));

const { UserSearchService } = await import("../backend/src/modules/users/UserSearchService.js");

describe("UserSearchService.search", () => {
  beforeEach(() => {
    mockFind.mockReset();
  });

  it("returns empty array for short query", async () => {
    const result = await UserSearchService.search("a", "user1");
    expect(result).toEqual([]);
    expect(mockFind).not.toHaveBeenCalled();
  });

  it("excludes requester and maps results", async () => {
    const chain = {
      select: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      lean: vi.fn().mockResolvedValue([
        { _id: "u2", username: "alice", avatar: "a.png" },
      ]),
    };
    mockFind.mockReturnValue(chain);

    const result = await UserSearchService.search("ali", "user1");
    expect(mockFind).toHaveBeenCalledWith(
      expect.objectContaining({
        _id: { $ne: "user1" },
        username: expect.objectContaining({ $regex: "ali", $options: "i" }),
      })
    );
    expect(result).toEqual([{ id: "u2", username: "alice", avatar: "a.png" }]);
  });
});
