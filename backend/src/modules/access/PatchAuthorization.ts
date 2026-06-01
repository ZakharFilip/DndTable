import type { TablePatchOp, TabletopBaseObject } from "@dnd-table/shared";
import { PermissionResolver, TableActionRegistry } from "@dnd-table/shared";
import { AccessSnapshotService } from "./AccessSnapshotService.js";
import { HttpError } from "../../shared/HttpError.js";
import { TableObjectModel } from "../gamesessions/table-object.model.js";
import mongoose from "mongoose";

export class PatchAuthorization {
  static async assertOpsAllowed(
    gameSessionId: string,
    userId: string,
    ops: TablePatchOp[]
  ): Promise<void> {
    const snapshot = await AccessSnapshotService.load(gameSessionId);
    if (!snapshot) {
      throw new HttpError(500, "ACCESS_NOT_INITIALIZED", "ACL не инициализирован");
    }
    const resolver = new PermissionResolver(snapshot);
    const sessionOid = new mongoose.Types.ObjectId(gameSessionId);

    for (const op of ops) {
      const { permission, objectKey } = TableActionRegistry.permissionForPatchOp(op);
      if (!objectKey && op.action !== "create") {
        throw new HttpError(400, "BAD_REQUEST", "Некорректная операция");
      }
      const key = op.action === "create" ? op.key : objectKey;
      if (resolver.hasPermission(userId, permission, key)) {
        continue;
      }
      if (await PatchAuthorization.ownerMayPerform(sessionOid, userId, key, permission, op)) {
        continue;
      }
      throw new HttpError(403, "FORBIDDEN", `Недостаточно прав: ${permission}`);
    }
  }

  /** Object owner may edit transform/properties on their object despite team deny. */
  private static async ownerMayPerform(
    sessionOid: mongoose.Types.ObjectId,
    userId: string,
    objectKey: string,
    permission: string,
    op: TablePatchOp
  ): Promise<boolean> {
    const allowed = ["ModifyTransform", "ChangeObjectProperties"];
    if (!allowed.includes(permission)) return false;

    const row = await TableObjectModel.findOne({ gameSessionId: sessionOid, key: objectKey })
      .select({ props: 1 })
      .lean();
    if (!row?.props) return false;
    const props = row.props as Record<string, unknown>;
    let tabletop: TabletopBaseObject | null = null;
    if ("transform" in props && "type" in props) {
      tabletop = props as unknown as TabletopBaseObject;
    } else if (props.tabletop && typeof props.tabletop === "object") {
      tabletop = props.tabletop as TabletopBaseObject;
    }
    const ownerId = tabletop?.ownerUserId;
    if (!ownerId || ownerId !== userId) return false;
    if (op.action === "delete") return false;
    return true;
  }
}
