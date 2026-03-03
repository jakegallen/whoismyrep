import { useCallback, useSyncExternalStore } from "react";
import { US_STATES } from "@/lib/usStates";

// ══════════════════════════════════════════════════════════
// Home State store
// ══════════════════════════════════════════════════════════

const STATE_KEY = "whoismyrep-home-state";

let cachedStateSnapshot: string | null | undefined = undefined;

function getStateSnapshot(): string | null {
  if (cachedStateSnapshot !== undefined) return cachedStateSnapshot;
  try {
    cachedStateSnapshot = localStorage.getItem(STATE_KEY) || null;
  } catch {
    cachedStateSnapshot = null;
  }
  return cachedStateSnapshot;
}

function getStateServerSnapshot(): string | null {
  return null;
}

const stateListeners = new Set<() => void>();

function subscribeState(cb: () => void): () => void {
  stateListeners.add(cb);
  return () => stateListeners.delete(cb);
}

function emitStateChange() {
  cachedStateSnapshot = undefined;
  for (const cb of stateListeners) cb();
}

function persistState(abbr: string | null) {
  try {
    if (abbr) {
      localStorage.setItem(STATE_KEY, abbr.toUpperCase());
    } else {
      localStorage.removeItem(STATE_KEY);
    }
  } catch {
    // quota exceeded — fail silently
  }
  emitStateChange();
}

// ══════════════════════════════════════════════════════════
// Home District store
// ══════════════════════════════════════════════════════════

const DISTRICT_KEY = "whoismyrep-home-district";

let cachedDistrictSnapshot: string | null | undefined = undefined;

function getDistrictSnapshot(): string | null {
  if (cachedDistrictSnapshot !== undefined) return cachedDistrictSnapshot;
  try {
    cachedDistrictSnapshot = localStorage.getItem(DISTRICT_KEY) || null;
  } catch {
    cachedDistrictSnapshot = null;
  }
  return cachedDistrictSnapshot;
}

function getDistrictServerSnapshot(): string | null {
  return null;
}

const districtListeners = new Set<() => void>();

function subscribeDistrict(cb: () => void): () => void {
  districtListeners.add(cb);
  return () => districtListeners.delete(cb);
}

function emitDistrictChange() {
  cachedDistrictSnapshot = undefined;
  for (const cb of districtListeners) cb();
}

function persistDistrict(district: string | null) {
  try {
    if (district) {
      localStorage.setItem(DISTRICT_KEY, district);
    } else {
      localStorage.removeItem(DISTRICT_KEY);
    }
  } catch {
    // quota exceeded — fail silently
  }
  emitDistrictChange();
}

// ══════════════════════════════════════════════════════════
// Cross-tab sync
// ══════════════════════════════════════════════════════════

if (typeof window !== "undefined") {
  window.addEventListener("storage", (e) => {
    if (e.key === STATE_KEY) emitStateChange();
    if (e.key === DISTRICT_KEY) emitDistrictChange();
  });
}

// ══════════════════════════════════════════════════════════
// Hook
// ══════════════════════════════════════════════════════════

export function useHomeState() {
  const homeState = useSyncExternalStore(subscribeState, getStateSnapshot, getStateServerSnapshot);
  const homeDistrict = useSyncExternalStore(subscribeDistrict, getDistrictSnapshot, getDistrictServerSnapshot);

  const setHomeState = useCallback((abbr: string) => {
    const upper = abbr.toUpperCase();
    const currentState = getStateSnapshot();
    // Clear district when switching to a different state
    if (currentState && currentState !== upper) {
      persistDistrict(null);
    }
    persistState(upper);
  }, []);

  const clearHomeState = useCallback(() => {
    persistState(null);
    persistDistrict(null); // district depends on state
  }, []);

  const setHomeDistrict = useCallback((district: string) => {
    persistDistrict(district);
  }, []);

  const clearHomeDistrict = useCallback(() => {
    persistDistrict(null);
  }, []);

  const stateName = homeState
    ? US_STATES.find((s) => s.abbr === homeState)?.name || homeState
    : null;

  return {
    homeState,
    setHomeState,
    clearHomeState,
    stateName,
    homeDistrict,
    setHomeDistrict,
    clearHomeDistrict,
  } as const;
}
