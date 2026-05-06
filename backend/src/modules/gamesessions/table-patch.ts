import mongoose from "mongoose";
import { TableObjectModel } from "./table-object.model";

export type TablePatchAction = "create" | "update" | "delete";

export type TablePatchOp =
  | {
      opId: string;
      action: "create";
      key: string;
      object: {
        type: string;
        x: number;
        y: number;
        sortOrder?: number;
        props?: Record<string, unknown>;
      };
    }
  | {
      opId: string;
      action: "update";
      key: string;
      baseVersion: number;
      patch: {
        x?: number;
        y?: number;
        sortOrder?: number;
        props?: Record<string, unknown>;
      };
    }
  | {
      opId: string;
      action: "delete";
      key: string;
      baseVersion: number;
    };

export type AppliedOp =
  | {
      opId: string;
      action: "create";
      key: string;
      version: number;
      object: {
        type: string;
        x: number;
        y: number;
        sortOrder: number;
        props: Record<string, unknown>;
      };
    }
  | {
      opId: string;
      action: "update";
      key: string;
      baseVersion: number;
      version: number;
      patch: {
        x?: number;
        y?: number;
        sortOrder?: number;
        props?: Record<string, unknown>;
      };
    }
  | {
      opId: string;
      action: "delete";
      key: string;
      baseVersion: number;
      version: number;
    };

export interface ApplyPatchResult {
  applied: AppliedOp[];
  conflicts: Array<{
    opId: string;
    key: string;
    expectedVersion: number;
    actualVersion: number | null;
  }>;
}

/**
 * Apply ops to DB with optimistic concurrency:
 * - per object `version`
 * - Last Write Wins if client supplies latest version; otherwise 409 conflict
 */
export async function applyTablePatches(params: {
  gameSessionId: string;
  ops: TablePatchOp[];
}): Promise<ApplyPatchResult> {
  const sessionOid = new mongoose.Types.ObjectId(params.gameSessionId);
  const applied: AppliedOp[] = [];
  const conflicts: ApplyPatchResult["conflicts"] = [];

  for (const op of params.ops) {
    if (!op?.opId || !op.key) continue;

    if (op.action === "create") {
      try {
        const created = await TableObjectModel.create({
          gameSessionId: sessionOid,
          key: op.key,
          version: 1,
          type: op.object.type,
          x: op.object.x,
          y: op.object.y,
          sortOrder: op.object.sortOrder ?? 0,
          props: op.object.props ?? {},
        });
        applied.push({
          opId: op.opId,
          action: "create",
          key: op.key,
          version: created.version,
          object: {
            type: created.type,
            x: created.x,
            y: created.y,
            sortOrder: created.sortOrder ?? 0,
            props: (created.props ?? {}) as Record<string, unknown>,
          },
        });
      } catch (e: any) {
        // Duplicate key -> conflict
        const current = await TableObjectModel.findOne({ gameSessionId: sessionOid, key: op.key })
          .select({ version: 1 })
          .lean();
        conflicts.push({
          opId: op.opId,
          key: op.key,
          expectedVersion: 0,
          actualVersion: current?.version ?? null,
        });
      }
      continue;
    }

    if (op.action === "update") {
      const updated = await TableObjectModel.findOneAndUpdate(
        { gameSessionId: sessionOid, key: op.key, version: op.baseVersion },
        {
          $set: {
            ...(op.patch.x !== undefined ? { x: op.patch.x } : {}),
            ...(op.patch.y !== undefined ? { y: op.patch.y } : {}),
            ...(op.patch.sortOrder !== undefined ? { sortOrder: op.patch.sortOrder } : {}),
            ...(op.patch.props !== undefined ? { props: op.patch.props } : {}),
          },
          $inc: { version: 1 },
        },
        { new: true }
      ).lean();

      if (!updated) {
        const current = await TableObjectModel.findOne({ gameSessionId: sessionOid, key: op.key })
          .select({ version: 1 })
          .lean();
        conflicts.push({
          opId: op.opId,
          key: op.key,
          expectedVersion: op.baseVersion,
          actualVersion: current?.version ?? null,
        });
      } else {
        applied.push({
          opId: op.opId,
          action: "update",
          key: op.key,
          baseVersion: op.baseVersion,
          version: updated.version,
          patch: op.patch,
        });
      }
      continue;
    }

    if (op.action === "delete") {
      const res = await TableObjectModel.deleteOne({
        gameSessionId: sessionOid,
        key: op.key,
        version: op.baseVersion,
      });

      if (res.deletedCount === 1) {
        applied.push({
          opId: op.opId,
          action: "delete",
          key: op.key,
          baseVersion: op.baseVersion,
          version: op.baseVersion + 1,
        });
      } else {
        const current = await TableObjectModel.findOne({ gameSessionId: sessionOid, key: op.key })
          .select({ version: 1 })
          .lean();
        conflicts.push({
          opId: op.opId,
          key: op.key,
          expectedVersion: op.baseVersion,
          actualVersion: current?.version ?? null,
        });
      }
    }
  }

  return { applied, conflicts };
}

