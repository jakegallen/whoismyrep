import { describe, it, expect } from "vitest";
import {
  US_STATES,
  abbrToJurisdiction,
  abbrToOcdJurisdiction,
  detectStateFromTimezone,
} from "../usStates";
// USState type is tested implicitly via the array shape checks

describe("US_STATES", () => {
  it("contains 52 entries (50 states + DC + PR)", () => {
    expect(US_STATES).toHaveLength(52);
  });

  it("includes Puerto Rico", () => {
    const pr = US_STATES.find((s) => s.abbr === "PR");
    expect(pr).toBeDefined();
    expect(pr!.name).toBe("Puerto Rico");
  });

  it("includes District of Columbia", () => {
    const dc = US_STATES.find((s) => s.abbr === "DC");
    expect(dc).toBeDefined();
    expect(dc!.name).toBe("District of Columbia");
  });

  it("has correct shape for every entry", () => {
    for (const state of US_STATES) {
      expect(state).toHaveProperty("name");
      expect(state).toHaveProperty("abbr");
      expect(state).toHaveProperty("jurisdiction");
      expect(state.name.length).toBeGreaterThan(0);
      expect(state.abbr).toMatch(/^[A-Z]{2}$/);
      expect(state.jurisdiction.length).toBeGreaterThan(0);
    }
  });

  it("has unique abbreviations", () => {
    const abbrs = US_STATES.map((s) => s.abbr);
    expect(new Set(abbrs).size).toBe(abbrs.length);
  });

  it("has unique names", () => {
    const names = US_STATES.map((s) => s.name);
    expect(new Set(names).size).toBe(names.length);
  });

  it("includes a sample of known states", () => {
    const knownPairs: [string, string][] = [
      ["CA", "California"],
      ["TX", "Texas"],
      ["NY", "New York"],
      ["FL", "Florida"],
      ["AL", "Alabama"],
      ["WY", "Wyoming"],
    ];
    for (const [abbr, name] of knownPairs) {
      const state = US_STATES.find((s) => s.abbr === abbr);
      expect(state).toBeDefined();
      expect(state!.name).toBe(name);
    }
  });
});

describe("abbrToJurisdiction", () => {
  it("converts a valid abbreviation to jurisdiction name", () => {
    expect(abbrToJurisdiction("CA")).toBe("California");
    expect(abbrToJurisdiction("NY")).toBe("New York");
    expect(abbrToJurisdiction("TX")).toBe("Texas");
  });

  it("is case-insensitive", () => {
    expect(abbrToJurisdiction("ca")).toBe("California");
    expect(abbrToJurisdiction("ny")).toBe("New York");
  });

  it("returns the input for unknown abbreviations", () => {
    expect(abbrToJurisdiction("XX")).toBe("XX");
    expect(abbrToJurisdiction("ZZ")).toBe("ZZ");
  });

  it("handles DC", () => {
    expect(abbrToJurisdiction("DC")).toBe("District of Columbia");
  });

  it("handles PR", () => {
    expect(abbrToJurisdiction("PR")).toBe("Puerto Rico");
  });
});

describe("abbrToOcdJurisdiction", () => {
  it("generates standard state OCD slug", () => {
    expect(abbrToOcdJurisdiction("CA")).toBe(
      "ocd-jurisdiction/country:us/state:ca/government",
    );
    expect(abbrToOcdJurisdiction("NY")).toBe(
      "ocd-jurisdiction/country:us/state:ny/government",
    );
  });

  it("generates DC OCD slug with district prefix", () => {
    expect(abbrToOcdJurisdiction("DC")).toBe(
      "ocd-jurisdiction/country:us/district:dc/government",
    );
  });

  it("generates PR OCD slug with territory prefix", () => {
    expect(abbrToOcdJurisdiction("PR")).toBe(
      "ocd-jurisdiction/country:us/territory:pr/government",
    );
  });

  it("is case-insensitive", () => {
    expect(abbrToOcdJurisdiction("ca")).toBe(
      "ocd-jurisdiction/country:us/state:ca/government",
    );
    expect(abbrToOcdJurisdiction("Dc")).toBe(
      "ocd-jurisdiction/country:us/district:dc/government",
    );
  });
});

describe("detectStateFromTimezone", () => {
  it("returns a valid 2-letter abbreviation", () => {
    const result = detectStateFromTimezone();
    expect(result).toMatch(/^[A-Z]{2}$/);
  });

  it("returns a state that exists in US_STATES or a default", () => {
    const result = detectStateFromTimezone();
    // The function either returns a mapped state or defaults to "CA"
    const allAbbrs = US_STATES.map((s) => s.abbr);
    expect(allAbbrs).toContain(result);
  });
});
