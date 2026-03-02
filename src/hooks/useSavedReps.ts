import { useCallback, useSyncExternalStore } from "react";
import type { CivicRep } from "./useCivicReps";

// ── Types ──

export interface SavedRep extends CivicRep {
  /** ISO timestamp when the rep was saved */
  savedAt: string;
}

// ── Storage key ──

const STORAGE_KEY = "whoismyrep-saved-reps";

// ── External-store plumbing (no Context needed) ──

/** In-memory snapshot to avoid parsing JSON on every render */
let cachedSnapshot: SavedRep[] | null = null;

function getSnapshot(): SavedRep[] {
  if (cachedSnapshot) return cachedSnapshot;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    cachedSnapshot = raw ? (JSON.parse(raw) as SavedRep[]) : [];
  } catch {
    cachedSnapshot = [];
  }
  return cachedSnapshot;
}

function getServerSnapshot(): SavedRep[] {
  return [];
}

/** Set of subscribed listeners — notified whenever the store changes. */
const listeners = new Set<() => void>();

function subscribe(cb: () => void): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

function emitChange() {
  cachedSnapshot = null; // bust cache → getSnapshot re-reads localStorage
  for (const cb of listeners) cb();
}

/** Listen for changes from *other* tabs via the storage event. */
if (typeof window !== "undefined") {
  window.addEventListener("storage", (e) => {
    if (e.key === STORAGE_KEY) emitChange();
  });
}

// ── Persistence helpers ──

function persist(reps: SavedRep[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(reps));
  } catch {
    // quota exceeded — fail silently
  }
  emitChange();
}

/** Generate a stable key for de-duplication (name + office). */
function repKey(rep: { name: string; office: string }): string {
  return `${rep.name}::${rep.office}`.toLowerCase();
}

// ── Hook ──

export function useSavedReps() {
  const savedReps = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const isSaved = useCallback(
    (rep: { name: string; office: string }): boolean => {
      const key = repKey(rep);
      return savedReps.some((r) => repKey(r) === key);
    },
    [savedReps],
  );

  const saveRep = useCallback(
    (rep: CivicRep) => {
      const key = repKey(rep);
      const current = getSnapshot();
      if (current.some((r) => repKey(r) === key)) return; // already saved
      persist([...current, { ...rep, savedAt: new Date().toISOString() }]);
    },
    [],
  );

  const removeSavedRep = useCallback(
    (rep: { name: string; office: string }) => {
      const key = repKey(rep);
      persist(getSnapshot().filter((r) => repKey(r) !== key));
    },
    [],
  );

  const toggleSaved = useCallback(
    (rep: CivicRep) => {
      if (isSaved(rep)) {
        removeSavedRep(rep);
      } else {
        saveRep(rep);
      }
    },
    [isSaved, removeSavedRep, saveRep],
  );

  const clearAll = useCallback(() => {
    persist([]);
  }, []);

  return {
    savedReps,
    isSaved,
    saveRep,
    removeSavedRep,
    toggleSaved,
    clearAll,
    count: savedReps.length,
  } as const;
}
