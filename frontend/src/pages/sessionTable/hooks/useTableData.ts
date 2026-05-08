import { useCallback, useEffect, useState } from "react";
import { getSessionFull } from "../../../api/sessions";
import { parseSessionFull, type ParsedSession } from "../helpers";

export type LoadStatus = "idle" | "loading" | "loaded" | "error";

/**
 * Fetches the full session payload (state, layers, objects).
 * Returns a stable `fetchFull` callback so callers can re-load on conflict.
 *
 * The caller is responsible for applying the parsed result to component state;
 * this hook intentionally avoids owning that state.
 */
export function useTableData(id: string | undefined) {
  const [loadStatus, setLoadStatus] = useState<LoadStatus>("idle");

  const fetchFull = useCallback(async (): Promise<ParsedSession | null> => {
    if (!id) return null;
    setLoadStatus("loading");
    try {
      const res = await getSessionFull(id);
      const parsed = parseSessionFull(res.data);
      setLoadStatus("loaded");
      return parsed;
    } catch {
      setLoadStatus("error");
      return null;
    }
  }, [id]);

  return { loadStatus, fetchFull };
}

/**
 * Convenience: triggers initial load on mount, applies it via `apply`.
 * Cancels stale results if the id changes or component unmounts.
 */
export function useInitialLoad(
  id: string | undefined,
  fetchFull: () => Promise<ParsedSession | null>,
  apply: (parsed: ParsedSession) => void
) {
  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    fetchFull().then((parsed) => {
      if (cancelled || !parsed) return;
      apply(parsed);
    });
    return () => {
      cancelled = true;
    };
  }, [id, fetchFull, apply]);
}
