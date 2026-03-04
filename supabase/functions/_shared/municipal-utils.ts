/**
 * Shared municipal/city official parsing utilities.
 * Used by both `fetch-municipal-officials` and `fetch-civic-reps` edge functions
 * to avoid logic duplication / drift.
 */

import { normalizeParty } from "./normalize-party.ts";

// ── Types ──────────────────────────────────────────────────────────────────

export interface MunicipalOfficial {
  name: string;
  office: string;
  level: "local";
  party: string;
  phone?: string;
  email?: string;
  website?: string;
  photoUrl?: string;
  channels?: Record<string, string>;
  divisionId: string;
  municipality?: string; // city/town name
}

// ── Constants ──────────────────────────────────────────────────────────────

export const MUNICIPAL_OFFICE_KEYWORDS = [
  "mayor", "city council", "council member", "councilmember", "councilman",
  "councilwoman", "alderman", "alderwoman", "alderperson", "city manager",
  "city clerk", "city attorney", "city treasurer", "city auditor",
  "town council", "town clerk", "town manager", "town supervisor",
  "village", "borough", "selectman", "selectwoman", "municipal",
  "vice mayor", "deputy mayor", "council president",
  "city commissioner", "city controller", "city recorder",
];

const OFFICE_SORT_KEYWORDS = [
  "mayor", "vice mayor", "deputy mayor", "council president",
  "city council", "council member", "councilmember", "alderman",
  "city manager", "city attorney", "city clerk", "city treasurer",
  "city auditor", "city controller", "city recorder",
  "town supervisor", "town council", "town clerk", "town manager",
];

// ── Helpers ────────────────────────────────────────────────────────────────

export function isMunicipalLevel(
  officeName: string,
  divisionId: string,
  levels: string[],
): boolean {
  // Google tags it as locality level
  if (levels.includes("locality")) return true;
  // Deeper sub-locality levels
  if (levels.some((l) => l.startsWith("subLocality"))) return true;
  // Division ID contains /place: (city/town/village OCD-IDs)
  if (divisionId.includes("/place:")) return true;
  // Office name matches municipal keywords
  const lower = officeName.toLowerCase();
  return MUNICIPAL_OFFICE_KEYWORDS.some((kw) => lower.includes(kw));
}

export function extractMunicipalityName(divisionId: string): string {
  // ocd-division/country:us/state:tn/place:nashville → "Nashville"
  const m = divisionId.match(/\/place:([^/]+)/);
  if (!m) return "";
  return m[1]
    .split("_")
    .map((w: string) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

// Re-export normalizeParty for backward compatibility
export { normalizeParty } from "./normalize-party.ts";

// ── Sort officials by office priority ──────────────────────────────────────

export function sortMunicipalOfficials<T extends { office: string }>(
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

// ── Parse Google Civic Representatives response into MunicipalOfficial[] ──

export function parseCivicRepresentatives(
  data: any,
): MunicipalOfficial[] {
  const officials: MunicipalOfficial[] = [];
  const offices = data.offices || [];
  const allOfficials = data.officials || [];

  for (const office of offices) {
    const divisionId: string = office.divisionId || "";
    const levels: string[] = office.levels || [];
    const officeName: string = office.name || "";

    // Only include municipal-level officials
    if (!isMunicipalLevel(officeName, divisionId, levels)) continue;

    // Exclude county-level (administrativeArea2) and school districts
    if (levels.includes("administrativeArea2")) continue;
    if (divisionId.includes("/school_district:") || divisionId.includes("/school:")) continue;
    if (divisionId.includes("/county:") && !divisionId.includes("/place:")) continue;

    const indices: number[] = office.officialIndices || [];
    const municipality = extractMunicipalityName(divisionId);

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
        level: "local",
        party: normalizeParty(person.party || ""),
        phone: (person.phones || [])[0] || undefined,
        email: (person.emails || [])[0] || undefined,
        website: (person.urls || [])[0] || undefined,
        photoUrl: person.photoUrl || undefined,
        channels: Object.keys(channels).length > 0 ? channels : undefined,
        divisionId,
        municipality,
      });
    }
  }

  return sortMunicipalOfficials(officials);
}

// ── Fetch municipal officials from Google Civic Representatives API ───────

export async function fetchMunicipalOfficialsFromCivic(
  address: string,
  googleKey: string,
  cache: Map<string, { data: MunicipalOfficial[]; ts: number }>,
  cacheTTL: number,
  timeoutMs = 10000,
): Promise<MunicipalOfficial[]> {
  const cacheKey = address.toLowerCase().trim();
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.ts < cacheTTL) {
    console.log(
      `Municipal cache hit for "${cacheKey}" (${cached.data.length} officials)`,
    );
    return cached.data;
  }

  try {
    // Try with locality level filter first
    const params = new URLSearchParams({
      key: googleKey,
      address,
      levels: "locality",
      roles:
        "headOfGovernment,headOfState,deputyHeadOfGovernment,governmentOfficer,legislatorUpperBody,legislatorLowerBody",
    });

    const url = `https://civicinfo.googleapis.com/civicinfo/v2/representatives?${params}`;
    console.log("Fetching municipal officials from Google Civic Representatives API");

    const resp = await fetch(url, { signal: AbortSignal.timeout(timeoutMs) });

    if (!resp.ok) {
      console.error(`Civic representatives API (locality) error: ${resp.status}`);
      // Fallback: broader query without level filter
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
        `Parsed ${officials.length} municipal officials for "${cacheKey}"`,
      );
      return officials;
    }

    const officials = parseCivicRepresentatives(await resp.json());
    cache.set(cacheKey, { data: officials, ts: Date.now() });
    console.log(
      `Parsed ${officials.length} municipal officials for "${cacheKey}"`,
    );
    return officials;
  } catch (e) {
    console.error("Municipal officials fetch error:", e);
    cache.set(cacheKey, { data: [], ts: Date.now() });
    return [];
  }
}
