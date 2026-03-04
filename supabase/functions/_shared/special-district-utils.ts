/**
 * Shared special district official parsing utilities.
 * Used by both `fetch-special-district-officials` and `fetch-civic-reps` edge functions
 * to avoid logic duplication / drift.
 *
 * Captures officials from special purpose government districts such as
 * water districts, fire protection districts, transit authorities,
 * utility districts, park districts, library districts, etc.
 */

import { normalizeParty } from "./normalize-party.ts";

// ── Types ──────────────────────────────────────────────────────────────────

export interface SpecialDistrictOfficial {
  name: string;
  office: string;
  level: "special_district";
  party: string;
  phone?: string;
  email?: string;
  website?: string;
  photoUrl?: string;
  channels?: Record<string, string>;
  divisionId: string;
  district?: string; // district name (e.g. "Metropolitan Water District")
}

// ── Constants ──────────────────────────────────────────────────────────────

/** Keywords that identify special district officials by office name */
export const SPECIAL_DISTRICT_KEYWORDS = [
  "water district", "water authority", "water board",
  "fire district", "fire protection", "fire authority",
  "transit district", "transit authority", "transportation authority",
  "utility district", "utility board", "public utility",
  "park district", "recreation district", "parks and recreation",
  "library district", "library board",
  "hospital district", "health district", "health authority",
  "port authority", "port district", "harbor district",
  "sanitation district", "sanitary district", "sewer district",
  "irrigation district", "drainage district", "flood control",
  "conservation district", "soil and water",
  "mosquito abatement", "mosquito control",
  "cemetery district", "cemetery board",
  "housing authority", "redevelopment agency",
  "airport authority", "airport district",
  "power authority", "electric district",
  "levee district", "reclamation district",
  "community services district", "community development district",
  "metropolitan district", "special district",
];

/** OCD division ID path segments that indicate special districts */
const SPECIAL_DISTRICT_DIVISION_PATTERNS = [
  "/water:", "/fire:", "/transit:", "/utility:",
  "/park:", "/library:", "/hospital:", "/health:",
  "/port:", "/sanitation:", "/sewer:", "/irrigation:",
  "/conservation:", "/mosquito:", "/cemetery:",
  "/housing:", "/airport:", "/power:", "/electric:",
  "/levee:", "/reclamation:", "/metro:", "/special:",
  "/community_services_district:",
];

/** Division ID patterns that belong to OTHER modules — must exclude */
const EXCLUDE_DIVISION_PATTERNS = [
  "/school_district:", "/school:",
];

const OFFICE_SORT_KEYWORDS = [
  "water district", "water authority",
  "fire district", "fire protection",
  "transit", "transportation",
  "utility", "power", "electric",
  "park", "recreation",
  "library",
  "hospital", "health",
  "port", "harbor",
  "sanitation", "sewer",
  "housing",
  "airport",
  "conservation",
  "cemetery",
];

// ── Helpers ────────────────────────────────────────────────────────────────

/**
 * Determine whether an official belongs to a special purpose district.
 * Primary: Google Civic API assigns level "special".
 * Secondary: Division ID contains special district patterns.
 * Tertiary: Office name matches special district keywords.
 */
export function isSpecialDistrictLevel(
  officeName: string,
  divisionId: string,
  levels: string[],
  roles: string[],
): boolean {
  // Exclude judicial officials (they have their own level)
  if (roles.includes("judge")) return false;

  // Primary: Google Civic API level
  if (levels.includes("special")) return true;

  // Secondary: Division ID has special district pattern
  const lowerDiv = divisionId.toLowerCase();
  if (SPECIAL_DISTRICT_DIVISION_PATTERNS.some((p) => lowerDiv.includes(p))) return true;

  // Tertiary: office name matches special district keywords
  const lowerName = officeName.toLowerCase();
  return SPECIAL_DISTRICT_KEYWORDS.some((kw) => lowerName.includes(kw));
}

/**
 * Extract a human-readable district name from a division ID.
 * Tries to find the most specific special district segment.
 * E.g. "ocd-division/country:us/state:ca/water:metropolitan_water_district" → "Metropolitan Water District"
 * Falls back to last non-standard segment.
 */
export function extractDistrictName(divisionId: string): string {
  // Try special district patterns first
  for (const pattern of SPECIAL_DISTRICT_DIVISION_PATTERNS) {
    const regex = new RegExp(`${pattern.replace("/", "\\/")}([^/]+)`);
    const match = divisionId.match(regex);
    if (match) {
      return match[1]
        .split("_")
        .map((w: string) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(" ");
    }
  }

  // Fallback: look for any non-standard segment after state/county
  const segments = divisionId.split("/");
  for (let i = segments.length - 1; i >= 0; i--) {
    const seg = segments[i];
    const [type, value] = seg.split(":");
    if (!value) continue;
    // Skip standard segments we handle elsewhere
    if (["country", "state", "county", "place", "cd", "sldl", "sldu", "school_district", "school"].includes(type)) continue;
    return value
      .split("_")
      .map((w: string) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");
  }

  return "";
}

// Re-export normalizeParty for backward compatibility
export { normalizeParty } from "./normalize-party.ts";

// ── Sort officials by district type priority ──────────────────────────────

export function sortSpecialDistrictOfficials<T extends { office: string }>(
  officials: T[],
): T[] {
  const OFFICE_ORDER: Record<string, number> = {};
  OFFICE_SORT_KEYWORDS.forEach((kw, i) => (OFFICE_ORDER[kw] = i));

  return [...officials].sort((a, b) => {
    const aLower = a.office.toLowerCase();
    const bLower = b.office.toLowerCase();
    let aOrder = 99;
    let bOrder = 99;
    for (const [kw, order] of Object.entries(OFFICE_ORDER)) {
      if (aLower.includes(kw) && order < aOrder) aOrder = order;
      if (bLower.includes(kw) && order < bOrder) bOrder = order;
    }
    if (aOrder !== bOrder) return aOrder - bOrder;
    return a.office.localeCompare(b.office);
  });
}

// ── Parse Google Civic Representatives response into SpecialDistrictOfficial[] ──

export function parseCivicRepresentatives(
  data: any,
): SpecialDistrictOfficial[] {
  const officials: SpecialDistrictOfficial[] = [];
  const offices = data.offices || [];
  const allOfficials = data.officials || [];

  for (const office of offices) {
    const divisionId: string = office.divisionId || "";
    const levels: string[] = office.levels || [];
    const roles: string[] = office.roles || [];
    const officeName: string = office.name || "";

    // Only include special district officials
    if (!isSpecialDistrictLevel(officeName, divisionId, levels, roles)) continue;

    // Exclude school districts (handled by school-board-utils)
    if (EXCLUDE_DIVISION_PATTERNS.some((p) => divisionId.includes(p))) continue;

    // Exclude county-level (handled by county-utils)
    if (levels.includes("administrativeArea2") && !levels.includes("special")) continue;

    // Exclude locality-level (handled by municipal-utils) unless also tagged special
    if (levels.includes("locality") && !levels.includes("special")) continue;

    const indices: number[] = office.officialIndices || [];
    const district = extractDistrictName(divisionId);

    for (const idx of indices) {
      const person = allOfficials[idx];
      if (!person) continue;

      // Extract channels (social media)
      const channels: Record<string, string> = {};
      for (const ch of person.channels || []) {
        if (ch.type && ch.id) {
          const key = ch.type.toLowerCase();
          channels[key === "twitter" ? "x" : key] = ch.id;
        }
      }

      officials.push({
        name: person.name || "",
        office: officeName,
        level: "special_district",
        party: normalizeParty(person.party || ""),
        phone: (person.phones || [])[0] || undefined,
        email: (person.emails || [])[0] || undefined,
        website: (person.urls || [])[0] || undefined,
        photoUrl: person.photoUrl || undefined,
        channels: Object.keys(channels).length > 0 ? channels : undefined,
        divisionId,
        district,
      });
    }
  }

  return sortSpecialDistrictOfficials(officials);
}

// ── Fetch special district officials from Google Civic Representatives API ──

export async function fetchSpecialDistrictOfficialsFromCivic(
  address: string,
  googleKey: string,
  cache: Map<string, { data: SpecialDistrictOfficial[]; ts: number }>,
  cacheTTL: number,
  timeoutMs = 10000,
): Promise<SpecialDistrictOfficial[]> {
  const cacheKey = address.toLowerCase().trim();
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.ts < cacheTTL) {
    console.log(
      `Special district cache hit for "${cacheKey}" (${cached.data.length} officials)`,
    );
    return cached.data;
  }

  try {
    // Query with levels=special to get special purpose district officials
    const params = new URLSearchParams({
      key: googleKey,
      address,
      levels: "special",
    });

    const url = `https://civicinfo.googleapis.com/civicinfo/v2/representatives?${params}`;
    console.log("Fetching special district officials from Google Civic Representatives API");

    const resp = await fetch(url, { signal: AbortSignal.timeout(timeoutMs) });

    if (!resp.ok) {
      console.error(`Civic representatives API (special level) error: ${resp.status}`);
      // Fallback: broader query, filter client-side
      const broadParams = new URLSearchParams({ key: googleKey, address });
      const broadResp = await fetch(
        `https://civicinfo.googleapis.com/civicinfo/v2/representatives?${broadParams}`,
        { signal: AbortSignal.timeout(timeoutMs) },
      );
      if (!broadResp.ok) {
        console.error(
          `Broad civic representatives API also failed: ${broadResp.status}`,
        );
        cache.set(cacheKey, { data: [], ts: Date.now() });
        return [];
      }
      const officials = parseCivicRepresentatives(await broadResp.json());
      cache.set(cacheKey, { data: officials, ts: Date.now() });
      console.log(
        `Parsed ${officials.length} special district officials for "${cacheKey}"`,
      );
      return officials;
    }

    const officials = parseCivicRepresentatives(await resp.json());
    cache.set(cacheKey, { data: officials, ts: Date.now() });
    console.log(
      `Parsed ${officials.length} special district officials for "${cacheKey}"`,
    );
    return officials;
  } catch (e) {
    console.error("Special district officials fetch error:", e);
    cache.set(cacheKey, { data: [], ts: Date.now() });
    return [];
  }
}
