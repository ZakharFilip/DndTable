import { describe, expect, it, vi, beforeEach } from "vitest";
import { MAX_SESSIONS_PER_USER } from "@dnd-table/shared";

const mockCountDocuments = vi.fn();
const mockCreate = vi.fn();
const mockSeedForSession = vi.fn();

vi.mock("../backend/src/modules/gamesessions/game-session.model.js", () => ({
  GameSessionModel: {
    countDocuments: mockCountDocuments,
    create: mockCreate,
  },
}));

vi.mock("../backend/src/modules/access/AccessBootstrap.js", () => ({
  AccessBootstrap: {
    seedForSession: mockSeedForSession,
  },
}));

const { GameSessionsService } = await import(
  "../backend/src/modules/gamesessions/gamesessions.service.js"
);

describe("GameSessionsService.createSession", () => {
  const userId = "507f1f77bcf86cd799439011";

  beforeEach(() => {
    mockCountDocuments.mockReset();
    mockCreate.mockReset();
    mockSeedForSession.mockReset();
  });

  it("rejects when session limit reached", async () => {
    mockCountDocuments.mockResolvedValue(MAX_SESSIONS_PER_USER);

    await expect(
      GameSessionsService.createSession(userId, { name: "Test" })
    ).rejects.toMatchObject({
      code: "SESSION_LIMIT_REACHED",
      status: 403,
    });

    expect(mockCreate).not.toHaveBeenCalled();
  });

  it("creates session when under limit", async () => {
    mockCountDocuments.mockResolvedValue(MAX_SESSIONS_PER_USER - 1);
    mockCreate.mockResolvedValue({
      _id: "sess1",
      name: "Test",
      description: "",
      isPrivate: false,
      createdBy: "user1",
      createdAt: new Date(),
    });
    mockSeedForSession.mockResolvedValue(undefined);

    const result = await GameSessionsService.createSession(userId, { name: "Test" });

    expect(result.id).toBe("sess1");
    expect(mockSeedForSession).toHaveBeenCalledWith("sess1", userId);
  });
});
