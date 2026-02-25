import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface CivicOfficial {
  name: string;
  party: string;
  phones?: string[];
  urls?: string[];
  emails?: string[];
  photoUrl?: string;
  channels?: { type: string; id: string }[];
}

interface CivicOffice {
  name: string;
  divisionId: string;
  levels?: string[];
  roles?: string[];
  officialIndices: number[];
}

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

    const apiKey = Deno.env.get("GOOGLE_CIVIC_API_KEY");
    if (!apiKey) {
      return new Response(
        JSON.stringify({ success: false, error: "Google Civic API key not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const params = new URLSearchParams({
      key: apiKey,
      address,
      levels: "country",
      // We'll actually request all levels; the API returns what matches
    });
    // Remove the levels param so we get everything
    params.delete("levels");

    const url = `https://www.googleapis.com/civicinfo/v2/representatives?${params}`;
    console.log("Fetching Google Civic data for:", address);

    const resp = await fetch(url);
    if (!resp.ok) {
      const errText = await resp.text();
      console.error("Google Civic API error:", resp.status, errText);
      return new Response(
        JSON.stringify({ success: false, error: `Google Civic API error: ${resp.status}` }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await resp.json();
    const offices: CivicOffice[] = data.offices || [];
    const officials: CivicOfficial[] = data.officials || [];
    const normalizedAddress = data.normalizedInput
      ? `${data.normalizedInput.line1 || ""}, ${data.normalizedInput.city || ""}, ${data.normalizedInput.state || ""} ${data.normalizedInput.zip || ""}`.trim()
      : address;

    // Map each office+official into a flat list with level info
    type RepResult = {
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
    };

    const reps: RepResult[] = [];

    for (const office of offices) {
      // Determine level
      let level: RepResult["level"] = "local";
      const officeLevels = office.levels || [];
      if (officeLevels.includes("country")) level = "federal";
      else if (officeLevels.includes("administrativeArea1")) level = "state";
      else if (officeLevels.includes("administrativeArea2")) level = "county";
      else if (
        officeLevels.includes("locality") ||
        officeLevels.includes("regional") ||
        officeLevels.includes("special")
      )
        level = "local";

      for (const idx of office.officialIndices) {
        const official = officials[idx];
        if (!official) continue;

        const socialHandles: Record<string, string> = {};
        for (const ch of official.channels || []) {
          socialHandles[ch.type.toLowerCase()] = ch.id;
        }

        reps.push({
          name: official.name,
          office: office.name,
          level,
          party: (official.party || "Unknown")
            .replace("Democratic Party", "Democrat")
            .replace("Republican Party", "Republican")
            .replace("Nonpartisan", "Nonpartisan"),
          phone: official.phones?.[0],
          email: official.emails?.[0],
          website: official.urls?.[0],
          photoUrl: official.photoUrl,
          socialHandles: Object.keys(socialHandles).length ? socialHandles : undefined,
          divisionId: office.divisionId,
        });
      }
    }

    // Group by level
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
        representatives: reps.filter((r) => r.level === lvl),
      }))
      .filter((g) => g.representatives.length > 0);

    console.log(`Found ${reps.length} representatives across ${groups.length} levels`);

    return new Response(
      JSON.stringify({
        success: true,
        normalizedAddress,
        groups,
        totalReps: reps.length,
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
