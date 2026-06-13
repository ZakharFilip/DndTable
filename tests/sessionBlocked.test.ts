import { describe, expect, it, vi, beforeEach } from "vitest";

const mockFindById = vi.fn();
const mockFindOne = vi.fn();

vi.mock("../backend/src/modules/gamesessions/game-session.model.js", () => ({
  GameSessionModel: {
    findById: mockFindById,
  },
}));

vi.mock("../backend/src/modules/access/models/session-participant.model.js", () => ({
  SessionParticipantModel: {
    findOne: mockFindOne,
  },
}));

const { SessionParticipantService } = await import(
  "../backend/src/modules/access/SessionParticipantService.js"
);

describe("SessionParticipantService", () => {
  const sessionId = "507f1f77bcf86cd799439011";
  const ownerId = "507f1f77bcf86cd799439012";
  const userId = "507f1f77bcf86cd799439013";

  beforeEach(() => {
    mockFindById.mockReset();
    mockFindOne.mockReset();
  });

  it("join blocks non-owner when session is blocked", async () => {
    mockFindById.mockReturnValue({
      lean: vi.fn().mockResolvedValue({
        _id: sessionId,
        createdBy: ownerId,
        isBlocked: true,
        isPrivate: false,
      }),
    });

    await expect(SessionParticipantService.join(sessionId, userId)).rejects.toMatchObject({
      code: "SESSION_BLOCKED",
      status: 403,
    });
  });

  it("assertCanAccessSession blocks non-participant on blocked session", async () => {
    mockFindById.mockReturnValue({
      lean: vi.fn().mockResolvedValue({
        _id: sessionId,
        createdBy: ownerId,
        isBlocked: true,
        isPrivate: false,
      }),
    });
    mockFindOne.mockReturnValue({
      lean: vi.fn().mockResolvedValue(null),
    });

    await expect(
      SessionParticipantService.assertCanAccessSession(sessionId, userId)
    ).rejects.toMatchObject({
      code: "SESSION_BLOCKED",
      status: 403,
    });
  });
});
