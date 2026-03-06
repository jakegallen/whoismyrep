import { useCallback, useSyncExternalStore } from "react";

const STORAGE_KEY = "whoismyrep-recent-pages";
const MAX_ITEMS = 5;

export interface RecentPage {
  path: string;
  title: string;
  subtitle?: string;
  type: "politician" | "bill" | "state";
  visitedAt: string; // ISO
}

let listeners: Array<() => void> = [];

function emitChange() {
  for (const listener of listeners) listener();
}

function getSnapshot(): RecentPage[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

let cachedSnapshot = getSnapshot();

function subscribe(listener: () => void) {
  listeners = [...listeners, listener];
  return () => {
    listeners = listeners.filter((l) => l !== listener);
  };
}

function getSnapshotStable() {
  const fresh = getSnapshot();
  if (JSON.stringify(fresh) !== JSON.stringify(cachedSnapshot)) {
    cachedSnapshot = fresh;
  }
  return cachedSnapshot;
}

export function useRecentPages() {
  const pages = useSyncExternalStore(subscribe, getSnapshotStable);

  const recordVisit = useCallback(
    (page: Omit<RecentPage, "visitedAt">) => {
      const existing = getSnapshot();
      // Remove any previous visit to same path
      const filtered = existing.filter((p) => p.path !== page.path);
      const entry: RecentPage = { ...page, visitedAt: new Date().toISOString() };
      const updated = [entry, ...filtered].slice(0, MAX_ITEMS);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      cachedSnapshot = updated;
      emitChange();
    },
    [],
  );

  return { recentPages: pages, recordVisit } as const;
}
