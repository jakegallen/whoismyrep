import { describe, it, expect, beforeEach } from "vitest";

// We test the localStorage logic directly rather than through React hooks,
// since useSyncExternalStore is harder to test in isolation.

const STORAGE_KEY = "whoismyrep-saved-reps";

interface SavedRep {
  name: string;
  office: string;
  level: string;
  party: string;
  divisionId: string;
  savedAt: string;
}

function getSavedReps(): SavedRep[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as SavedRep[]) : [];
  } catch {
    return [];
  }
}

function persist(reps: SavedRep[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(reps));
}

function repKey(rep: { name: string; office: string }): string {
  return `${rep.name}::${rep.office}`.toLowerCase();
}

const mockRep: SavedRep = {
  name: "Jane Doe",
  office: "U.S. Senator",
  level: "federal",
  party: "Democratic",
  divisionId: "ocd-division/country:us/state:ny",
  savedAt: new Date().toISOString(),
};

const mockRep2: SavedRep = {
  name: "John Smith",
  office: "Governor",
  level: "state",
  party: "Republican",
  divisionId: "ocd-division/country:us/state:tx",
  savedAt: new Date().toISOString(),
};

describe("Saved Reps localStorage logic", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("returns empty array when no saved reps", () => {
    expect(getSavedReps()).toEqual([]);
  });

  it("persists a rep to localStorage", () => {
    persist([mockRep]);
    const saved = getSavedReps();
    expect(saved).toHaveLength(1);
    expect(saved[0].name).toBe("Jane Doe");
  });

  it("persists multiple reps", () => {
    persist([mockRep, mockRep2]);
    const saved = getSavedReps();
    expect(saved).toHaveLength(2);
  });

  it("generates correct rep keys", () => {
    expect(repKey(mockRep)).toBe("jane doe::u.s. senator");
    expect(repKey(mockRep2)).toBe("john smith::governor");
  });

  it("detects duplicate by repKey", () => {
    const reps = [mockRep];
    const key = repKey(mockRep);
    const isDuplicate = reps.some((r) => repKey(r) === key);
    expect(isDuplicate).toBe(true);
  });

  it("does not false-match different reps", () => {
    const reps = [mockRep];
    const key = repKey(mockRep2);
    const isDuplicate = reps.some((r) => repKey(r) === key);
    expect(isDuplicate).toBe(false);
  });

  it("removes a rep by filtering", () => {
    persist([mockRep, mockRep2]);
    const key = repKey(mockRep);
    const filtered = getSavedReps().filter((r) => repKey(r) !== key);
    persist(filtered);
    const saved = getSavedReps();
    expect(saved).toHaveLength(1);
    expect(saved[0].name).toBe("John Smith");
  });

  it("clears all saved reps", () => {
    persist([mockRep, mockRep2]);
    persist([]);
    expect(getSavedReps()).toEqual([]);
  });

  it("handles corrupted localStorage gracefully", () => {
    localStorage.setItem(STORAGE_KEY, "not valid json{{{");
    expect(getSavedReps()).toEqual([]);
  });

  it("handles empty localStorage value", () => {
    localStorage.setItem(STORAGE_KEY, "");
    expect(getSavedReps()).toEqual([]);
  });
});
