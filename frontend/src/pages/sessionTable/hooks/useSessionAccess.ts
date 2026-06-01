import { useCallback, useMemo, useState } from "react";
import {
  PermissionResolver,
  VisibilityResolver,
  TEAM_SLUG_SESSION_OWNER,
  type AccessSnapshot,
  type Permission,
  type ViewerContext,
} from "@dnd-table/shared";
import { getSessionAccess } from "../../../api/access";

export function useSessionAccess(sessionId: string | undefined) {
  const [access, setAccess] = useState<AccessSnapshot | null>(null);
  const [viewer, setViewer] = useState<ViewerContext | null>(null);

  const permissionResolver = useMemo(
    () => (access ? new PermissionResolver(access) : null),
    [access]
  );

  const visibilityResolver = useMemo(
    () => (access ? new VisibilityResolver(access) : null),
    [access]
  );

  const setFromFull = useCallback(
    (snapshot: AccessSnapshot | undefined, v: ViewerContext | undefined) => {
      if (snapshot) setAccess(snapshot);
      if (v) setViewer(v);
    },
    []
  );

  const refetch = useCallback(async () => {
    if (!sessionId) return;
    const res = await getSessionAccess(sessionId);
    if (res.success && res.data) {
      setAccess(res.data.access);
      setViewer(res.data.viewer);
    }
  }, [sessionId]);

  const can = useCallback(
    (permission: Permission, objectKey?: string) => {
      if (!permissionResolver || !viewer) return false;
      return permissionResolver.hasPermission(viewer.userId, permission, objectKey);
    },
    [permissionResolver, viewer]
  );

  const isObjectVisible = useCallback(
    (objectKey: string) => {
      if (!visibilityResolver || !viewer) return true;
      return visibilityResolver.isVisible(viewer.userId, objectKey);
    },
    [visibilityResolver, viewer]
  );

  const isOwner = useMemo(() => {
    if (!access || !viewer) return false;
    if (access.config.sessionOwnerUserId === viewer.userId) return true;
    const ownerTeam = access.teams.find((t) => t.slug === TEAM_SLUG_SESSION_OWNER);
    if (!ownerTeam) return false;
    return viewer.teamIds.includes(ownerTeam.id);
  }, [access, viewer]);

  const canManageTeams = useMemo(
    () => isOwner || can("ModifyPermissions"),
    [isOwner, can]
  );

  return {
    access,
    viewer,
    can,
    isObjectVisible,
    isOwner,
    canManageTeams,
    setFromFull,
    refetch,
    setAccess,
    setViewer,
  };
}
