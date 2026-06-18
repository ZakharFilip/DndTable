import type { TabletopBaseObject } from "@dnd-table/shared";
import type { TableObjectState } from "../model";
import { transformPositionPatch } from "../../pages/sessionTable/helpers";

export type UpdatePatch = {
  x?: number;
  y?: number;
  sortOrder?: number;
  props?: Record<string, unknown>;
};

export type CommitPlan = {
  baseVersion: number;
  bumpVersion: boolean;
  patch: UpdatePatch;
};

export type SanitizePropsResult =
  | { ok: true; props: Record<string, unknown> }
  | { ok: false; reason: string };

/** Strips ACL/sprite hazards before props are sent to the server. */
export function sanitizePropsForSync(obj: TabletopBaseObject): SanitizePropsResult {
  const cloned = JSON.parse(JSON.stringify(obj)) as TabletopBaseObject;
  cloned.ownerUserId = null;
  const sprite = cloned.appearance?.sprite;
  if (typeof sprite === "string" && sprite.startsWith("data:")) {
    return { ok: false, reason: "INLINE_SPRITE_NOT_ALLOWED" };
  }
  return { ok: true, props: cloned as unknown as Record<string, unknown> };
}

/**
 * Decides optimistic version bumps and update patch shape for acked vs unacked creates.
 * Unacked updates are merged into pending creates by TableSync.
 */
export class ObjectMutationPlanner {
  private unackedCreates: { current: Set<string> };

  constructor(unackedCreates: { current: Set<string> }) {
    this.unackedCreates = unackedCreates;
  }

  isUnacked(key: string): boolean {
    return this.unackedCreates.current.has(key);
  }

  getPendingCreateKeys(): string[] {
    return [...this.unackedCreates.current];
  }

  private planUpdate(state: TableObjectState, patch: UpdatePatch): CommitPlan {
    const unacked = this.isUnacked(state.key);
    return {
      baseVersion: state.version,
      bumpVersion: !unacked,
      patch,
    };
  }

  planTransformCommit(state: TableObjectState, obj: TabletopBaseObject): CommitPlan | null {
    if (this.isUnacked(state.key)) {
      return this.planTransformCommitUnacked(state, obj);
    }
    return this.planTransformCommitAcked(state, obj);
  }

  /** Acked objects: full props so DB props.transform stays in sync on reload. */
  planTransformCommitAcked(state: TableObjectState, obj: TabletopBaseObject): CommitPlan | null {
    const sanitized = sanitizePropsForSync(obj);
    if (!sanitized.ok) return null;
    return this.planUpdate(state, {
      x: obj.transform.position.x,
      y: obj.transform.position.y,
      props: sanitized.props,
    });
  }

  /** Unacked creates: position-only patch merged into pending create by TableSync. */
  planTransformCommitUnacked(state: TableObjectState, obj: TabletopBaseObject): CommitPlan {
    return this.planUpdate(state, transformPositionPatch(obj));
  }

  planPropsCommit(state: TableObjectState, obj: TabletopBaseObject): CommitPlan | null {
    const sanitized = sanitizePropsForSync(obj);
    if (!sanitized.ok) return null;
    return this.planUpdate(state, { props: sanitized.props });
  }

  planFullCommit(
    state: TableObjectState,
    nextObj: TabletopBaseObject
  ): CommitPlan | null {
    const sanitized = sanitizePropsForSync(nextObj);
    if (!sanitized.ok) return null;
    return this.planUpdate(state, {
      x: nextObj.transform.position.x,
      y: nextObj.transform.position.y,
      sortOrder: state.sortOrder,
      props: sanitized.props,
    });
  }

  planTransformBatch(
    states: TableObjectState[],
    latestByKey: Map<string, TableObjectState>
  ): {
    unacked: Array<{ key: string; plan: CommitPlan }>;
    acked: Array<{ key: string; plan: CommitPlan }>;
  } {
    const unacked: Array<{ key: string; plan: CommitPlan }> = [];
    const acked: Array<{ key: string; plan: CommitPlan }> = [];

    for (const state of states) {
      const latest = latestByKey.get(state.key) ?? state;
      const plan = this.planTransformCommit(latest, latest.obj);
      if (!plan) continue;
      if (plan.bumpVersion) {
        acked.push({ key: state.key, plan });
      } else {
        unacked.push({ key: state.key, plan });
      }
    }

    return { unacked, acked };
  }
}
