/**
 * Shared judicial official parsing utilities.
 * Used by both `fetch-judicial-officials` and `fetch-civic-reps` edge functions
 * to avoid logic duplication / drift.
 *
 * Captures judges and court officials at ALL government levels (state + county).
 */

import { normalizeParty } from "./normalize-party.ts";

// ── Types ──────────────────────────────────────────────────────────────────

export interface JudicialOfficial {
  name: string;
  office: string;
  level: "judicial";
  party: string;
  phone?: string;
  email?: string;
  website?: string;
  photoUrl?: string;
  channels?: Record<string, string>;
  divisionId: string;
  jurisdiction?: string; // county name, district, or state
}

// ── Constants ──────────────────────────────────────────────────────────────

/** Two-letter state abbreviation → full name for OCD division ID display */
const STATE_NAMES: Record<string, string> = {
  al: "Alabama", ak: "Alaska", az: "Arizona", ar: "Arkansas", ca: "California",
  co: "Colorado", ct: "Connecticut", de: "Delaware", fl: "Florida", ga: "Georgia",
  hi: "Hawaii", id: "Idaho", il: "Illinois", in: "Indiana", ia: "Iowa",
  ks: "Kansas", ky: "Kentucky", la: "Louisiana", me: "Maine", md: "Maryland",
  ma: "Massachusetts", mi: "Michigan", mn: "Minnesota", ms: "Mississippi", mo: "Missouri",
  mt: "Montana", ne: "Nebraska", nv: "Nevada", nh: "New Hampshire", nj: "New Jersey",
  nm: "New Mexico", ny: "New York", nc: "North Carolina", nd: "North Dakota", oh: "Ohio",
  ok: "Oklahoma", or: "Oregon", pa: "Pennsylvania", ri: "Rhode Island", sc: "South Carolina",
  sd: "South Dakota", tn: "Tennessee", tx: "Texas", ut: "Utah", vt: "Vermont",
  va: "Virginia", wa: "Washington", wv: "West Virginia", wi: "Wisconsin", wy: "Wyoming",
  dc: "District of Columbia",
};

/** Keywords that identify judicial/court officials */
export const JUDICIAL_OFFICE_KEYWORDS = [
  "judge", "justice", "magistrate", "court", "judicial",
  "chancery", "probate", "juvenile", "general sessions",
  "circuit court", "district court", "superior court",
  "court of appeals", "appellate", "supreme court",
  "family court", "small claims", "municipal court",
  "justice of the peace", "chief justice", "associate justice",
];

const OFFICE_SORT_KEYWORDS = [
  "supreme court", "chief justice",
  "court of appeals", "appellate",
  "circuit court", "district court", "superior court",
  "chancery", "probate", "family court",
  "general sessions", "juvenile",
  "municipal court", "small claims",
  "judge", "justice", "magistrate",
  "justice of the peace",
];

// ── Helpers ────────────────────────────────────────────────────────────────

/**
 * Determine whether an office is judicial.
 * Primary: Google Civic API assigns role "judge".
 * Secondary: office name matches judicial keywords.
 */
export function isJudicialOfficial(
  officeName: string,
  roles: string[],
): boolean {
  // Primary: Google Civic API role
  if (roles.includes("judge")) return true;
  // Secondary: keyword matching
  const lower = officeName.toLowerCase();
  return JUDICIAL_OFFICE_KEYWORDS.some((kw) => lower.includes(kw));
}

/**
 * Extract a human-readable jurisdiction from a division ID.
 * E.g. "ocd-division/country:us/state:tn/county:davidson" → "Davidson County"
 * E.g. "ocd-division/country:us/state:tn" → "Tennessee"
 */
export function extractJurisdictionName(divisionId: string): string {
  // Check for county first
  const countyMatch = divisionId.match(/\/county:([^/]+)/);
  if (countyMatch) {
    return (
      countyMatch[1]
        .split("_")
        .map((w: string) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(" ") + " County"
    );
  }
  // Fall back to state — use full state name lookup
  const stateMatch = divisionId.match(/\/state:([^/]+)/);
  if (stateMatch) {
    const stateCode = stateMatch[1].toLowerCase();
    // Try lookup table first (handles "tn" → "Tennessee")
    if (STATE_NAMES[stateCode]) return STATE_NAMES[stateCode];
    // Fallback: capitalize multi-word codes (shouldn't normally hit)
    return stateMatch[1]
      .split("_")
      .map((w: string) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");
  }
  return "";
}

// Re-export normalizeParty for backward compatibility
export { normalizeParty } from "./normalize-party.ts";

// ── Sort officials by office priority ──────────────────────────────────────

export function sortJudicialOfficials<T extends { office: string }>(
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

// ── Parse Google Civic Representatives response into JudicialOfficial[] ──

export function parseCivicRepresentatives(
  data: any,
): JudicialOfficial[] {
  const officials: JudicialOfficial[] = [];
  const offices = data.offices || [];
  const allOfficials = data.officials || [];

  for (const office of offices) {
    const divisionId: string = office.divisionId || "";
    const roles: string[] = office.roles || [];
    const officeName: string = office.name || "";

    // Only include judicial officials
    if (!isJudicialOfficial(officeName, roles)) continue;

    // Exclude school district officials that happen to match
    if (divisionId.includes("/school_district:") || divisionId.includes("/school:")) continue;

    const indices: number[] = office.officialIndices || [];
    const jurisdiction = extractJurisdictionName(divisionId);

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
        level: "judicial",
        party: normalizeParty(person.party || ""),
        phone: (person.phones || [])[0] || undefined,
        email: (person.emails || [])[0] || undefined,
        website: (person.urls || [])[0] || undefined,
        photoUrl: person.photoUrl || undefined,
        channels: Object.keys(channels).length > 0 ? channels : undefined,
        divisionId,
        jurisdiction,
      });
    }
  }

  return sortJudicialOfficials(officials);
}

// ── Fetch judicial officials from Google Civic Representatives API ────────

export async function fetchJudicialOfficialsFromCivic(
  address: string,
  googleKey: string,
  cache: Map<string, { data: JudicialOfficial[]; ts: number }>,
  cacheTTL: number,
  timeoutMs = 10000,
): Promise<JudicialOfficial[]> {
  const cacheKey = address.toLowerCase().trim();
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.ts < cacheTTL) {
    console.log(
      `Judicial cache hit for "${cacheKey}" (${cached.data.length} officials)`,
    );
    return cached.data;
  }

  try {
    // Query with roles=judge to get all judges across levels
    const params = new URLSearchParams({
      key: googleKey,
      address,
      roles: "judge",
    });

    const url = `https://civicinfo.googleapis.com/civicinfo/v2/representatives?${params}`;
    console.log("Fetching judicial officials from Google Civic Representatives API");

    const resp = await fetch(url, { signal: AbortSignal.timeout(timeoutMs) });

    if (!resp.ok) {
      console.error(`Civic representatives API (judge role) error: ${resp.status}`);
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
        `Parsed ${officials.length} judicial officials for "${cacheKey}"`,
      );
      return officials;
    }

    const officials = parseCivicRepresentatives(await resp.json());
    cache.set(cacheKey, { data: officials, ts: Date.now() });
    console.log(
      `Parsed ${officials.length} judicial officials for "${cacheKey}"`,
    );
    return officials;
  } catch (e) {
    console.error("Judicial officials fetch error:", e);
    cache.set(cacheKey, { data: [], ts: Date.now() });
    return [];
  }
}
