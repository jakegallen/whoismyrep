/**
 * Shared county official parsing utilities.
 * Used by both `fetch-county-officials` and `fetch-civic-reps` edge functions
 * to avoid logic duplication / drift.
 */

import { normalizeParty } from "./normalize-party.ts";

// ── Types ──────────────────────────────────────────────────────────────────

export interface CountyOfficial {
  name: string;
  office: string;
  level: "county";
  party: string;
  phone?: string;
  email?: string;
  website?: string;
  photoUrl?: string;
  channels?: Record<string, string>;
  divisionId: string;
  county?: string;
}

// ── Constants ──────────────────────────────────────────────────────────────

export const COUNTY_OFFICE_KEYWORDS = [
  "county", "sheriff", "district attorney", "prosecutor", "clerk",
  "recorder", "assessor", "auditor", "coroner", "treasurer",
  "commissioner", "supervisor", "constable",
  "public defender", "register of deeds",
  "tax collector", "surveyor",
];

/** Keywords that identify judicial officials — these are now handled
 *  by judicial-utils.ts and must be excluded from county results. */
const JUDICIAL_EXCLUDE_KEYWORDS = [
  "judge", "justice", "magistrate", "court", "judicial",
  "probate", "chancery", "juvenile", "general sessions",
  "justice of the peace",
];

const OFFICE_SORT_KEYWORDS = [
  "sheriff", "district attorney", "prosecutor", "public defender",
  "commissioner", "supervisor", "clerk", "recorder",
  "assessor", "treasurer", "auditor", "coroner", "constable",
];

// ── Helpers ────────────────────────────────────────────────────────────────

export function isCountyLevel(
  officeName: string,
  divisionId: string,
  levels: string[],
): boolean {
  // Google tags it as county level
  if (levels.includes("administrativeArea2")) return true;
  // Division ID contains /county:
  if (divisionId.includes("/county:")) return true;
  // Office name matches county keywords
  const lower = officeName.toLowerCase();
  return COUNTY_OFFICE_KEYWORDS.some((kw) => lower.includes(kw));
}

export function extractCountyName(divisionId: string): string {
  // ocd-division/country:us/state:tn/county:davidson → "Davidson County"
  const m = divisionId.match(/\/county:([^/]+)/);
  if (!m) return "";
  return (
    m[1]
      .split("_")
      .map((w: string) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ") + " County"
  );
}

// Re-export normalizeParty from shared module for backward compatibility
export { normalizeParty } from "./normalize-party.ts";

// ── Sort officials by office priority ──────────────────────────────────────

export function sortCountyOfficials<T extends { office: string }>(
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

// ── Parse Google Civic Representatives response into CountyOfficial[] ─────

export function parseCivicRepresentatives(
  data: any,
): CountyOfficial[] {
  const officials: CountyOfficial[] = [];
  const offices = data.offices || [];
  const allOfficials = data.officials || [];

  for (const office of offices) {
    const divisionId: string = office.divisionId || "";
    const levels: string[] = office.levels || [];
    const roles: string[] = office.roles || [];
    const officeName: string = office.name || "";

    // Only include county-level officials
    if (!isCountyLevel(officeName, divisionId, levels)) continue;

    // Exclude judicial officials — they now have their own dedicated level
    if (roles.includes("judge")) continue;
    const lowerName = officeName.toLowerCase();
    if (JUDICIAL_EXCLUDE_KEYWORDS.some((kw) => lowerName.includes(kw))) continue;

    const indices: number[] = office.officialIndices || [];
    const county = extractCountyName(divisionId);

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
        level: "county",
        party: normalizeParty(person.party || ""),
        phone: (person.phones || [])[0] || undefined,
        email: (person.emails || [])[0] || undefined,
        website: (person.urls || [])[0] || undefined,
        photoUrl: person.photoUrl || undefined,
        channels: Object.keys(channels).length > 0 ? channels : undefined,
        divisionId,
        county,
      });
    }
  }

  return sortCountyOfficials(officials);
}

// ── Fetch county officials from Google Civic Representatives API ──────────

export async function fetchCountyOfficialsFromCivic(
  address: string,
  googleKey: string,
  cache: Map<string, { data: CountyOfficial[]; ts: number }>,
  cacheTTL: number,
  timeoutMs = 10000,
): Promise<CountyOfficial[]> {
  const cacheKey = address.toLowerCase().trim();
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.ts < cacheTTL) {
    console.log(
      `County cache hit for "${cacheKey}" (${cached.data.length} officials)`,
    );
    return cached.data;
  }

  try {
    const params = new URLSearchParams({
      key: googleKey,
      address,
      levels: "administrativeArea2",
      roles:
        "headOfGovernment,headOfState,deputyHeadOfGovernment,governmentOfficer,legislatorUpperBody,legislatorLowerBody",
    });

    const url = `https://civicinfo.googleapis.com/civicinfo/v2/representatives?${params}`;
    console.log("Fetching county officials from Google Civic Representatives API");

    const resp = await fetch(url, { signal: AbortSignal.timeout(timeoutMs) });

    if (!resp.ok) {
      console.error(`Civic representatives API error: ${resp.status}`);
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
        `Parsed ${officials.length} county officials for "${cacheKey}"`,
      );
      return officials;
    }

    const officials = parseCivicRepresentatives(await resp.json());
    cache.set(cacheKey, { data: officials, ts: Date.now() });
    console.log(
      `Parsed ${officials.length} county officials for "${cacheKey}"`,
    );
    return officials;
  } catch (e) {
    console.error("County officials fetch error:", e);
    cache.set(cacheKey, { data: [], ts: Date.now() });
    return [];
  }
}
