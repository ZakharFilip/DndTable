import type { Permission } from "./types.js";

/** Minimal patch shape to avoid circular import with main index. */
export type PatchOpLike =
  | {
      action: "create";
      key: string;
      object?: Record<string, unknown>;
    }
  | {
      action: "update";
      key: string;
      patch: {
        x?: number;
        y?: number;
        sortOrder?: number;
        props?: Record<string, unknown>;
      };
    }
  | { action: "delete"; key: string };

/**
 * Maps tabletop actions / patch ops to required permissions.
 * Game actions stay separate from the permission enum.
 */
export class TableActionRegistry {
  static permissionForPatchOp(op: PatchOpLike): {
    permission: Permission;
    objectKey: string;
    isAclChange?: boolean;
  } {
    switch (op.action) {
      case "create":
        return { permission: "CreateObject", objectKey: op.key };
      case "delete":
        return { permission: "DeleteObject", objectKey: op.key };
      case "update": {
        const patch = op.patch;
        const hasPosition =
          patch.x !== undefined || patch.y !== undefined || patch.sortOrder !== undefined;
        const hasProps = patch.props !== undefined;
        if (hasProps && patch.props && TableActionRegistry.isAclPropsPatch(patch.props)) {
          return {
            permission: "ModifyPermissions",
            objectKey: op.key,
            isAclChange: true,
          };
        }
        if (hasProps && !hasPosition) {
          return { permission: "ChangeObjectProperties", objectKey: op.key };
        }
        if (hasPosition) {
          return { permission: "ModifyTransform", objectKey: op.key };
        }
        return { permission: "ChangeObjectProperties", objectKey: op.key };
      }
      default:
        return { permission: "ChangeObjectProperties", objectKey: "" };
    }
  }

  private static isAclPropsPatch(props: Record<string, unknown>): boolean {
    return (
      props._acl !== undefined ||
      props.ownerUserId !== undefined ||
      (typeof props.metadata === "object" &&
        props.metadata !== null &&
        "_visibility" in (props.metadata as object))
    );
  }

  static permissionForMove(): Permission {
    return "ModifyTransform";
  }

  static permissionForCreate(): Permission {
    return "CreateObject";
  }

  static permissionForDelete(): Permission {
    return "DeleteObject";
  }
}
