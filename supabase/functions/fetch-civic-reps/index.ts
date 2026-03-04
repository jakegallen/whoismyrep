import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { getCorsHeaders, handleCors, withCache } from "../_shared/cors.ts";
import {
  type CountyOfficial,
  fetchCountyOfficialsFromCivic,
} from "../_shared/county-utils.ts";
import {
  type SchoolBoardMember,
  type SchoolDistrict,
  fetchSchoolBoardFromCivic,
} from "../_shared/school-board-utils.ts";
import {
  type MunicipalOfficial,
  fetchMunicipalOfficialsFromCivic,
} from "../_shared/municipal-utils.ts";
import {
  type JudicialOfficial,
  fetchJudicialOfficialsFromCivic,
} from "../_shared/judicial-utils.ts";
import {
  type SpecialDistrictOfficial,
  fetchSpecialDistrictOfficialsFromCivic,
} from "../_shared/special-district-utils.ts";

// --- Types ---

interface RepResult {
  name: string;
  office: string;
  level: "federal" | "state" | "county" | "judicial" | "school_board" | "special_district" | "local";
  party: string;
  phone?: string;
  email?: string;
  website?: string;
  photoUrl?: string;
  socialHandles?: Record<string, string>;
  divisionId: string;
  jurisdiction?: string;
}

// --- Fetch with timeout helper ---

function fetchWithTimeout(url: string, options: RequestInit = {}, timeoutMs = 8000): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  return fetch(url, { ...options, signal: controller.signal }).finally(() => clearTimeout(timer));
}

// --- Geocode address using Nominatim (free, no key) ---

async function geocodeAddress(address: string): Promise<{ lat: number; lng: number; display: string; stateAbbr: string } | null> {
  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(address)}&format=json&limit=1&countrycodes=us&addressdetails=1`;
  const resp = await fetchWithTimeout(url, {
    headers: { "User-Agent": "WhoIsMyRep/1.0" },
  });
  if (!resp.ok) {
    console.error("Nominatim error:", resp.status);
    return null;
  }
  const results = await resp.json();
  if (!results.length) return null;

  const stateCode = results[0].address?.["ISO3166-2-lvl4"]?.replace("US-", "") || "";
  const stateName = results[0].address?.state || "";
  const stateAbbr = stateCode || extractStateAbbr(stateName) || "";

  return {
    lat: parseFloat(results[0].lat),
    lng: parseFloat(results[0].lon),
    display: results[0].display_name,
    stateAbbr: stateAbbr.toUpperCase(),
  };
}

// Map full state names to abbreviations
const STATE_ABBRS: Record<string, string> = {
  "alabama": "AL", "alaska": "AK", "arizona": "AZ", "arkansas": "AR", "california": "CA",
  "colorado": "CO", "connecticut": "CT", "delaware": "DE", "florida": "FL", "georgia": "GA",
  "hawaii": "HI", "idaho": "ID", "illinois": "IL", "indiana": "IN", "iowa": "IA",
  "kansas": "KS", "kentucky": "KY", "louisiana": "LA", "maine": "ME", "maryland": "MD",
  "massachusetts": "MA", "michigan": "MI", "minnesota": "MN", "mississippi": "MS", "missouri": "MO",
  "montana": "MT", "nebraska": "NE", "nevada": "NV", "new hampshire": "NH", "new jersey": "NJ",
  "new mexico": "NM", "new york": "NY", "north carolina": "NC", "north dakota": "ND", "ohio": "OH",
  "oklahoma": "OK", "oregon": "OR", "pennsylvania": "PA", "rhode island": "RI", "south carolina": "SC",
  "south dakota": "SD", "tennessee": "TN", "texas": "TX", "utah": "UT", "vermont": "VT",
  "virginia": "VA", "washington": "WA", "west virginia": "WV", "wisconsin": "WI", "wyoming": "WY",
  "district of columbia": "DC",
};

function extractStateAbbr(stateName: string): string {
  return STATE_ABBRS[stateName.toLowerCase()] || "";
}

// --- Open States bulk CSV: free, no API key, no rate limit ---
// Data source: https://data.openstates.org/people/current/{state_abbr}.csv

const stateCSVCache = new Map<string, { data: Record<string, string>[]; ts: number }>();
const CSV_CACHE_TTL = 1000 * 60 * 60; // 1 hour

function parseCSV(text: string): Record<string, string>[] {
  const lines: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === '"') {
      if (inQuotes && text[i + 1] === '"') {
        current += '""';
        i++;
      } else {
        inQuotes = !inQuotes;
        current += '"';
      }
    } else if (ch === '\n' && !inQuotes) {
      lines.push(current);
      current = "";
    } else if (ch === '\r' && !inQuotes) {
      // skip CR
    } else {
      current += ch;
    }
  }
  if (current.trim()) lines.push(current);
  if (lines.length === 0) return [];

  const header = splitCSVLine(lines[0]);
  const rows: Record<string, string>[] = [];
  for (let i = 1; i < lines.length; i++) {
    const vals = splitCSVLine(lines[i]);
    const row: Record<string, string> = {};
    for (let j = 0; j < header.length; j++) {
      row[header[j]] = vals[j] || "";
    }
    rows.push(row);
  }
  return rows;
}

function splitCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === ',' && !inQuotes) {
      result.push(current);
      current = "";
    } else {
      current += ch;
    }
  }
  result.push(current);
  return result;
}

async function fetchStateCSV(stateAbbr: string): Promise<Record<string, string>[]> {
  const key = stateAbbr.toLowerCase();
  const cached = stateCSVCache.get(key);
  if (cached && Date.now() - cached.ts < CSV_CACHE_TTL) {
    console.log(`CSV cache hit for ${key} (${cached.data.length} rows)`);
    return cached.data;
  }

  const url = `https://data.openstates.org/people/current/${key}.csv`;
  console.log(`Fetching state CSV: ${url}`);
  const resp = await fetchWithTimeout(url, {}, 15000);
  if (!resp.ok) {
    console.error(`CSV fetch failed for ${key}: ${resp.status}`);
    return [];
  }

  const text = await resp.text();
  const rows = parseCSV(text);
  stateCSVCache.set(key, { data: rows, ts: Date.now() });
  console.log(`Parsed ${rows.length} state legislators for ${key}`);
  return rows;
}

// --- Match state legislators from CSV by district ---

interface DivisionInfo {
  cd: number | null;        // congressional district
  sldl: string | null;      // state lower district (e.g. "51")
  sldu: string | null;      // state upper district (e.g. "14")
}

function csvRowToRep(r: Record<string, string>, stateAbbr: string): RepResult {
  const chamberName = r.current_chamber === "upper" ? "Senate" :
    (stateAbbr.toUpperCase() === "NV" || stateAbbr.toUpperCase() === "CA" || stateAbbr.toUpperCase() === "NY" || stateAbbr.toUpperCase() === "WI") ? "Assembly" : "House";
  const district = r.current_district || "";
  const party = r.current_party === "Democratic" ? "Democrat" : (r.current_party || "Unknown");

  // Build state name from abbreviation
  let stateName = "";
  for (const [name, abbr] of Object.entries(STATE_ABBRS)) {
    if (abbr === stateAbbr.toUpperCase()) {
      stateName = name.split(" ").map(w => w[0].toUpperCase() + w.slice(1)).join(" ");
      break;
    }
  }

  const office = district
    ? `${stateName} State ${chamberName} — District ${district}`
    : `${stateName} State ${chamberName}`;

  // Social handles
  const socialHandles: Record<string, string> = {};
  if (r.twitter) socialHandles.x = r.twitter.replace(/^@/, "");
  if (r.facebook) socialHandles.facebook = r.facebook;
  if (r.instagram) socialHandles.instagram = r.instagram;
  if (r.youtube) socialHandles.youtube = r.youtube;

  // Website from links (semicolon-separated)
  let website: string | undefined;
  const links = (r.links || "").split(";").map(l => l.trim()).filter(Boolean);
  if (links.length > 0) {
    website = links.find(l => l.includes(".gov")) || links[0];
  }

  const phone = r.capitol_voice || r.district_voice || undefined;

  return {
    name: r.name,
    office,
    level: "state",
    party,
    phone,
    email: r.email || undefined,
    website,
    photoUrl: r.image ? r.image.replace(/^http:\/\//i, "https://") : undefined,
    socialHandles: Object.keys(socialHandles).length > 0 ? socialHandles : undefined,
    divisionId: r.id || "",
  };
}

async function fetchStateLegislatorsFromCSV(stateAbbr: string, divisions: DivisionInfo): Promise<RepResult[]> {
  const rows = await fetchStateCSV(stateAbbr);
  if (rows.length === 0) return [];

  const results: RepResult[] = [];

  for (const r of rows) {
    const chamber = r.current_chamber;
    const district = r.current_district;

    // Match upper chamber by sldu district number
    if (chamber === "upper" && divisions.sldu !== null) {
      if (district === divisions.sldu) {
        results.push(csvRowToRep(r, stateAbbr));
      }
    }
    // Match lower chamber by sldl district number
    else if (chamber === "lower" && divisions.sldl !== null) {
      if (district === divisions.sldl) {
        results.push(csvRowToRep(r, stateAbbr));
      }
    }
  }

  console.log(`CSV match: ${results.length} state legislators for sldl:${divisions.sldl} sldu:${divisions.sldu}`);
  return results;
}

// --- Fetch current federal delegation from GitHub (unitedstates project) ---

let federalCache: { data: any[] | null; fetchedAt: number } = { data: null, fetchedAt: 0 };
let socialCache: { data: Record<string, Record<string, string>> | null; fetchedAt: number } = { data: null, fetchedAt: 0 };
const CACHE_TTL = 1000 * 60 * 60 * 24; // 24h

async function fetchFederalSocialMedia(): Promise<Record<string, Record<string, string>>> {
  if (socialCache.data && Date.now() - socialCache.fetchedAt < CACHE_TTL) {
    return socialCache.data;
  }

  try {
    const url = "https://unitedstates.github.io/congress-legislators/legislators-social-media.json";
    console.log("Fetching federal social media data");
    const resp = await fetchWithTimeout(url);
    if (!resp.ok) return {};
    const data = await resp.json();

    const result: Record<string, Record<string, string>> = {};
    for (const entry of data) {
      const bioguide = entry.id?.bioguide;
      if (!bioguide) continue;
      const social: Record<string, string> = {};
      if (entry.social?.twitter) social.x = entry.social.twitter;
      if (entry.social?.facebook) social.facebook = entry.social.facebook;
      if (entry.social?.instagram) social.instagram = entry.social.instagram;
      if (entry.social?.youtube) social.youtube = entry.social.youtube;
      if (entry.social?.youtube_id) social.youtube = social.youtube || entry.social.youtube_id;
      result[bioguide] = social;
    }

    socialCache = { data: result, fetchedAt: Date.now() };
    console.log(`Cached social media for ${Object.keys(result).length} legislators`);
    return result;
  } catch (e) {
    console.error("Error fetching social media:", e);
    return {};
  }
}

async function fetchFederalDelegation(stateAbbr: string): Promise<RepResult[]> {
  const cacheKey = stateAbbr.toUpperCase();

  const socialMediaPromise = fetchFederalSocialMedia();

  if (federalCache.data && Date.now() - federalCache.fetchedAt < CACHE_TTL) {
    const cached = (federalCache.data as any[]).filter((r: any) => r._state === cacheKey);
    if (cached.length > 0) return cached as unknown as RepResult[];
  }

  try {
    const url = "https://unitedstates.github.io/congress-legislators/legislators-current.json";
    console.log("Fetching federal legislators from GitHub (unitedstates)");
    const resp = await fetchWithTimeout(url);
    if (!resp.ok) {
      console.error("Federal data fetch error:", resp.status);
      return [];
    }
    const all = await resp.json();
    const socialMedia = await socialMediaPromise;

    const allResults: any[] = all.map((m: any) => {
      const term = m.terms[m.terms.length - 1];
      const isSenator = term.type === "sen";
      const party = term.party === "Democrat" ? "Democrat" : term.party === "Republican" ? "Republican" : term.party || "Unknown";
      const name = `${m.name.first} ${m.name.last}${m.name.suffix ? ` ${m.name.suffix}` : ""}`;
      const st = (term.state || "").toUpperCase();
      const bioguide = m.id?.bioguide;

      let office: string;
      if (isSenator) {
        office = `U.S. Senator — ${term.state_rank ? term.state_rank.charAt(0).toUpperCase() + term.state_rank.slice(1) : ""} Seat`;
      } else {
        office = `U.S. Representative — District ${term.district}`;
      }

      const socials = bioguide && socialMedia[bioguide] ? { ...socialMedia[bioguide] } : {};

      return {
        name,
        office: office.trim(),
        level: "federal" as const,
        party,
        phone: term.phone || undefined,
        email: undefined,
        website: term.url || undefined,
        photoUrl: bioguide
          ? `https://unitedstates.github.io/images/congress/225x275/${bioguide}.jpg`
          : undefined,
        socialHandles: Object.keys(socials).length > 0 ? socials : undefined,
        bioguideId: bioguide || undefined,
        divisionId: isSenator
          ? `ocd-division/country:us/state:${st.toLowerCase()}`
          : `ocd-division/country:us/state:${st.toLowerCase()}/cd:${term.district}`,
        _district: isSenator ? null : term.district,
        _state: st,
      };
    });

    federalCache = { data: allResults, fetchedAt: Date.now() };

    const stateMembers = allResults.filter((r: any) => r._state === cacheKey);
    console.log(`Found ${stateMembers.length} federal members for ${cacheKey}`);
    return stateMembers;
  } catch (e) {
    console.error("Error fetching federal delegation:", e);
    return [];
  }
}

// --- Fetch divisions from Google Civic (CD, state legislative districts) ---

async function fetchDivisions(address: string, googleKey: string): Promise<DivisionInfo> {
  const result: DivisionInfo = { cd: null, sldl: null, sldu: null };
  try {
    const url = `https://civicinfo.googleapis.com/civicinfo/v2/divisionsByAddress?key=${encodeURIComponent(googleKey)}&address=${encodeURIComponent(address)}`;
    console.log("Fetching divisions by address");
    const resp = await fetchWithTimeout(url);
    if (!resp.ok) {
      console.error("Divisions API error:", resp.status);
      return result;
    }
    const data = await resp.json();
    const divIds = data.divisions ? Object.keys(data.divisions) : [];
    for (const div of divIds) {
      const cdMatch = div.match(/\/cd:(\d+)/);
      if (cdMatch) result.cd = parseInt(cdMatch[1], 10);

      const sldlMatch = div.match(/\/sldl:(\d+[a-zA-Z]?)/);
      if (sldlMatch) result.sldl = sldlMatch[1];

      const slduMatch = div.match(/\/sldu:(\d+[a-zA-Z]?)/);
      if (slduMatch) result.sldu = slduMatch[1];
    }
    console.log(`Divisions: cd=${result.cd}, sldl=${result.sldl}, sldu=${result.sldu}`);
    return result;
  } catch (e) {
    console.error("Error fetching divisions:", e);
    return result;
  }
}

// --- Fetch election info and voter info via Google Civic API ---

interface ElectionInfo {
  id: string;
  name: string;
  electionDay: string;
  ocdDivisionId: string;
}

interface PollingLocation {
  name: string;
  address: string;
  hours: string;
  notes: string;
  sources: string[];
}

interface Contest {
  type: string;
  office: string;
  district: string;
  level: string;
  candidates: { name: string; party: string; url: string }[];
  referendumTitle?: string;
  referendumSubtitle?: string;
  referendumText?: string;
  referendumUrl?: string;
}

interface VoterInfo {
  election: ElectionInfo | null;
  pollingLocations: PollingLocation[];
  earlyVoteSites: PollingLocation[];
  dropOffLocations: PollingLocation[];
  contests: Contest[];
  stateElectionInfoUrl: string;
  localElectionInfoUrl: string;
}

async function fetchElections(googleKey: string): Promise<ElectionInfo[]> {
  try {
    const url = `https://civicinfo.googleapis.com/civicinfo/v2/elections?key=${encodeURIComponent(googleKey)}`;
    console.log("Fetching elections list");
    const resp = await fetchWithTimeout(url);
    if (!resp.ok) {
      console.error("Elections API error:", resp.status);
      return [];
    }
    const data = await resp.json();
    return (data.elections || [])
      .filter((e: any) => e.id !== "2000")
      .map((e: any) => ({
        id: e.id,
        name: e.name,
        electionDay: e.electionDay,
        ocdDivisionId: e.ocdDivisionId || "",
      }));
  } catch (e) {
    console.error("Error fetching elections:", e);
    return [];
  }
}

function parseLocation(loc: any): PollingLocation {
  const addr = loc.address || {};
  const addressStr = [addr.locationName, addr.line1, addr.line2, addr.line3, `${addr.city || ""}, ${addr.state || ""} ${addr.zip || ""}`]
    .filter(Boolean)
    .join(", ")
    .replace(/,\s*,/g, ",")
    .trim();
  return {
    name: loc.address?.locationName || loc.name || "",
    address: addressStr,
    hours: loc.pollingHours || "",
    notes: loc.notes || "",
    sources: (loc.sources || []).map((s: any) => s.name).filter(Boolean),
  };
}

async function fetchVoterInfo(address: string, googleKey: string, electionId?: string): Promise<VoterInfo> {
  const result: VoterInfo = {
    election: null,
    pollingLocations: [],
    earlyVoteSites: [],
    dropOffLocations: [],
    contests: [],
    stateElectionInfoUrl: "",
    localElectionInfoUrl: "",
  };

  try {
    const params = new URLSearchParams({
      key: googleKey,
      address: address,
    });
    if (electionId) {
      params.set("electionId", electionId);
    }

    const url = `https://civicinfo.googleapis.com/civicinfo/v2/voterinfo?${params}`;
    console.log("Fetching voter info");
    const resp = await fetchWithTimeout(url, {}, 10000);
    if (!resp.ok) {
      console.error("Voter info API error:", resp.status);
      return result;
    }

    const data = await resp.json();

    if (data.election && data.election.id !== "2000") {
      result.election = {
        id: data.election.id,
        name: data.election.name,
        electionDay: data.election.electionDay,
        ocdDivisionId: data.election.ocdDivisionId || "",
      };
    }

    result.pollingLocations = (data.pollingLocations || []).map(parseLocation);
    result.earlyVoteSites = (data.earlyVoteSites || []).map(parseLocation);
    result.dropOffLocations = (data.dropOffLocations || []).map(parseLocation);

    for (const state of data.state || []) {
      const adminBody = state.electionAdministrationBody || {};
      result.stateElectionInfoUrl = adminBody.electionInfoUrl || "";
      result.localElectionInfoUrl = adminBody.votingLocationFinderUrl || adminBody.electionInfoUrl || "";
    }

    result.contests = (data.contests || []).map((c: any) => {
      if (c.type === "Referendum") {
        return {
          type: "Referendum",
          office: "",
          district: c.district?.name || "",
          level: (c.level || []).join(", "),
          candidates: [],
          referendumTitle: c.referendumTitle || "",
          referendumSubtitle: c.referendumSubtitle || "",
          referendumText: c.referendumText || "",
          referendumUrl: c.referendumUrl || "",
        };
      }
      return {
        type: c.type || "General",
        office: c.office || "",
        district: c.district?.name || "",
        level: (c.level || []).join(", "),
        candidates: (c.candidates || []).map((cand: any) => ({
          name: cand.name || "",
          party: cand.party || "",
          url: cand.candidateUrl || "",
        })),
      };
    });
  } catch (e) {
    console.error("Error fetching voter info:", e);
  }

  return result;
}

// --- County officials via shared module (Google Civic Representatives API) ---

const countyCache = new Map<string, { data: CountyOfficial[]; ts: number }>();
const COUNTY_CACHE_TTL = 15 * 60 * 1000;

/** Wrapper: fetch county officials and convert to RepResult format */
async function fetchCountyOfficials(address: string, googleKey: string): Promise<RepResult[]> {
  const officials = await fetchCountyOfficialsFromCivic(
    address,
    googleKey,
    countyCache,
    COUNTY_CACHE_TTL,
  );
  // Convert CountyOfficial → RepResult
  // NOTE: Do NOT append county to office — it must stay consistent with
  // the standalone hook (countyOfficialToCivicRep) so that the saved-reps
  // dedup key (name::office) produces the same value from both flows.
  return officials.map((o) => ({
    name: o.name,
    office: o.office,
    level: "county" as const,
    party: o.party,
    phone: o.phone,
    email: o.email,
    website: o.website,
    photoUrl: o.photoUrl,
    socialHandles: o.channels,
    divisionId: o.divisionId,
    jurisdiction: o.county || undefined,
  }));
}

// --- School board officials via shared module (Google Civic Representatives API) ---

const schoolBoardCache = new Map<string, { data: SchoolBoardMember[]; districts: SchoolDistrict[]; ts: number }>();
const SCHOOL_BOARD_CACHE_TTL = 15 * 60 * 1000;

/** Wrapper: fetch school board members and convert to RepResult format */
async function fetchSchoolBoardOfficials(address: string, googleKey: string): Promise<RepResult[]> {
  const { members } = await fetchSchoolBoardFromCivic(
    address,
    googleKey,
    schoolBoardCache,
    SCHOOL_BOARD_CACHE_TTL,
  );
  // Convert SchoolBoardMember → RepResult
  // NOTE: Do NOT append district to office — it must stay consistent with
  // the standalone hook (schoolBoardMemberToCivicRep) so that the saved-reps
  // dedup key (name::office) produces the same value from both flows.
  return members.map((m) => ({
    name: m.name,
    office: m.office,
    level: "school_board" as const,
    party: m.party,
    phone: m.phone,
    email: m.email,
    website: m.website,
    photoUrl: m.photoUrl,
    socialHandles: m.channels,
    divisionId: m.divisionId,
    jurisdiction: m.district || undefined,
  }));
}

// --- Municipal/city officials via shared module (Google Civic Representatives API) ---

const municipalCache = new Map<string, { data: MunicipalOfficial[]; ts: number }>();
const MUNICIPAL_CACHE_TTL = 15 * 60 * 1000;

/** Wrapper: fetch municipal officials and convert to RepResult format */
async function fetchMunicipalOfficials(address: string, googleKey: string): Promise<RepResult[]> {
  const officials = await fetchMunicipalOfficialsFromCivic(
    address,
    googleKey,
    municipalCache,
    MUNICIPAL_CACHE_TTL,
  );
  // Convert MunicipalOfficial → RepResult
  // NOTE: Do NOT append municipality to office — it must stay consistent with
  // the standalone hook (municipalOfficialToCivicRep) so that the saved-reps
  // dedup key (name::office) produces the same value from both flows.
  return officials.map((o) => ({
    name: o.name,
    office: o.office,
    level: "local" as const,
    party: o.party,
    phone: o.phone,
    email: o.email,
    website: o.website,
    photoUrl: o.photoUrl,
    socialHandles: o.channels,
    divisionId: o.divisionId,
    jurisdiction: o.municipality || undefined,
  }));
}

// --- Judicial officials via shared module (Google Civic Representatives API) ---

const judicialCache = new Map<string, { data: JudicialOfficial[]; ts: number }>();
const JUDICIAL_CACHE_TTL = 15 * 60 * 1000;

/** Wrapper: fetch judicial officials and convert to RepResult format */
async function fetchJudicialOfficials(address: string, googleKey: string): Promise<RepResult[]> {
  const officials = await fetchJudicialOfficialsFromCivic(
    address,
    googleKey,
    judicialCache,
    JUDICIAL_CACHE_TTL,
  );
  // Convert JudicialOfficial → RepResult
  // NOTE: Do NOT append jurisdiction to office — it must stay consistent with
  // the standalone hook (judicialOfficialToCivicRep) so that the saved-reps
  // dedup key (name::office) produces the same value from both flows.
  return officials.map((o) => ({
    name: o.name,
    office: o.office,
    level: "judicial" as const,
    party: o.party,
    phone: o.phone,
    email: o.email,
    website: o.website,
    photoUrl: o.photoUrl,
    socialHandles: o.channels,
    divisionId: o.divisionId,
    jurisdiction: o.jurisdiction || undefined,
  }));
}

// --- Special district officials via shared module (Google Civic Representatives API) ---

const specialDistrictCache = new Map<string, { data: SpecialDistrictOfficial[]; ts: number }>();
const SPECIAL_DISTRICT_CACHE_TTL = 15 * 60 * 1000;

/** Wrapper: fetch special district officials and convert to RepResult format */
async function fetchSpecialDistrictOfficials(address: string, googleKey: string): Promise<RepResult[]> {
  const officials = await fetchSpecialDistrictOfficialsFromCivic(
    address,
    googleKey,
    specialDistrictCache,
    SPECIAL_DISTRICT_CACHE_TTL,
  );
  // Convert SpecialDistrictOfficial → RepResult
  // NOTE: Do NOT append district to office — it must stay consistent with
  // the standalone hook (specialDistrictOfficialToCivicRep) so that the saved-reps
  // dedup key (name::office) produces the same value from both flows.
  return officials.map((o) => ({
    name: o.name,
    office: o.office,
    level: "special_district" as const,
    party: o.party,
    phone: o.phone,
    email: o.email,
    website: o.website,
    photoUrl: o.photoUrl,
    socialHandles: o.channels,
    divisionId: o.divisionId,
    jurisdiction: o.district || undefined,
  }));
}

// --- Main handler ---

serve(async (req) => {
  const preflight = handleCors(req);
  if (preflight) return preflight;

  try {
    const { address, stateAbbr: rawStateAbbr } = await req.json();

    // State-only mode: return federal delegation without geocoding
    if (rawStateAbbr && typeof rawStateAbbr === "string") {
      const st = rawStateAbbr.toUpperCase();
      console.log(`State-only federal lookup for ${st}`);
      const federalReps = await fetchFederalDelegation(st);
      const clean = federalReps.map(({ _district, _state, ...rest }: any) => rest);
      return new Response(
        JSON.stringify({ success: true, representatives: clean }),
        { headers: withCache({ ...getCorsHeaders(req), "Content-Type": "application/json" }) }
      );
    }

    if (!address || typeof address !== "string") {
      return new Response(
        JSON.stringify({ success: false, error: "Address or stateAbbr is required" }),
        { status: 400, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" } }
      );
    }

    // Step 1: Geocode address
    const geo = await geocodeAddress(address);
    if (!geo) {
      return new Response(
        JSON.stringify({ success: false, error: "Could not find that address. Please enter a valid U.S. address." }),
        { status: 400, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" } }
      );
    }
    console.log(`Geocoded to ${geo.lat}, ${geo.lng}, state: ${geo.stateAbbr}`);

    // Step 2: Fetch divisions + federal delegation in parallel
    const googleKey = Deno.env.get("GOOGLE_CIVIC_API_KEY");

    const [divisions, federalAll, elections, voterInfo, countyOfficials, schoolBoardOfficials, municipalOfficials, judicialOfficials, specialDistrictOfficials] = await Promise.all([
      googleKey ? fetchDivisions(address, googleKey) : Promise.resolve({ cd: null, sldl: null, sldu: null } as DivisionInfo),
      fetchFederalDelegation(geo.stateAbbr),
      googleKey ? fetchElections(googleKey) : Promise.resolve([]),
      googleKey ? fetchVoterInfo(address, googleKey) : Promise.resolve(null),
      googleKey ? fetchCountyOfficials(address, googleKey) : Promise.resolve([]),
      googleKey ? fetchSchoolBoardOfficials(address, googleKey) : Promise.resolve([]),
      googleKey ? fetchMunicipalOfficials(address, googleKey) : Promise.resolve([]),
      googleKey ? fetchJudicialOfficials(address, googleKey) : Promise.resolve([]),
      googleKey ? fetchSpecialDistrictOfficials(address, googleKey) : Promise.resolve([]),
    ]);

    // Step 3: Fetch state legislators from CSV (uses division district numbers)
    const stateLegislators = await fetchStateLegislatorsFromCSV(geo.stateAbbr, divisions);

    // Step 4: Filter federal reps to relevant district
    let federalReps = federalAll;
    if (divisions.cd !== null) {
      console.log(`Congressional district: ${divisions.cd}`);
      federalReps = federalAll.filter((r: any) => {
        if (r._district === null) return true; // senators
        return r._district === divisions.cd;
      });
    }

    const cleanFederal: RepResult[] = federalReps.map(({ _district, _state, ...rest }: any) => rest);

    // Step 5: Deduplicate by name + level (prevents collision between
    // county/state/federal officials who share the same name)
    const seen = new Set<string>();
    const allReps: RepResult[] = [];
    for (const rep of [...cleanFederal, ...stateLegislators, ...countyOfficials, ...judicialOfficials, ...specialDistrictOfficials, ...schoolBoardOfficials, ...municipalOfficials]) {
      const key = `${rep.name.toLowerCase().replace(/[^a-z]/g, "")}:${rep.level}:${rep.office.toLowerCase().replace(/[^a-z]/g, "").slice(0, 30)}`;
      if (!seen.has(key)) {
        seen.add(key);
        allReps.push(rep);
      }
    }

    const levelOrder: RepResult["level"][] = ["federal", "state", "county", "judicial", "special_district", "school_board", "local"];
    const levelLabels: Record<string, string> = {
      federal: "Federal Representatives",
      state: "State Officials & Legislators",
      county: "County Officials",
      judicial: "Judges & Courts",
      special_district: "Special District Officials",
      school_board: "School Board Members",
      local: "City & Local Officials",
    };

    const groups = levelOrder
      .map((lvl) => ({
        level: lvl,
        label: levelLabels[lvl],
        representatives: allReps.filter((r) => r.level === lvl),
      }))
      .filter((g) => g.representatives.length > 0);

    console.log(`Found ${allReps.length} representatives across ${groups.length} levels`);

    return new Response(
      JSON.stringify({
        success: true,
        normalizedAddress: geo.display,
        groups,
        totalReps: allReps.length,
        elections,
        voterInfo,
      }),
      { headers: withCache({ ...getCorsHeaders(req), "Content-Type": "application/json" }) }
    );
  } catch (e) {
    console.error("fetch-civic-reps error:", e);
    return new Response(
      JSON.stringify({ success: false, error: e.message }),
      { status: 500, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" } }
    );
  }
});
