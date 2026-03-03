import { useCallback, useSyncExternalStore } from "react";
import type { Bill } from "./useBills";

// ── Types ──

export interface SavedBill extends Bill {
  /** ISO timestamp when the bill was saved */
  savedAt: string;
  /** Jurisdiction string at time of save (needed to navigate back to detail) */
  jurisdiction: string;
}

// ── Storage key ──

const STORAGE_KEY = "whoismyrep-saved-bills";

// ── External-store plumbing (mirrors useSavedReps pattern) ──

/** In-memory snapshot to avoid parsing JSON on every render */
let cachedSnapshot: SavedBill[] | null = null;

function getSnapshot(): SavedBill[] {
  if (cachedSnapshot) return cachedSnapshot;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    cachedSnapshot = raw ? (JSON.parse(raw) as SavedBill[]) : [];
  } catch {
    cachedSnapshot = [];
  }
  return cachedSnapshot;
}

function getServerSnapshot(): SavedBill[] {
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

function persist(bills: SavedBill[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(bills));
  } catch {
    // quota exceeded — fail silently
  }
  emitChange();
}

// ── Hook ──

export function useSavedBills() {
  const savedBills = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const isSaved = useCallback(
    (bill: { id: string }): boolean => {
      return savedBills.some((b) => b.id === bill.id);
    },
    [savedBills],
  );

  const saveBill = useCallback(
    (bill: Bill, jurisdiction: string) => {
      const current = getSnapshot();
      if (current.some((b) => b.id === bill.id)) return; // already saved
      persist([...current, { ...bill, savedAt: new Date().toISOString(), jurisdiction }]);
    },
    [],
  );

  const removeSavedBill = useCallback(
    (bill: { id: string }) => {
      persist(getSnapshot().filter((b) => b.id !== bill.id));
    },
    [],
  );

  const toggleSaved = useCallback(
    (bill: Bill, jurisdiction: string) => {
      if (isSaved(bill)) {
        removeSavedBill(bill);
      } else {
        saveBill(bill, jurisdiction);
      }
    },
    [isSaved, removeSavedBill, saveBill],
  );

  const clearAll = useCallback(() => {
    persist([]);
  }, []);

  return {
    savedBills,
    isSaved,
    saveBill,
    removeSavedBill,
    toggleSaved,
    clearAll,
    count: savedBills.length,
  } as const;
}
