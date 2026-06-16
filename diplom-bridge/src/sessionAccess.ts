import mongoose from "mongoose";
import { config } from "./config.js";
import {
  participantsCollection,
  sessionsCollection,
  teamMembersCollection,
  teamsCollection,
} from "./db.js";

function oid(id: string): mongoose.Types.ObjectId {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new Error("Некорректный ObjectId");
  }
  return new mongoose.Types.ObjectId(id);
}

async function findOwnerTeamId(gameSessionId: string): Promise<mongoose.Types.ObjectId | null> {
  const team = await teamsCollection().findOne({
    gameSessionId: oid(gameSessionId),
    slug: config.sessionOwnerSlug,
  });
  return team?._id ? new mongoose.Types.ObjectId(String(team._id)) : null;
}

/**
 * Принудительно подключает служебного бота к сессии с правами Session Owner.
 * Нужно для приватных столов и patch при default deny у Visitors.
 */
export async function elevateBotForSession(gameSessionId: string, userId: string): Promise<void> {
  const sessionOid = oid(gameSessionId);
  const userOid = oid(userId);

  const session = await sessionsCollection().findOne({ _id: sessionOid });
  if (!session) {
    throw new Error("Сессия не найдена");
  }

  await participantsCollection().updateOne(
    { gameSessionId: sessionOid, userId: userOid },
    {
      $setOnInsert: { joinedAt: new Date() },
      $set: {
        [`meta.${config.bridgeMetaKey}`]: true,
        "meta.source": "diplom-bridge",
      },
    },
    { upsert: true }
  );

  const ownerTeamId = await findOwnerTeamId(gameSessionId);
  if (!ownerTeamId) {
    throw new Error("Команда Session Owner не найдена (ACL не инициализирован)");
  }

  await teamMembersCollection().updateOne(
    { teamId: ownerTeamId, userId: userOid },
    {
      $setOnInsert: {
        teamId: ownerTeamId,
        userId: userOid,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    },
    { upsert: true }
  );
}

/** Снимает временное повышение прав и отключает бота от сессии. */
export async function demoteBotFromSession(gameSessionId: string, userId: string): Promise<void> {
  const sessionOid = oid(gameSessionId);
  const userOid = oid(userId);

  const ownerTeamId = await findOwnerTeamId(gameSessionId);
  if (ownerTeamId) {
    await teamMembersCollection().deleteOne({ teamId: ownerTeamId, userId: userOid });
  }

  await participantsCollection().deleteOne({
    gameSessionId: sessionOid,
    userId: userOid,
    [`meta.${config.bridgeMetaKey}`]: true,
  });
}

export async function withBotSessionAccess<T>(
  gameSessionId: string,
  userId: string,
  fn: () => Promise<T>
): Promise<T> {
  await elevateBotForSession(gameSessionId, userId);
  try {
    return await fn();
  } finally {
    if (config.autoLeaveAfterRequest) {
      await demoteBotFromSession(gameSessionId, userId);
    }
  }
}
