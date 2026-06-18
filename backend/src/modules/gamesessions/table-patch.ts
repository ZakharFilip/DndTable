import mongoose from "mongoose";
import type { AppliedOp, TablePatchOp } from "@dnd-table/shared";
import { TableObjectModel } from "./table-object.model";

export type { AppliedOp, TablePatchAction, TablePatchOp } from "@dnd-table/shared";

const MAX_SPRITE_PATH_LEN = 512;

export function validateSpriteInProps(props: Record<string, unknown> | undefined): string | null {
  if (!props || typeof props !== "object") return null;
  const appearance = props.appearance;
  if (!appearance || typeof appearance !== "object") return null;
  const sprite = (appearance as { sprite?: unknown }).sprite;
  if (typeof sprite !== "string") return null;
  if (sprite.startsWith("data:")) return "INLINE_SPRITE_NOT_ALLOWED";
  if (sprite.length > MAX_SPRITE_PATH_LEN) return "SPRITE_PATH_TOO_LONG";
  return null;
}

/** Keep props.transform.position in sync when patch updates only x/y columns. */
export function syncTransformPositionInProps(
  existingProps: Record<string, unknown> | undefined,
  x: number | undefined,
  y: number | undefined
): Record<string, unknown> | undefined {
  if (x === undefined && y === undefined) return undefined;
  const props = JSON.parse(JSON.stringify(existingProps ?? {})) as Record<string, unknown>;
  const transform = props.transform;
  if (!transform || typeof transform !== "object") return undefined;
  const t = transform as { position?: { x?: number; y?: number } };
  const pos = { ...(t.position ?? {}) };
  if (x !== undefined) pos.x = x;
  if (y !== undefined) pos.y = y;
  t.position = pos;
  return props;
}

function rejectSpritePropsConflict(
  op: TablePatchOp,
  conflicts: ApplyPatchResult["conflicts"],
  expectedVersion: number
) {
  conflicts.push({
    opId: op.opId,
    key: op.key,
    expectedVersion,
    actualVersion: null,
  });
}

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
      const spriteError = validateSpriteInProps(op.object.props);
      if (spriteError) {
        rejectSpritePropsConflict(op, conflicts, 0);
        continue;
      }
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
      } catch {
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
      if (op.patch.props !== undefined) {
        const spriteError = validateSpriteInProps(op.patch.props);
        if (spriteError) {
          rejectSpritePropsConflict(op, conflicts, op.baseVersion);
          continue;
        }
      }

      const currentForMerge =
        op.patch.props === undefined &&
        (op.patch.x !== undefined || op.patch.y !== undefined)
          ? await TableObjectModel.findOne({
              gameSessionId: sessionOid,
              key: op.key,
              version: op.baseVersion,
            })
              .select({ props: 1 })
              .lean()
          : null;

      const mergedProps =
        currentForMerge && op.patch.props === undefined
          ? syncTransformPositionInProps(
              (currentForMerge.props ?? {}) as Record<string, unknown>,
              op.patch.x,
              op.patch.y
            )
          : undefined;

      const updated = await TableObjectModel.findOneAndUpdate(
        { gameSessionId: sessionOid, key: op.key, version: op.baseVersion },
        {
          $set: {
            ...(op.patch.x !== undefined ? { x: op.patch.x } : {}),
            ...(op.patch.y !== undefined ? { y: op.patch.y } : {}),
            ...(op.patch.sortOrder !== undefined ? { sortOrder: op.patch.sortOrder } : {}),
            ...(op.patch.props !== undefined ? { props: op.patch.props } : {}),
            ...(mergedProps !== undefined ? { props: mergedProps } : {}),
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
