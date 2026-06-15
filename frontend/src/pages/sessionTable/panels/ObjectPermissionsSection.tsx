import { useEffect, useMemo, useState } from "react";
import type { AccessSnapshot, Permission } from "@dnd-table/shared";
import { PERMISSIONS } from "@dnd-table/shared";
import { setObjectPermissionGrant, setObjectVisibilityGrant } from "../../../api/access";
import { GRANT_UI_LABELS, PERM_LABELS, VISIBILITY_UI_LABELS } from "./permissionUiLabels";

type PermTri = "Undefined" | "Allow" | "Deny";
type VisTri = "Inherit" | "Visible" | "Hidden";
type PermUi = PermTri | "Mixed";
type VisUi = VisTri | "Mixed";

interface ObjectPermissionsSectionProps {
  sessionId: string;
  objectKeys: string[];
  access: AccessSnapshot;
  canManage: boolean;
  onChanged: () => void;
}

function localPerm(
  access: AccessSnapshot,
  objectKey: string,
  teamId: string,
  permission: Permission
): PermTri {
  const g = access.objectPermissionGrants.find(
    (x) => x.objectKey === objectKey && x.teamId === teamId && x.permission === permission
  );
  return g ? g.value : "Undefined";
}

function localVis(access: AccessSnapshot, objectKey: string, teamId: string): VisTri {
  const g = access.objectVisibilityGrants.find(
    (x) => x.objectKey === objectKey && x.teamId === teamId
  );
  return g ? g.value : "Inherit";
}

function aggregatePerm(
  access: AccessSnapshot,
  objectKeys: string[],
  teamId: string,
  permission: Permission
): PermUi {
  if (objectKeys.length === 0) return "Undefined";
  const values = objectKeys.map((k) => localPerm(access, k, teamId, permission));
  const first = values[0];
  return values.every((v) => v === first) ? first : "Mixed";
}

function aggregateVis(
  access: AccessSnapshot,
  objectKeys: string[],
  teamId: string
): VisUi {
  if (objectKeys.length === 0) return "Inherit";
  const values = objectKeys.map((k) => localVis(access, k, teamId));
  const first = values[0];
  return values.every((v) => v === first) ? first : "Mixed";
}

function teamIdsWithLocalRules(
  access: AccessSnapshot,
  objectKeys: string[]
): string[] {
  const ids = new Set<string>();
  for (const objectKey of objectKeys) {
    for (const g of access.objectPermissionGrants) {
      if (g.objectKey === objectKey) ids.add(g.teamId);
    }
    for (const g of access.objectVisibilityGrants) {
      if (g.objectKey === objectKey) ids.add(g.teamId);
    }
  }
  return Array.from(ids);
}

function initialRowTeamIds(
  access: AccessSnapshot,
  objectKeys: string[],
  configurableTeamIds: string[]
): string[] {
  const fromGrants = teamIdsWithLocalRules(access, objectKeys).filter((id) =>
    configurableTeamIds.includes(id)
  );
  if (fromGrants.length > 0) return fromGrants;
  if (configurableTeamIds.length > 0) return [configurableTeamIds[0]];
  return [];
}

function selectionKey(objectKeys: string[]) {
  return [...objectKeys].sort().join("|");
}

interface TeamPermissionRowProps {
  sessionId: string;
  objectKeys: string[];
  access: AccessSnapshot;
  teamId: string;
  teams: Array<{ id: string; name: string }>;
  usedTeamIds: Set<string>;
  canManage: boolean;
  canRemove: boolean;
  onTeamChange: (newTeamId: string) => void;
  onRemove: () => void;
  onChanged: () => void;
}

function TeamPermissionRow({
  sessionId,
  objectKeys,
  access,
  teamId,
  teams,
  usedTeamIds,
  canManage,
  canRemove,
  onTeamChange,
  onRemove,
  onChanged,
}: TeamPermissionRowProps) {
  const run = async (fn: () => Promise<unknown>) => {
    try {
      await fn();
      await onChanged();
    } catch {
      /* ignore */
    }
  };

  const teamOptions = teams.filter((t) => t.id === teamId || !usedTeamIds.has(t.id));

  const applyVisibility = (value: VisTri | null) => {
    const apiValue: "Visible" | "Hidden" | null =
      value === "Visible" || value === "Hidden" ? value : null;
    run(() =>
      Promise.all(
        objectKeys.map((objectKey) =>
          setObjectVisibilityGrant(sessionId, {
            objectKey,
            teamId,
            value: apiValue,
          })
        )
      )
    );
  };

  const applyPermission = (permission: Permission, value: PermTri | null) => {
    const apiValue: "Allow" | "Deny" | null =
      value === "Allow" || value === "Deny" ? value : null;
    run(() =>
      Promise.all(
        objectKeys.map((objectKey) =>
          setObjectPermissionGrant(sessionId, {
            objectKey,
            teamId,
            permission,
            value: apiValue,
          })
        )
      )
    );
  };

  const visValue = aggregateVis(access, objectKeys, teamId);

  return (
    <div className="border border-border rounded p-2 space-y-2 bg-background">
      <div className="flex items-center gap-2">
        <select
          className="flex-1 border border-border rounded px-2 py-1 text-sm bg-surface"
          value={teamId}
          disabled={!canManage}
          onChange={(e) => onTeamChange(e.target.value)}
        >
          {teamOptions.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
        {canRemove && (
          <button
            type="button"
            disabled={!canManage}
            className="px-2 py-1 text-xs text-text-secondary border border-border rounded hover:bg-surface disabled:opacity-50"
            title="Убрать строку"
            onClick={onRemove}
          >
            −
          </button>
        )}
      </div>

      <label className="block text-xs text-text-secondary">
        Видимость
        <select
          disabled={!canManage}
          className="mt-1 w-full border border-border rounded px-2 py-1 text-sm bg-surface"
          value={visValue}
          onChange={(e) => {
            const raw = e.target.value as VisUi;
            if (raw === "Mixed") return;
            applyVisibility(raw === "Inherit" ? null : raw);
          }}
        >
          {visValue === "Mixed" && (
            <option value="Mixed" disabled>
              {VISIBILITY_UI_LABELS.Mixed}
            </option>
          )}
          <option value="Inherit">{VISIBILITY_UI_LABELS.Inherit}</option>
          <option value="Visible">{VISIBILITY_UI_LABELS.Visible}</option>
          <option value="Hidden">{VISIBILITY_UI_LABELS.Hidden}</option>
        </select>
      </label>

      {PERMISSIONS.map((perm) => {
        const permValue = aggregatePerm(access, objectKeys, teamId, perm);
        return (
          <label key={perm} className="flex items-center justify-between text-xs text-text-secondary gap-2">
            <span className="truncate">{PERM_LABELS[perm]}</span>
            <select
              disabled={!canManage}
              className="border border-border rounded px-1 py-0.5 text-xs bg-surface"
              value={permValue}
              onChange={(e) => {
                const raw = e.target.value as PermUi;
                if (raw === "Mixed") return;
                applyPermission(perm, raw === "Undefined" ? null : raw);
              }}
            >
              {permValue === "Mixed" && (
                <option value="Mixed" disabled>
                  {GRANT_UI_LABELS.Mixed}
                </option>
              )}
              <option value="Undefined">{GRANT_UI_LABELS.Undefined}</option>
              <option value="Allow">{GRANT_UI_LABELS.Allow}</option>
              <option value="Deny">{GRANT_UI_LABELS.Deny}</option>
            </select>
          </label>
        );
      })}
    </div>
  );
}

export function ObjectPermissionsSection({
  sessionId,
  objectKeys,
  access,
  canManage,
  onChanged,
}: ObjectPermissionsSectionProps) {
  const teams = useMemo(
    () =>
      access.teams
        .filter((t) => t.slug !== "session-owner")
        .map((t) => ({ id: t.id, name: t.name })),
    [access.teams]
  );
  const configurableTeamIds = useMemo(() => teams.map((t) => t.id), [teams]);
  const selKey = selectionKey(objectKeys);

  const [rowTeamIds, setRowTeamIds] = useState<string[]>(() =>
    initialRowTeamIds(access, objectKeys, configurableTeamIds)
  );
  const [addPanelOpen, setAddPanelOpen] = useState(false);
  const [pickedTeamIds, setPickedTeamIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    setRowTeamIds(initialRowTeamIds(access, objectKeys, configurableTeamIds));
    setAddPanelOpen(false);
    setPickedTeamIds(new Set());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selKey]);

  const usedTeamIds = useMemo(() => new Set(rowTeamIds), [rowTeamIds]);
  const availableToAdd = useMemo(
    () => teams.filter((t) => !usedTeamIds.has(t.id)),
    [teams, usedTeamIds]
  );

  const togglePicked = (teamId: string) => {
    setPickedTeamIds((prev) => {
      const next = new Set(prev);
      if (next.has(teamId)) next.delete(teamId);
      else next.add(teamId);
      return next;
    });
  };

  const confirmAddTeams = () => {
    const toAdd = [...pickedTeamIds].filter((id) => !usedTeamIds.has(id));
    if (toAdd.length > 0) {
      setRowTeamIds((prev) => [...prev, ...toAdd]);
    }
    setPickedTeamIds(new Set());
    setAddPanelOpen(false);
  };

  const addAllRemaining = () => {
    const ids = availableToAdd.map((t) => t.id);
    if (ids.length > 0) setRowTeamIds((prev) => [...prev, ...ids]);
    setAddPanelOpen(false);
    setPickedTeamIds(new Set());
  };

  if (teams.length === 0 || objectKeys.length === 0) return null;

  const multi = objectKeys.length > 1;

  return (
    <div className="border-t border-border pt-3 mt-3 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <div>
          <div className="text-xs font-medium text-text-secondary">
            {multi ? `Разрешения (${objectKeys.length} объектов)` : "Разрешения объекта"}
          </div>
          {multi && (
            <div className="text-[10px] text-text-muted mt-0.5">
              Изменения применяются ко всем выделенным
            </div>
          )}
        </div>
        {canManage && availableToAdd.length > 0 && (
          <button
            type="button"
            className="px-2 py-0.5 text-xs border border-border rounded hover:bg-background"
            title="Добавить настройки для одной или нескольких команд"
            onClick={() => {
              setAddPanelOpen((o) => !o);
              setPickedTeamIds(new Set());
            }}
          >
            + Команды
          </button>
        )}
      </div>

      {addPanelOpen && canManage && availableToAdd.length > 0 && (
        <div className="border border-primary/30 rounded p-2 bg-primary-muted/50 space-y-2">
          <div className="text-xs text-text-secondary">Выберите команды для добавления:</div>
          <ul className="max-h-32 overflow-auto space-y-1">
            {availableToAdd.map((t) => (
              <li key={t.id}>
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    checked={pickedTeamIds.has(t.id)}
                    onChange={() => togglePicked(t.id)}
                  />
                  {t.name}
                </label>
              </li>
            ))}
          </ul>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={pickedTeamIds.size === 0}
              className="px-2 py-1 text-xs bg-primary text-white rounded disabled:opacity-50"
              onClick={confirmAddTeams}
            >
              Добавить выбранные ({pickedTeamIds.size})
            </button>
            <button
              type="button"
              className="px-2 py-1 text-xs border border-border rounded hover:bg-surface"
              onClick={addAllRemaining}
            >
              Добавить все ({availableToAdd.length})
            </button>
            <button
              type="button"
              className="px-2 py-1 text-xs text-text-secondary hover:underline"
              onClick={() => {
                setAddPanelOpen(false);
                setPickedTeamIds(new Set());
              }}
            >
              Отмена
            </button>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {rowTeamIds.map((teamId, index) => (
          <TeamPermissionRow
            key={`${teamId}-${index}`}
            sessionId={sessionId}
            objectKeys={objectKeys}
            access={access}
            teamId={teamId}
            teams={teams}
            usedTeamIds={usedTeamIds}
            canManage={canManage}
            canRemove={rowTeamIds.length > 1}
            onTeamChange={(newId) => {
              setRowTeamIds((prev) => prev.map((id, i) => (i === index ? newId : id)));
            }}
            onRemove={() => {
              setRowTeamIds((prev) => prev.filter((_, i) => i !== index));
            }}
            onChanged={onChanged}
          />
        ))}
      </div>
    </div>
  );
}
