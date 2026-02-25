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

// --- Geocode address using Nominatim (free, no key) ---

async function geocodeAddress(address: string): Promise<{ lat: number; lng: number; display: string } | null> {
  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(address)}&format=json&limit=1&countrycodes=us`;
  const resp = await fetch(url, {
    headers: { "User-Agent": "NevadaPoliticalDashboard/1.0" },
  });
  if (!resp.ok) {
    console.error("Nominatim error:", resp.status);
    return null;
  }
  const results = await resp.json();
  if (!results.length) return null;
  return {
    lat: parseFloat(results[0].lat),
    lng: parseFloat(results[0].lon),
    display: results[0].display_name,
  };
}

// --- Open States people.geo for state legislators ---

async function fetchStateLegislators(lat: number, lng: number, apiKey: string): Promise<RepResult[]> {
  const url = `https://v3.openstates.org/people.geo?lat=${lat}&lng=${lng}&include=links`;
  console.log("Fetching Open States people.geo:", url.substring(0, 80));
  const resp = await fetch(url, {
    headers: { "X-API-KEY": apiKey },
  });
  if (!resp.ok) {
    const text = await resp.text();
    console.error("Open States error:", resp.status, text);
    return [];
  }
  const data = await resp.json();
  const results: RepResult[] = [];

  for (const person of data.results || []) {
    const party = (person.party || "Unknown")
      .replace("Democratic", "Democrat")
      .replace("Republican", "Republican");

    // Determine office from current roles
    let office = "State Legislator";
    const roles = person.current_role;
    if (roles) {
      const chamber = roles.org_classification === "upper" ? "Senate" : "House";
      const district = roles.district || "";
      office = `Nevada State ${chamber} — District ${district}`;
    }

    // Extract contact info
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
      level: "state",
      party,
      phone,
      email,
      website,
      photoUrl: person.image || undefined,
      divisionId: person.jurisdiction?.id || "",
    });
  }

  return results;
}

// --- Fetch current Nevada federal delegation from GitHub (unitedstates project) ---

let federalCache: { data: any[] | null; fetchedAt: number } = { data: null, fetchedAt: 0 };
const CACHE_TTL = 1000 * 60 * 60 * 24; // 24h

async function fetchFederalDelegation(): Promise<RepResult[]> {
  // Use cached data if fresh
  if (federalCache.data && Date.now() - federalCache.fetchedAt < CACHE_TTL) {
    return federalCache.data as unknown as RepResult[];
  }

  try {
    const url = "https://theunitedstates.io/congress-legislators/legislators-current.json";
    console.log("Fetching federal legislators from theunitedstates.io");
    const resp = await fetch(url);
    if (!resp.ok) {
      console.error("Federal data fetch error:", resp.status);
      return [];
    }
    const all = await resp.json();

    // Filter to Nevada
    const nvMembers = all.filter((m: any) => {
      const latestTerm = m.terms?.[m.terms.length - 1];
      return latestTerm?.state === "NV";
    });

    const results: RepResult[] = nvMembers.map((m: any) => {
      const term = m.terms[m.terms.length - 1];
      const isSenator = term.type === "sen";
      const party = term.party === "Democrat" ? "Democrat" : term.party === "Republican" ? "Republican" : term.party || "Unknown";
      const name = `${m.name.first} ${m.name.last}${m.name.suffix ? ` ${m.name.suffix}` : ""}`;

      let office: string;
      if (isSenator) {
        office = `U.S. Senator — ${term.state_rank ? term.state_rank.charAt(0).toUpperCase() + term.state_rank.slice(1) : ""} Seat`;
      } else {
        office = `U.S. Representative — District ${term.district}`;
      }

      return {
        name,
        office: office.trim(),
        level: "federal" as const,
        party,
        phone: term.phone || undefined,
        email: undefined,
        website: term.url || undefined,
        photoUrl: m.id?.bioguide
          ? `https://theunitedstates.io/images/congress/225x275/${m.id.bioguide}.jpg`
          : undefined,
        divisionId: isSenator
          ? `ocd-division/country:us/state:nv`
          : `ocd-division/country:us/state:nv/cd:${term.district}`,
        _district: isSenator ? null : term.district,
      };
    });

    federalCache = { data: results as any, fetchedAt: Date.now() };
    return results;
  } catch (e) {
    console.error("Error fetching federal delegation:", e);
    return [];
  }
}

// --- Determine congressional district from lat/lng using Google divisionsByAddress ---

async function getCongressionalDistrict(address: string, googleKey: string): Promise<number | null> {
  try {
    const url = `https://civicinfo.googleapis.com/civicinfo/v2/divisionsByAddress?key=${encodeURIComponent(googleKey)}&address=${encodeURIComponent(address)}`;
    console.log("Fetching divisions by address");
    const resp = await fetch(url);
    if (!resp.ok) {
      console.error("Divisions API error:", resp.status, await resp.text());
      return null;
    }
    const data = await resp.json();
    for (const div of data.divisions ? Object.keys(data.divisions) : []) {
      // Match pattern like ocd-division/country:us/state:nv/cd:1
      const match = div.match(/\/cd:(\d+)/);
      if (match) return parseInt(match[1], 10);
    }
    return null;
  } catch (e) {
    console.error("Error fetching congressional district:", e);
    return null;
  }
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
    console.log(`Geocoded to ${geo.lat}, ${geo.lng}`);

    // Step 2: Fetch state legislators + federal delegation in parallel
    const googleKey = Deno.env.get("GOOGLE_CIVIC_API_KEY");

    const [stateLegislators, federalAll, district] = await Promise.all([
      fetchStateLegislators(geo.lat, geo.lng, openStatesKey),
      fetchFederalDelegation(),
      googleKey ? getCongressionalDistrict(address, googleKey) : Promise.resolve(null),
    ]);

    // Step 3: Filter federal reps to relevant district
    let federalReps = federalAll;
    if (district !== null) {
      console.log(`Congressional district: ${district}`);
      federalReps = federalAll.filter((r: any) => {
        // Senators represent the whole state, reps only their district
        if (r._district === null) return true; // senator
        return r._district === district;
      });
    }

    // Clean up internal fields
    const cleanFederal: RepResult[] = federalReps.map(({ _district, ...rest }: any) => rest);

    // Step 4: Build response groups
    const allReps = [...cleanFederal, ...stateLegislators];

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
