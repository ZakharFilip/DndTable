import mongoose from "mongoose";
import {
  PermissionResolver,
  TEAM_SLUG_SESSION_OWNER,
  TEAM_SLUG_VISITORS,
  type Permission,
} from "@dnd-table/shared";
import { HttpError } from "../../shared/HttpError.js";
import { TeamModel } from "./models/team.model.js";
import { TeamUserMemberModel } from "./models/team-user-member.model.js";
import { SessionAccessConfigModel } from "./models/session-access-config.model.js";
import { TeamGraph } from "@dnd-table/shared";
import { AccessSnapshotService } from "./AccessSnapshotService.js";

async function loadResolver(gameSessionId: string, userId: string) {
  const snapshot = await AccessSnapshotService.load(gameSessionId);
  if (!snapshot) throw new HttpError(500, "ACCESS_NOT_INITIALIZED", "ACL не инициализирован");
  return { snapshot, resolver: new PermissionResolver(snapshot) };
}

function assertModifyPermissions(resolver: PermissionResolver, userId: string) {
  if (!resolver.hasPermission(userId, "ModifyPermissions")) {
    throw new HttpError(403, "FORBIDDEN", "Недостаточно прав для управления командами");
  }
}

export const TeamsService = {
  async createTeam(
    gameSessionId: string,
    userId: string,
    dto: { name: string; parentTeamId?: string | null }
  ) {
    const { resolver } = await loadResolver(gameSessionId, userId);
    assertModifyPermissions(resolver, userId);

    const sessionOid = new mongoose.Types.ObjectId(gameSessionId);
    if (dto.parentTeamId) {
      const parent = await TeamModel.findOne({
        _id: dto.parentTeamId,
        gameSessionId: sessionOid,
      }).lean();
      if (!parent) throw new HttpError(400, "INVALID_PARENT", "Родительская команда не найдена");
    }

    const team = await TeamModel.create({
      gameSessionId: sessionOid,
      name: dto.name.trim(),
      parentTeamId: dto.parentTeamId
        ? new mongoose.Types.ObjectId(dto.parentTeamId)
        : null,
      isSystem: false,
      isDefaultForNewUsers: false,
    });

    return { id: String(team._id), name: team.name, parentTeamId: dto.parentTeamId ?? null };
  },

  async updateTeam(
    gameSessionId: string,
    userId: string,
    teamId: string,
    dto: { name?: string; isDefaultForNewUsers?: boolean }
  ) {
    const { resolver, snapshot } = await loadResolver(gameSessionId, userId);
    assertModifyPermissions(resolver, userId);

    const team = await TeamModel.findOne({
      _id: teamId,
      gameSessionId: new mongoose.Types.ObjectId(gameSessionId),
    });
    if (!team) throw new HttpError(404, "NOT_FOUND", "Команда не найдена");
    if (team.slug === TEAM_SLUG_SESSION_OWNER) {
      throw new HttpError(403, "FORBIDDEN", "Системную команду владельца нельзя изменять");
    }

    if (dto.name !== undefined) team.name = dto.name.trim();
    if (dto.isDefaultForNewUsers === true) {
      await TeamModel.updateMany(
        { gameSessionId: team.gameSessionId },
        { $set: { isDefaultForNewUsers: false } }
      );
      team.isDefaultForNewUsers = true;
      await SessionAccessConfigModel.updateOne(
        { gameSessionId: team.gameSessionId },
        { $set: { defaultTeamId: team._id } }
      );
    } else if (dto.isDefaultForNewUsers === false && team.isDefaultForNewUsers) {
      team.isDefaultForNewUsers = false;
      const visitors = (await TeamModel.findOne({
        gameSessionId: team.gameSessionId,
        slug: TEAM_SLUG_VISITORS,
      }).lean()) as { _id: mongoose.Types.ObjectId } | null;
      if (visitors) {
        await SessionAccessConfigModel.updateOne(
          { gameSessionId: team.gameSessionId },
          { $set: { defaultTeamId: visitors._id } }
        );
        await TeamModel.updateOne({ _id: visitors._id }, { isDefaultForNewUsers: true });
      }
    }
    await team.save();
    return { id: String(team._id), name: team.name };
  },

  async deleteTeam(gameSessionId: string, userId: string, teamId: string) {
    const { resolver } = await loadResolver(gameSessionId, userId);
    assertModifyPermissions(resolver, userId);

    const team = await TeamModel.findOne({
      _id: teamId,
      gameSessionId: new mongoose.Types.ObjectId(gameSessionId),
    });
    if (!team) throw new HttpError(404, "NOT_FOUND", "Команда не найдена");
    if (team.isSystem) {
      throw new HttpError(403, "FORBIDDEN", "Системную команду нельзя удалить");
    }

    const children = await TeamModel.find({ parentTeamId: team._id }).lean();
    if (children.length > 0) {
      throw new HttpError(400, "HAS_CHILDREN", "Сначала удалите или переместите дочерние команды");
    }

    await TeamUserMemberModel.deleteMany({ teamId: team._id });
    await team.deleteOne();
  },

  async setParentTeam(
    gameSessionId: string,
    userId: string,
    teamId: string,
    parentTeamId: string | null
  ) {
    const { resolver, snapshot } = await loadResolver(gameSessionId, userId);
    assertModifyPermissions(resolver, userId);

    const team = await TeamModel.findOne({
      _id: teamId,
      gameSessionId: new mongoose.Types.ObjectId(gameSessionId),
    });
    if (!team || team.isSystem) {
      throw new HttpError(403, "FORBIDDEN", "Нельзя изменить иерархию этой команды");
    }

    if (parentTeamId) {
      const graph = new TeamGraph(snapshot.teams);
      if (graph.wouldCreateCycle(teamId, parentTeamId)) {
        throw new HttpError(400, "CYCLE", "Циклическая иерархия команд запрещена");
      }
      const parent = await TeamModel.findOne({
        _id: parentTeamId,
        gameSessionId: team.gameSessionId,
      }).lean();
      if (!parent) throw new HttpError(404, "NOT_FOUND", "Родитель не найден");
      team.parentTeamId = new mongoose.Types.ObjectId(parentTeamId);
    } else {
      team.parentTeamId = null;
    }
    await team.save();
  },

  async addUserToTeam(gameSessionId: string, userId: string, teamId: string, targetUserId: string) {
    const { resolver } = await loadResolver(gameSessionId, userId);
    assertModifyPermissions(resolver, userId);

    const team = await TeamModel.findOne({
      _id: teamId,
      gameSessionId: new mongoose.Types.ObjectId(gameSessionId),
    }).lean();
    if (!team) throw new HttpError(404, "NOT_FOUND", "Команда не найдена");

    await TeamUserMemberModel.updateOne(
      { teamId: new mongoose.Types.ObjectId(teamId), userId: new mongoose.Types.ObjectId(targetUserId) },
      {},
      { upsert: true }
    );
  },

  async removeUserFromTeam(
    gameSessionId: string,
    userId: string,
    teamId: string,
    targetUserId: string
  ) {
    const { resolver, snapshot } = await loadResolver(gameSessionId, userId);
    assertModifyPermissions(resolver, userId);

    const team = (await TeamModel.findOne({
      _id: teamId,
      gameSessionId: new mongoose.Types.ObjectId(gameSessionId),
    }).lean()) as { slug?: string | null } | null;
    if (!team) throw new HttpError(404, "NOT_FOUND", "Команда не найдена");
    if (team.slug === TEAM_SLUG_SESSION_OWNER) {
      throw new HttpError(403, "FORBIDDEN", "Нельзя удалить владельца сессии из Session Owner");
    }

    await TeamUserMemberModel.deleteOne({
      teamId: new mongoose.Types.ObjectId(teamId),
      userId: new mongoose.Types.ObjectId(targetUserId),
    });
  },
};

export const GrantsService = {
  async setGlobalGrant(
    gameSessionId: string,
    userId: string,
    dto: { teamId: string; permission: Permission; value: "Allow" | "Deny" | null }
  ) {
    const { resolver } = await loadResolver(gameSessionId, userId);
    assertModifyPermissions(resolver, userId);

    const team = (await TeamModel.findOne({
      _id: dto.teamId,
      gameSessionId: new mongoose.Types.ObjectId(gameSessionId),
    }).lean()) as { slug?: string | null } | null;
    if (!team) throw new HttpError(404, "NOT_FOUND", "Команда не найдена");
    if (team.slug === TEAM_SLUG_SESSION_OWNER) {
      throw new HttpError(403, "FORBIDDEN", "Нельзя менять разрешения Session Owner");
    }

    const { GlobalPermissionGrantModel } = await import("./models/global-permission-grant.model.js");
    const filter = {
      gameSessionId: new mongoose.Types.ObjectId(gameSessionId),
      teamId: new mongoose.Types.ObjectId(dto.teamId),
      permission: dto.permission,
      context: "Default",
    };

    if (dto.value === null) {
      await GlobalPermissionGrantModel.deleteOne(filter);
      return;
    }

    await GlobalPermissionGrantModel.updateOne(
      filter,
      { $set: { value: dto.value } },
      { upsert: true }
    );
  },

  async setObjectPermissionGrant(
    gameSessionId: string,
    userId: string,
    dto: {
      objectKey: string;
      teamId: string;
      permission: Permission;
      value: "Allow" | "Deny" | null;
    }
  ) {
    const { resolver } = await loadResolver(gameSessionId, userId);
    if (!resolver.hasPermission(userId, "ModifyPermissions", dto.objectKey)) {
      throw new HttpError(403, "FORBIDDEN", "Недостаточно прав");
    }

    const team = (await TeamModel.findOne({
      _id: dto.teamId,
      gameSessionId: new mongoose.Types.ObjectId(gameSessionId),
    }).lean()) as { slug?: string | null } | null;
    if (!team) throw new HttpError(404, "NOT_FOUND", "Команда не найдена");
    if (team.slug === TEAM_SLUG_SESSION_OWNER) {
      throw new HttpError(403, "FORBIDDEN", "Нельзя менять разрешения Session Owner");
    }

    const { ObjectPermissionGrantModel } = await import(
      "./models/object-permission-grant.model.js"
    );
    const filter = {
      gameSessionId: new mongoose.Types.ObjectId(gameSessionId),
      objectKey: dto.objectKey,
      teamId: new mongoose.Types.ObjectId(dto.teamId),
      permission: dto.permission,
    };
    if (dto.value === null) {
      await ObjectPermissionGrantModel.deleteOne(filter);
      return;
    }
    await ObjectPermissionGrantModel.updateOne(filter, { $set: { value: dto.value } }, { upsert: true });
  },

  async setObjectVisibilityGrant(
    gameSessionId: string,
    userId: string,
    dto: { objectKey: string; teamId: string; value: "Visible" | "Hidden" | null }
  ) {
    const { resolver } = await loadResolver(gameSessionId, userId);
    if (!resolver.hasPermission(userId, "ModifyVisibility", dto.objectKey)) {
      throw new HttpError(403, "FORBIDDEN", "Недостаточно прав");
    }

    const { ObjectVisibilityGrantModel } = await import(
      "./models/object-visibility-grant.model.js"
    );
    const filter = {
      gameSessionId: new mongoose.Types.ObjectId(gameSessionId),
      objectKey: dto.objectKey,
      teamId: new mongoose.Types.ObjectId(dto.teamId),
    };
    if (dto.value === null) {
      await ObjectVisibilityGrantModel.deleteOne(filter);
      return;
    }
    await ObjectVisibilityGrantModel.updateOne(filter, { $set: { value: dto.value } }, { upsert: true });
  },
};
