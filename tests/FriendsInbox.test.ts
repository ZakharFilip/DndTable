import { describe, expect, it, vi, beforeEach } from "vitest";

const mockCreate = vi.fn();
const mockFindById = vi.fn();
const mockFindOne = vi.fn();
const mockFriendshipUpdate = vi.fn();
const mockUserFindById = vi.fn();

vi.mock("../backend/src/modules/friends/models/friend-request.model.js", () => ({
  FriendRequestModel: {
    create: mockCreate,
    findById: mockFindById,
    findOne: mockFindOne,
  },
}));

vi.mock("../backend/src/modules/friends/models/friendship.model.js", () => ({
  FriendshipModel: {
    updateOne: mockFriendshipUpdate,
  },
  canonicalPair: (a: string, b: string) => (a < b ? [a, b] : [b, a]),
}));

vi.mock("../backend/src/modules/users/user.model.js", () => ({
  UserModel: {
    findById: mockUserFindById,
  },
}));

const mockCreateFriendRequest = vi.fn();
const mockCreateFriendAccepted = vi.fn();
const mockCreateFriendDeclined = vi.fn();

vi.mock("../backend/src/modules/inbox/InboxService.js", () => ({
  InboxService: {
    createFriendRequest: mockCreateFriendRequest,
    createFriendAccepted: mockCreateFriendAccepted,
    createFriendDeclined: mockCreateFriendDeclined,
  },
}));

const { FriendsService } = await import("../backend/src/modules/friends/FriendsService.js");

describe("Friends + Inbox integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFriendshipUpdate.mockResolvedValue({});
  });

  it("sendRequest creates friend_request inbox message", async () => {
    mockUserFindById
      .mockReturnValueOnce({ lean: vi.fn().mockResolvedValue({ _id: "b", username: "bob" }) })
      .mockReturnValueOnce({ select: vi.fn().mockReturnValue({ lean: vi.fn().mockResolvedValue({ username: "alice" }) }) });
    mockFindOne.mockReturnValue({ lean: vi.fn().mockResolvedValue(null) });
    vi.spyOn(FriendsService, "areFriends").mockResolvedValue(false);
    mockCreate.mockResolvedValue({ _id: "req1" });

    await FriendsService.sendRequest("a", "b");

    expect(mockCreate).toHaveBeenCalled();
    expect(mockCreateFriendRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        recipientId: "b",
        fromUserId: "a",
        requestId: "req1",
      })
    );
  });

  it("acceptRequest creates friendship and friend_accepted inbox", async () => {
    const save = vi.fn();
    mockFindById.mockResolvedValue({
      status: "pending",
      fromUserId: "a",
      toUserId: "b",
      save,
    });
    mockUserFindById.mockReturnValue({
      select: vi.fn().mockReturnValue({ lean: vi.fn().mockResolvedValue({ username: "bob" }) }),
    });

    await FriendsService.acceptRequest("req1", "b");

    expect(save).toHaveBeenCalled();
    expect(mockFriendshipUpdate).toHaveBeenCalled();
    expect(mockCreateFriendAccepted).toHaveBeenCalledWith(
      expect.objectContaining({ recipientId: "a", fromUserId: "b" })
    );
  });
});
