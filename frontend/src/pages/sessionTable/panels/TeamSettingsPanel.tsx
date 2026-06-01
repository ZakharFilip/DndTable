import { useMemo, useState } from "react";
import type { AccessSnapshot, Permission, TeamDto } from "@dnd-table/shared";
import { PERMISSIONS } from "@dnd-table/shared";
import {
  addTeamMember,
  createTeam,
  deleteTeam,
  removeTeamMember,
  setGlobalGrant,
  updateTeam,
} from "../../../api/access";
import {
  formatPlayerTeams,
  playerLabel,
  sortedParticipants,
} from "./teamSettingsHelpers";

const PERM_LABELS: Record<Permission, string> = {
  MoveObject: "Перемещение",
  CreateObject: "Создание",
  DeleteObject: "Удаление",
  ModifyVisibility: "Видимость",
  ModifyPermissions: "Права",
  ModifyTransform: "Трансформ",
  ChangeObjectProperties: "Свойства",
};

type TriState = "Undefined" | "Allow" | "Deny";

interface TeamSettingsPanelProps {
  sessionId: string;
  access: AccessSnapshot;
  canManage: boolean;
  onClose: () => void;
  onChanged: () => void;
}

function teamDepth(teams: TeamDto[], teamId: string): number {
  let d = 0;
  let current = teams.find((t) => t.id === teamId);
  while (current?.parentTeamId) {
    d++;
    current = teams.find((t) => t.id === current!.parentTeamId);
  }
  return d;
}

function sortedTeams(teams: TeamDto[]) {
  return [...teams].sort((a, b) => teamDepth(teams, a.id) - teamDepth(teams, b.id));
}

function globalValueFor(
  access: AccessSnapshot,
  teamId: string,
  permission: Permission
): TriState {
  const g = access.globalGrants.find((x) => x.teamId === teamId && x.permission === permission);
  if (!g) return "Undefined";
  return g.value;
}

export function TeamSettingsPanel({
  sessionId,
  access,
  canManage,
  onClose,
  onChanged,
}: TeamSettingsPanelProps) {
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(
    access.teams[0]?.id ?? null
  );
  const [newTeamName, setNewTeamName] = useState("");
  const [parentForNew, setParentForNew] = useState<string>("");
  const [addPlayerId, setAddPlayerId] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const teams = useMemo(() => sortedTeams(access.teams), [access.teams]);
  const players = useMemo(() => sortedParticipants(access), [access.participants]);
  const selected = teams.find((t) => t.id === selectedTeamId);

  const playersNotInSelected = useMemo(() => {
    if (!selected) return [];
    return players.filter((p) => !p.teamIds.includes(selected.id));
  }, [players, selected]);

  const playersInSelected = useMemo(() => {
    if (!selected) return [];
    return players.filter((p) => p.teamIds.includes(selected.id));
  }, [players, selected]);

  const run = async (fn: () => Promise<unknown>) => {
    setBusy(true);
    setError(null);
    try {
      await fn();
      await onChanged();
      setAddPlayerId("");
    } catch {
      setError("Ошибка операции");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-end bg-black/30">
      <div className="w-full max-w-lg h-full bg-white shadow-xl flex flex-col">
        <header className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
          <h2 className="text-lg font-semibold">Team Settings</h2>
          <button
            type="button"
            className="text-sm text-gray-600 hover:text-gray-900"
            onClick={onClose}
          >
            Закрыть
          </button>
        </header>

        <div className="flex-1 overflow-auto p-4 space-y-4">
          {error && <p className="text-sm text-red-600">{error}</p>}
          {!canManage && (
            <p className="text-sm text-amber-700">Только просмотр — нет прав ModifyPermissions.</p>
          )}

          <section>
            <h3 className="text-xs font-medium text-gray-500 mb-2">
              Игроки за столом ({players.length})
            </h3>
            {players.length === 0 ? (
              <p className="text-sm text-gray-500">Пока никто не заходил в сессию.</p>
            ) : (
              <div className="border border-gray-200 rounded overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-xs text-gray-500">
                    <tr>
                      <th className="text-left font-medium px-2 py-1.5">Игрок</th>
                      <th className="text-left font-medium px-2 py-1.5">Команды</th>
                    </tr>
                  </thead>
                  <tbody>
                    {players.map((p) => (
                      <tr
                        key={p.userId}
                        className={`border-t border-gray-100 ${
                          selected && p.teamIds.includes(selected.id)
                            ? "bg-indigo-50/60"
                            : ""
                        }`}
                      >
                        <td className="px-2 py-1.5 align-top">
                          <div className="font-medium text-gray-900">{playerLabel(p)}</div>
                          <div className="text-[10px] text-gray-400 font-mono truncate max-w-[140px]">
                            {p.userId}
                          </div>
                        </td>
                        <td className="px-2 py-1.5 align-top text-gray-700 text-xs">
                          {formatPlayerTeams(access, p.teamIds)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section>
            <h3 className="text-xs font-medium text-gray-500 mb-2">Команды</h3>
            <ul className="space-y-1 mb-3">
              {teams.map((t) => (
                <li key={t.id}>
                  <button
                    type="button"
                    className={`w-full text-left px-2 py-1 rounded text-sm ${
                      selectedTeamId === t.id
                        ? "bg-indigo-100 text-indigo-900"
                        : "hover:bg-gray-50"
                    }`}
                    style={{ paddingLeft: 8 + teamDepth(teams, t.id) * 16 }}
                    onClick={() => {
                      setSelectedTeamId(t.id);
                      setAddPlayerId("");
                    }}
                  >
                    {t.name}
                    {t.isSystem ? " (system)" : ""}
                    {t.isDefaultForNewUsers ? " ★" : ""}
                  </button>
                </li>
              ))}
            </ul>

            {canManage && (
              <div className="flex flex-col gap-2 border border-gray-200 rounded p-2">
                <input
                  className="border border-gray-300 rounded px-2 py-1 text-sm"
                  placeholder="Новая команда"
                  value={newTeamName}
                  onChange={(e) => setNewTeamName(e.target.value)}
                />
                <select
                  className="border border-gray-300 rounded px-2 py-1 text-sm"
                  value={parentForNew}
                  onChange={(e) => setParentForNew(e.target.value)}
                >
                  <option value="">Без родителя</option>
                  {teams
                    .filter((t) => !t.isSystem || t.slug !== "session-owner")
                    .map((t) => (
                      <option key={t.id} value={t.id}>
                        Родитель: {t.name}
                      </option>
                    ))}
                </select>
                <button
                  type="button"
                  disabled={busy || !newTeamName.trim()}
                  className="px-3 py-1.5 bg-indigo-600 text-white text-sm rounded disabled:opacity-50"
                  onClick={() =>
                    run(async () => {
                      await createTeam(sessionId, {
                        name: newTeamName.trim(),
                        parentTeamId: parentForNew || null,
                      });
                      setNewTeamName("");
                    })
                  }
                >
                  Создать команду
                </button>
              </div>
            )}
          </section>

          {selected && (
            <>
              <section>
                <h3 className="text-xs font-medium text-gray-500 mb-2">
                  {selected.name} — участники ({playersInSelected.length})
                </h3>

                {playersInSelected.length === 0 ? (
                  <p className="text-sm text-gray-500 mb-2">В команде пока никого нет.</p>
                ) : (
                  <ul className="space-y-2 mb-3">
                    {playersInSelected.map((p) => (
                      <li
                        key={p.userId}
                        className="flex items-start justify-between gap-2 border border-gray-200 rounded px-2 py-1.5 bg-white"
                      >
                        <div className="min-w-0">
                          <div className="text-sm font-medium">{playerLabel(p)}</div>
                          <div className="text-xs text-gray-500">
                            Также:{" "}
                            {p.teamIds.filter((id) => id !== selected.id).length > 0
                              ? formatPlayerTeams(
                                  access,
                                  p.teamIds.filter((id) => id !== selected.id)
                                )
                              : "—"}
                          </div>
                        </div>
                        {canManage && selected.slug !== "session-owner" && (
                          <button
                            type="button"
                            disabled={busy}
                            className="shrink-0 text-xs text-red-600 hover:underline disabled:opacity-50"
                            onClick={() =>
                              run(() => removeTeamMember(sessionId, selected.id, p.userId))
                            }
                          >
                            Убрать
                          </button>
                        )}
                      </li>
                    ))}
                  </ul>
                )}

                {canManage && !selected.isSystem && (
                  <div className="flex flex-col gap-2 border border-dashed border-gray-300 rounded p-2">
                    <label className="text-xs text-gray-600">Добавить игрока в команду</label>
                    {playersNotInSelected.length === 0 ? (
                      <p className="text-xs text-gray-500">
                        Все игроки за столом уже в этой команде.
                      </p>
                    ) : (
                      <>
                        <select
                          className="border border-gray-300 rounded px-2 py-1.5 text-sm"
                          value={addPlayerId}
                          disabled={busy}
                          onChange={(e) => setAddPlayerId(e.target.value)}
                        >
                          <option value="">— Выберите игрока —</option>
                          {playersNotInSelected.map((p) => (
                            <option key={p.userId} value={p.userId}>
                              {playerLabel(p)} · сейчас: {formatPlayerTeams(access, p.teamIds)}
                            </option>
                          ))}
                        </select>
                        <button
                          type="button"
                          disabled={busy || !addPlayerId}
                          className="px-3 py-1.5 bg-indigo-600 text-white text-sm rounded disabled:opacity-50"
                          onClick={() =>
                            run(() => addTeamMember(sessionId, selected.id, addPlayerId))
                          }
                        >
                          Добавить в «{selected.name}»
                        </button>
                      </>
                    )}
                  </div>
                )}
              </section>

              <section>
                <h3 className="text-xs font-medium text-gray-500 mb-2">Глобальные разрешения</h3>
                {selected.slug === "session-owner" ? (
                  <p className="text-sm text-gray-500">Session Owner — все права.</p>
                ) : (
                  <div className="space-y-2">
                    {PERMISSIONS.map((perm) => {
                      const val = globalValueFor(access, selected.id, perm);
                      return (
                        <label key={perm} className="flex items-center justify-between text-sm gap-2">
                          <span>{PERM_LABELS[perm]}</span>
                          <select
                            disabled={!canManage || busy}
                            className="border border-gray-300 rounded px-2 py-0.5 text-sm"
                            value={val}
                            onChange={(e) => {
                              const v = e.target.value as TriState;
                              run(() =>
                                setGlobalGrant(sessionId, {
                                  teamId: selected.id,
                                  permission: perm,
                                  value: v === "Undefined" ? null : v,
                                })
                              );
                            }}
                          >
                            <option value="Undefined">—</option>
                            <option value="Allow">Allow</option>
                            <option value="Deny">Deny</option>
                          </select>
                        </label>
                      );
                    })}
                  </div>
                )}
              </section>

              {canManage && !selected.isSystem && (
                <section className="flex flex-wrap gap-2">
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={selected.isDefaultForNewUsers}
                      disabled={busy}
                      onChange={(e) =>
                        run(() =>
                          updateTeam(sessionId, selected.id, {
                            isDefaultForNewUsers: e.target.checked,
                          })
                        )
                      }
                    />
                    Команда по умолчанию для новых
                  </label>
                  <button
                    type="button"
                    disabled={busy}
                    className="px-3 py-1.5 text-sm text-red-700 border border-red-200 rounded"
                    onClick={() => {
                      if (!window.confirm(`Удалить команду ${selected.name}?`)) return;
                      run(() => deleteTeam(sessionId, selected.id));
                    }}
                  >
                    Удалить команду
                  </button>
                </section>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
