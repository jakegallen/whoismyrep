import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// --- Types ---

interface RepResult {
  name: string;
  office: string;
  level: "federal" | "state" | "county" | "local";
  party: string;
  phone?: string;
  email?: string;
  website?: string;
  photoUrl?: string;
  socialHandles?: Record<string, string>;
  divisionId: string;
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
  
  // Extract state abbreviation from address details
  const stateCode = results[0].address?.["ISO3166-2-lvl4"]?.replace("US-", "") || "";
  const stateName = results[0].address?.state || "";
  // Fallback: try to extract from display name
  const stateAbbr = stateCode || extractStateAbbr(stateName) || "NV";
  
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

// --- Fallback: hardcoded Nevada state officials ---

const FALLBACK_STATE_REPS: RepResult[] = [
  { name: "Joe Lombardo", office: "Governor of Nevada", level: "state", party: "Republican", website: "https://gov.nv.gov", photoUrl: "https://gov.nv.gov/wp-content/uploads/2024/02/jl-headshot-1-scaled.jpg", divisionId: "ocd-division/country:us/state:nv" },
  { name: "Stavros Anthony", office: "Lt. Governor of Nevada", level: "state", party: "Republican", website: "https://ltgov.nv.gov", divisionId: "ocd-division/country:us/state:nv" },
  { name: "Aaron D. Ford", office: "Nevada Attorney General", level: "state", party: "Democrat", website: "https://ag.nv.gov", divisionId: "ocd-division/country:us/state:nv" },
  { name: "Francisco Aguilar", office: "Nevada Secretary of State", level: "state", party: "Democrat", website: "https://www.nvsos.gov", divisionId: "ocd-division/country:us/state:nv" },
  { name: "Zach Conine", office: "Nevada State Treasurer", level: "state", party: "Democrat", website: "https://www.nevadatreasurer.gov", divisionId: "ocd-division/country:us/state:nv" },
];

const FALLBACK_FEDERAL_REPS: RepResult[] = [
  { name: "Catherine Cortez Masto", office: "U.S. Senator — Senior Seat", level: "federal", party: "Democrat", website: "https://www.cortezmasto.senate.gov", photoUrl: "https://bioguide.congress.gov/bioguide/photo/C/C001113.jpg", phone: "(202) 224-3542", divisionId: "ocd-division/country:us/state:nv" },
  { name: "Jacky Rosen", office: "U.S. Senator — Junior Seat", level: "federal", party: "Democrat", website: "https://www.rosen.senate.gov", photoUrl: "https://bioguide.congress.gov/bioguide/photo/R/R000608.jpg", phone: "(202) 224-6244", divisionId: "ocd-division/country:us/state:nv" },
  { name: "Dina Titus", office: "U.S. Representative — District 1", level: "federal", party: "Democrat", website: "https://titus.house.gov", photoUrl: "https://bioguide.congress.gov/bioguide/photo/T/T000468.jpg", divisionId: "ocd-division/country:us/state:nv/cd:1" },
  { name: "Mark Amodei", office: "U.S. Representative — District 2", level: "federal", party: "Republican", website: "https://amodei.house.gov", photoUrl: "https://bioguide.congress.gov/bioguide/photo/A/A000369.jpg", divisionId: "ocd-division/country:us/state:nv/cd:2" },
  { name: "Susie Lee", office: "U.S. Representative — District 3", level: "federal", party: "Democrat", website: "https://susielee.house.gov", photoUrl: "https://bioguide.congress.gov/bioguide/photo/L/L000590.jpg", divisionId: "ocd-division/country:us/state:nv/cd:3" },
  { name: "Steven Horsford", office: "U.S. Representative — District 4", level: "federal", party: "Democrat", website: "https://horsford.house.gov", photoUrl: "https://bioguide.congress.gov/bioguide/photo/H/H001066.jpg", divisionId: "ocd-division/country:us/state:nv/cd:4" },
];

// --- Open States people.geo for state legislators ---

async function fetchStateLegislators(lat: number, lng: number, apiKey: string): Promise<RepResult[]> {
  try {
    const url = `https://v3.openstates.org/people.geo?lat=${lat}&lng=${lng}&include=links`;
    console.log("Fetching Open States people.geo:", url.substring(0, 80));
    const resp = await fetchWithTimeout(url, {
      headers: { "X-API-KEY": apiKey },
    });
    if (!resp.ok) {
      const text = await resp.text();
      console.error("Open States error:", resp.status, text);
      console.log("Falling back to local state official data");
      return FALLBACK_STATE_REPS;
    }
    const data = await resp.json();
    const results: RepResult[] = [];

    for (const person of data.results || []) {
      const party = (person.party || "Unknown")
        .replace("Democratic", "Democrat")
        .replace("Republican", "Republican");

      let office = "State Legislator";
      let level: RepResult["level"] = "state";
      const roles = person.current_role;
      if (roles) {
        const orgClass = roles.org_classification || "";
        const chamber = orgClass === "upper" ? "Senate" : "House";
        const district = roles.district || "";
        const jurisdictionClass = person.jurisdiction?.classification || "";
        const jurisdictionName = (person.jurisdiction?.name || "");
        const isFederal = jurisdictionClass === "government" || jurisdictionName.toLowerCase().includes("united states");
        
        console.log(`  ${person.name}: jurisdiction=${jurisdictionClass}/${jurisdictionName}, org=${orgClass}, district=${district}`);
        
        if (isFederal) {
          level = "federal";
          if (orgClass === "upper") {
            office = `U.S. Senator`;
          } else {
            office = `U.S. Representative — District ${district}`;
          }
        } else {
          // Use jurisdiction name (e.g. "District of Columbia", "California") instead of hardcoded "Nevada"
          const stateName = jurisdictionName || "State";
          office = `${stateName} State ${chamber} — District ${district}`;
        }
      }

      let phone: string | undefined;
      let email: string | undefined;
      let website: string | undefined;

      for (const office_entry of person.offices || []) {
        if (office_entry.voice && !phone) phone = office_entry.voice;
        if (office_entry.email && !email) email = office_entry.email;
      }
      email = email || person.email || undefined;

      for (const link of person.links || []) {
        if (link.url && !website) website = link.url;
      }

      results.push({
        name: person.name,
        office,
        level,
        party,
        phone,
        email,
        website,
        photoUrl: person.image || undefined,
        divisionId: person.jurisdiction?.id || "",
      });
    }

    if (results.length === 0) {
      console.log("Open States returned 0 results, using fallback");
      return FALLBACK_STATE_REPS;
    }

    return results;
  } catch (e) {
    console.error("Open States fetch failed:", e);
    console.log("Falling back to local state official data");
    return FALLBACK_STATE_REPS;
  }
}

// --- Fetch current federal delegation from GitHub (unitedstates project) ---

let federalCache: { data: any[] | null; fetchedAt: number } = { data: null, fetchedAt: 0 };
let socialCache: { data: Record<string, Record<string, string>> | null; fetchedAt: number } = { data: null, fetchedAt: 0 };
const CACHE_TTL = 1000 * 60 * 60 * 24; // 24h

// Fetch social media handles from theunitedstates.io
async function fetchFederalSocialMedia(): Promise<Record<string, Record<string, string>>> {
  if (socialCache.data && Date.now() - socialCache.fetchedAt < CACHE_TTL) {
    return socialCache.data;
  }

  try {
    const url = "https://theunitedstates.io/congress-legislators/legislators-social-media.json";
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
  
  // Fetch social media in parallel with main data
  const socialMediaPromise = fetchFederalSocialMedia();
  
  // Use cached data if fresh
  if (federalCache.data && Date.now() - federalCache.fetchedAt < CACHE_TTL) {
    const cached = (federalCache.data as any[]).filter((r: any) => r._state === cacheKey);
    if (cached.length > 0) return cached as unknown as RepResult[];
  }

  try {
    const url = "https://theunitedstates.io/congress-legislators/legislators-current.json";
    console.log("Fetching federal legislators from theunitedstates.io");
    const resp = await fetchWithTimeout(url);
    if (!resp.ok) {
      console.error("Federal data fetch error:", resp.status);
      if (cacheKey === "NV") return FALLBACK_FEDERAL_REPS;
      return [];
    }
    const all = await resp.json();
    const socialMedia = await socialMediaPromise;

    // Cache ALL members, then filter for requested state
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

      // Get social handles from the social media dataset
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
          ? `https://theunitedstates.io/images/congress/225x275/${bioguide}.jpg`
          : undefined,
        socialHandles: Object.keys(socials).length > 0 ? socials : undefined,
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
    if (cacheKey === "NV") return FALLBACK_FEDERAL_REPS;
    return [];
  }
}

// --- Determine congressional district from lat/lng using Google divisionsByAddress ---

async function getCongressionalDistrict(address: string, googleKey: string): Promise<number | null> {
  try {
    const url = `https://civicinfo.googleapis.com/civicinfo/v2/divisionsByAddress?key=${encodeURIComponent(googleKey)}&address=${encodeURIComponent(address)}`;
    console.log("Fetching divisions by address");
    const resp = await fetchWithTimeout(url);
    if (!resp.ok) {
      console.error("Divisions API error:", resp.status, await resp.text());
      return null;
    }
    const data = await resp.json();
    for (const div of data.divisions ? Object.keys(data.divisions) : []) {
      const match = div.match(/\/cd:(\d+)/);
      if (match) return parseInt(match[1], 10);
    }
    return null;
  } catch (e) {
    console.error("Error fetching congressional district:", e);
    return null;
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
      .filter((e: any) => e.id !== "2000") // filter out test election
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
      const text = await resp.text();
      console.error("Voter info API error:", resp.status, text.substring(0, 200));
      return result;
    }

    const data = await resp.json();

    // Election
    if (data.election && data.election.id !== "2000") {
      result.election = {
        id: data.election.id,
        name: data.election.name,
        electionDay: data.election.electionDay,
        ocdDivisionId: data.election.ocdDivisionId || "",
      };
    }

    // Polling locations
    result.pollingLocations = (data.pollingLocations || []).map(parseLocation);
    result.earlyVoteSites = (data.earlyVoteSites || []).map(parseLocation);
    result.dropOffLocations = (data.dropOffLocations || []).map(parseLocation);

    // State info URLs
    for (const state of data.state || []) {
      const adminBody = state.electionAdministrationBody || {};
      result.stateElectionInfoUrl = adminBody.electionInfoUrl || "";
      result.localElectionInfoUrl = adminBody.votingLocationFinderUrl || adminBody.electionInfoUrl || "";
    }

    // Contests
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

// --- Fetch social media from Google Civic representativeInfoByAddress ---

async function fetchGoogleCivicSocials(address: string, googleKey: string): Promise<Map<string, Record<string, string>>> {
  const socialMap = new Map<string, Record<string, string>>();
  try {
    const url = `https://civicinfo.googleapis.com/civicinfo/v2/representatives?key=${encodeURIComponent(googleKey)}&address=${encodeURIComponent(address)}`;
    console.log("Fetching Google Civic representatives for social media");
    const resp = await fetchWithTimeout(url, {}, 10000);
    if (!resp.ok) {
      console.warn("Google Civic representatives API error:", resp.status);
      return socialMap;
    }
    const data = await resp.json();

    for (const official of data.officials || []) {
      if (!official.name) continue;
      const nameKey = official.name.toLowerCase().replace(/[^a-z]/g, "");
      const socials: Record<string, string> = {};

      for (const channel of official.channels || []) {
        const type = (channel.type || "").toLowerCase();
        const id = channel.id || "";
        if (!id) continue;
        if (type === "twitter") socials.x = id;
        else if (type === "facebook") socials.facebook = id;
        else if (type === "youtube") socials.youtube = id;
        else if (type === "instagram") socials.instagram = id;
        else if (type === "tiktok") socials.tiktok = id;
      }

      if (Object.keys(socials).length > 0) {
        socialMap.set(nameKey, socials);
      }
    }
    console.log(`Got social media for ${socialMap.size} officials from Google Civic`);
  } catch (e) {
    console.warn("Error fetching Google Civic socials:", e);
  }
  return socialMap;
}

// --- Main handler ---

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { address } = await req.json();
    if (!address || typeof address !== "string") {
      return new Response(
        JSON.stringify({ success: false, error: "Address is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const openStatesKey = Deno.env.get("OPENSTATES_API_KEY");
    if (!openStatesKey) {
      return new Response(
        JSON.stringify({ success: false, error: "Open States API key not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Step 1: Geocode address
    const geo = await geocodeAddress(address);
    if (!geo) {
      return new Response(
        JSON.stringify({ success: false, error: "Could not find that address. Please enter a valid U.S. address." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    console.log(`Geocoded to ${geo.lat}, ${geo.lng}, state: ${geo.stateAbbr}`);

    // Step 2: Fetch state legislators + federal delegation + election data + Google Civic socials in parallel
    const googleKey = Deno.env.get("GOOGLE_CIVIC_API_KEY");

    const [stateLegislators, federalAll, district, elections, voterInfo, googleSocials] = await Promise.all([
      fetchStateLegislators(geo.lat, geo.lng, openStatesKey),
      fetchFederalDelegation(geo.stateAbbr),
      googleKey ? getCongressionalDistrict(address, googleKey) : Promise.resolve(null),
      googleKey ? fetchElections(googleKey) : Promise.resolve([]),
      googleKey ? fetchVoterInfo(address, googleKey) : Promise.resolve(null),
      googleKey ? fetchGoogleCivicSocials(address, googleKey) : Promise.resolve(new Map()),
    ]);

    // Step 3: Filter federal reps to relevant district
    let federalReps = federalAll;
    if (district !== null) {
      console.log(`Congressional district: ${district}`);
      federalReps = federalAll.filter((r: any) => {
        if (r._district === null) return true;
        return r._district === district;
      });
    }

    const cleanFederal: RepResult[] = federalReps.map(({ _district, ...rest }: any) => rest);

    // Step 4: Deduplicate by name and merge social media from Google Civic
    const seen = new Set<string>();
    const allReps: RepResult[] = [];
    for (const rep of [...cleanFederal, ...stateLegislators]) {
      const key = rep.name.toLowerCase().replace(/[^a-z]/g, "");
      if (!seen.has(key)) {
        seen.add(key);
        // Merge Google Civic social handles (fills gaps from theunitedstates.io)
        const googleHandles = googleSocials.get(key);
        if (googleHandles) {
          rep.socialHandles = { ...googleHandles, ...(rep.socialHandles || {}) };
        }
        allReps.push(rep);
      }
    }

    const levelOrder: RepResult["level"][] = ["federal", "state", "county", "local"];
    const levelLabels: Record<string, string> = {
      federal: "Federal Representatives",
      state: "State Officials & Legislators",
      county: "County Officials",
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
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("fetch-civic-reps error:", e);
    return new Response(
      JSON.stringify({ success: false, error: e.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
