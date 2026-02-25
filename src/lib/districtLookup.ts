import { nevadaPoliticians, type Politician } from "./politicians";

export interface DistrictResult {
  level: "federal" | "state" | "county" | "local";
  label: string;
  representatives: Politician[];
}

interface AddressRegion {
  congressional: string; // NV-1, NV-2, NV-3, NV-4
  county: string;
  city: string;
  senateDistrict?: string;
}

/**
 * Simple keyword-based address-to-region mapping for Nevada.
 * Maps an address string to the most likely congressional district,
 * county, and city for matching against our politician data.
 */
function resolveRegion(address: string): AddressRegion {
  const a = address.toLowerCase();

  // Reno / Sparks / Northern Nevada → NV-2
  if (
    a.includes("reno") ||
    a.includes("sparks") ||
    a.includes("carson city") ||
    a.includes("elko") ||
    a.includes("fallon") ||
    a.includes("winnemucca") ||
    a.includes("fernley") ||
    a.includes("dayton") ||
    a.includes("89501") ||
    a.includes("89502") ||
    a.includes("89503") ||
    a.includes("89509") ||
    a.includes("89511") ||
    a.includes("89431") ||
    a.includes("89434")
  ) {
    return {
      congressional: "NV-2",
      county: "Washoe County",
      city: a.includes("sparks") ? "Sparks" : a.includes("carson") ? "Carson City" : "Reno",
    };
  }

  // Henderson → NV-3
  if (
    a.includes("henderson") ||
    a.includes("89012") ||
    a.includes("89014") ||
    a.includes("89015") ||
    a.includes("89052") ||
    a.includes("89074")
  ) {
    return { congressional: "NV-3", county: "Clark County", city: "Henderson" };
  }

  // North Las Vegas → NV-4
  if (
    a.includes("north las vegas") ||
    a.includes("n las vegas") ||
    a.includes("n. las vegas") ||
    a.includes("89030") ||
    a.includes("89031") ||
    a.includes("89032") ||
    a.includes("89033") ||
    a.includes("89081") ||
    a.includes("89084") ||
    a.includes("89085") ||
    a.includes("89086") ||
    a.includes("pahrump") ||
    a.includes("mesquite") ||
    a.includes("nye") ||
    a.includes("lincoln")
  ) {
    return { congressional: "NV-4", county: "Clark County", city: "North Las Vegas" };
  }

  // Central Las Vegas (default for "Las Vegas") → NV-1
  if (
    a.includes("las vegas") ||
    a.includes("89101") ||
    a.includes("89102") ||
    a.includes("89104") ||
    a.includes("89106") ||
    a.includes("89109") ||
    a.includes("89119") ||
    a.includes("89121") ||
    a.includes("89123") ||
    a.includes("89146") ||
    a.includes("89148") ||
    a.includes("89169")
  ) {
    return { congressional: "NV-1", county: "Clark County", city: "Las Vegas" };
  }

  // Fallback — if they just typed "Nevada" or something generic, default NV-1
  return { congressional: "NV-1", county: "Clark County", city: "Las Vegas" };
}

/**
 * Looks up representatives for a given Nevada address.
 * Returns politicians grouped by level (federal → state → county → local).
 */
export function lookupRepresentatives(address: string): DistrictResult[] {
  const region = resolveRegion(address);
  const all = nevadaPoliticians;

  // Federal: Both senators (statewide) + the matching House rep
  const federalSenators = all.filter(
    (p) => p.level === "federal" && p.office.includes("Senate")
  );
  const federalRep = all.filter(
    (p) =>
      p.level === "federal" &&
      p.office.includes("House") &&
      p.office.includes(region.congressional)
  );

  // State: All statewide officers + a sample of state senators/assembly from matching region
  const statewide = all.filter(
    (p) =>
      p.level === "state" &&
      (p.region === "State of Nevada" || p.region === "Statewide")
  );
  const stateDistrict = all.filter(
    (p) =>
      p.level === "state" &&
      p.region !== "State of Nevada" &&
      p.region !== "Statewide" &&
      (p.region.toLowerCase().includes(region.county.toLowerCase()) ||
        p.region.toLowerCase().includes(region.city.toLowerCase()))
  );

  // County
  const countyReps = all.filter(
    (p) =>
      p.level === "county" &&
      (p.region.toLowerCase().includes(region.county.toLowerCase()) ||
        p.region.toLowerCase().includes(region.city.toLowerCase()))
  );

  // Local
  const localReps = all.filter(
    (p) =>
      p.level === "local" &&
      (p.region.toLowerCase().includes(region.city.toLowerCase()) ||
        p.region.toLowerCase().includes(region.county.toLowerCase()))
  );

  const results: DistrictResult[] = [];

  if (federalSenators.length || federalRep.length) {
    results.push({
      level: "federal",
      label: "Federal Representatives",
      representatives: [...federalSenators, ...federalRep],
    });
  }

  if (statewide.length || stateDistrict.length) {
    results.push({
      level: "state",
      label: "State Officials & Legislators",
      representatives: [...statewide, ...stateDistrict.slice(0, 6)],
    });
  }

  if (countyReps.length) {
    results.push({
      level: "county",
      label: "County Officials",
      representatives: countyReps,
    });
  }

  if (localReps.length) {
    results.push({
      level: "local",
      label: "City & Local Officials",
      representatives: localReps,
    });
  }

  return results;
}
