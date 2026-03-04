/**
 * Shared school board member parsing utilities.
 * Used by both `fetch-school-board` and `fetch-civic-reps` edge functions
 * to avoid logic duplication / drift.
 */

import { normalizeParty } from "./normalize-party.ts";

// ── Types ──────────────────────────────────────────────────────────────────

export interface SchoolBoardMember {
  name: string;
  office: string;
  level: "school_board";
  party: string;
  phone?: string;
  email?: string;
  website?: string;
  photoUrl?: string;
  channels?: Record<string, string>;
  divisionId: string;
  district?: string; // school district name
}

export interface SchoolDistrict {
  name: string;
  ocdId: string;
}

export interface SchoolBoardResult {
  members: SchoolBoardMember[];
  districts: SchoolDistrict[];
}

// ── Helpers ────────────────────────────────────────────────────────────────

// Re-export normalizeParty from shared module for backward compatibility
export { normalizeParty } from "./normalize-party.ts";

export function extractDistrictName(ocdId: string): string {
  // ocd-division/country:us/state:tn/school_district:metro_nashville_public_schools
  // → "Metro Nashville Public Schools"
  const m = ocdId.match(/\/school_district:([^/]+)/);
  if (!m) {
    // Try place-based school districts: /place:xxx/school_district or similar
    const placeMatch = ocdId.match(/\/([^/:]+):([^/]+)$/);
    if (placeMatch) {
      return placeMatch[2]
        .split("_")
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(" ");
    }
    return "";
  }
  return m[1]
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export function isSchoolDistrict(ocdId: string): boolean {
  return ocdId.includes("/school_district:") || ocdId.includes("/school:");
}

// ── Parse Google Civic response for school board members ──────────────────

export function parseSchoolBoardFromResponse(
  data: any,
): SchoolBoardMember[] {
  const members: SchoolBoardMember[] = [];
  const offices = data.offices || [];
  const allOfficials = data.officials || [];

  for (const office of offices) {
    const divisionId: string = office.divisionId || "";
    const levels: string[] = office.levels || [];
    const roles: string[] = office.roles || [];
    const officeName: string = office.name || "";

    // Filter for school board officials
    const isSchool =
      roles.includes("schoolBoard") ||
      (levels.includes("special") && isSchoolDistrict(divisionId)) ||
      officeName.toLowerCase().includes("school board") ||
      officeName.toLowerCase().includes("board of education") ||
      officeName.toLowerCase().includes("school trustee") ||
      officeName.toLowerCase().includes("school director") ||
      isSchoolDistrict(divisionId);

    if (!isSchool) continue;

    const indices: number[] = office.officialIndices || [];
    const district = extractDistrictName(divisionId);

    for (const idx of indices) {
      const person = allOfficials[idx];
      if (!person) continue;

      const channels: Record<string, string> = {};
      for (const ch of person.channels || []) {
        if (ch.type && ch.id) {
          const key = ch.type.toLowerCase();
          channels[key === "twitter" ? "x" : key] = ch.id;
        }
      }

      members.push({
        name: person.name || "",
        office: officeName,
        level: "school_board",
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

  // Sort alphabetically by office then name
  members.sort((a, b) => {
    const offCmp = a.office.localeCompare(b.office);
    return offCmp !== 0 ? offCmp : a.name.localeCompare(b.name);
  });

  console.log(`Parsed ${members.length} school board members`);
  return members;
}

// ── Find school districts via Divisions API ───────────────────────────────

async function findSchoolDistricts(
  address: string,
  googleKey: string,
  timeoutMs = 10000,
): Promise<SchoolDistrict[]> {
  try {
    const params = new URLSearchParams({ key: googleKey, address });
    const url = `https://civicinfo.googleapis.com/civicinfo/v2/divisionsByAddress?${params}`;
    console.log("Fetching school districts via divisionsByAddress");

    const resp = await fetch(url, { signal: AbortSignal.timeout(timeoutMs) });
    if (!resp.ok) {
      console.error(`divisionsByAddress error: ${resp.status}`);
      return [];
    }

    const data = await resp.json();
    const divisions = data.divisions || {};
    const districts: SchoolDistrict[] = [];

    for (const [ocdId, divInfo] of Object.entries(divisions)) {
      if (isSchoolDistrict(ocdId)) {
        const info = divInfo as any;
        const name = info.name || extractDistrictName(ocdId);
        districts.push({ name, ocdId });
      }
    }

    console.log(`Found ${districts.length} school district(s)`);
    return districts;
  } catch (e) {
    console.error("Error finding school districts:", e);
    return [];
  }
}

// ── Attempt Representatives API for school board members ──────────────────

async function fetchSchoolBoardFromRepresentatives(
  address: string,
  googleKey: string,
  timeoutMs = 10000,
): Promise<SchoolBoardMember[]> {
  try {
    // Try with special level + schoolBoard role
    const params = new URLSearchParams({
      key: googleKey,
      address,
      levels: "special",
      roles: "schoolBoard",
    });

    const url = `https://civicinfo.googleapis.com/civicinfo/v2/representatives?${params}`;
    console.log("Attempting Representatives API for school board (may be deprecated)");

    const resp = await fetch(url, { signal: AbortSignal.timeout(timeoutMs) });

    if (!resp.ok) {
      console.log(`Representatives API returned ${resp.status} — API may be shut down`);

      // Fallback: try broader query without level/role filters
      const broadParams = new URLSearchParams({ key: googleKey, address });
      const broadResp = await fetch(
        `https://civicinfo.googleapis.com/civicinfo/v2/representatives?${broadParams}`,
        { signal: AbortSignal.timeout(timeoutMs) },
      );

      if (!broadResp.ok) {
        console.log(`Broad Representatives API also returned ${broadResp.status}`);
        return [];
      }

      return parseSchoolBoardFromResponse(await broadResp.json());
    }

    return parseSchoolBoardFromResponse(await resp.json());
  } catch (e) {
    console.error("School board representatives fetch error:", e);
    return [];
  }
}

// ── Combined fetch with caching ───────────────────────────────────────────

export async function fetchSchoolBoardFromCivic(
  address: string,
  googleKey: string,
  cache: Map<string, { data: SchoolBoardMember[]; districts: SchoolDistrict[]; ts: number }>,
  cacheTTL: number,
  timeoutMs = 10000,
): Promise<SchoolBoardResult> {
  const cacheKey = address.toLowerCase().trim();
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.ts < cacheTTL) {
    console.log(`School board cache hit for "${cacheKey}"`);
    return { members: cached.data, districts: cached.districts };
  }

  // Fetch districts and attempt representatives in parallel
  const [districts, members] = await Promise.all([
    findSchoolDistricts(address, googleKey, timeoutMs),
    fetchSchoolBoardFromRepresentatives(address, googleKey, timeoutMs),
  ]);

  cache.set(cacheKey, { data: members, districts, ts: Date.now() });
  console.log(
    `School board result for "${cacheKey}": ${members.length} members, ${districts.length} districts`,
  );
  return { members, districts };
}
