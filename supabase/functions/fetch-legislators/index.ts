// fetch-legislators: Returns state legislators from OpenStates bulk CSV data.
// Data source: https://data.openstates.org/people/current/{state_abbr}.csv
// This replaces the OpenStates v3 API which requires an API key that has become invalid.
// CSV data is freely available under CC-0 license, updated regularly.

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// Map full state names to two-letter abbreviations for CSV URL construction
const STATE_ABBR: Record<string, string> = {
  alabama: "al", alaska: "ak", arizona: "az", arkansas: "ar", california: "ca",
  colorado: "co", connecticut: "ct", delaware: "de", florida: "fl", georgia: "ga",
  hawaii: "hi", idaho: "id", illinois: "il", indiana: "in", iowa: "ia",
  kansas: "ks", kentucky: "ky", louisiana: "la", maine: "me", maryland: "md",
  massachusetts: "ma", michigan: "mi", minnesota: "mn", mississippi: "ms",
  missouri: "mo", montana: "mt", nebraska: "ne", nevada: "nv",
  "new hampshire": "nh", "new jersey": "nj", "new mexico": "nm", "new york": "ny",
  "north carolina": "nc", "north dakota": "nd", ohio: "oh", oklahoma: "ok",
  oregon: "or", pennsylvania: "pa", "rhode island": "ri", "south carolina": "sc",
  "south dakota": "sd", tennessee: "tn", texas: "tx", utah: "ut", vermont: "vt",
  virginia: "va", washington: "wa", "west virginia": "wv", wisconsin: "wi",
  wyoming: "wy", "district of columbia": "dc",
};

// Simple CSV parser — handles quoted fields with commas/newlines
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

// In-memory cache: keyed by state abbreviation, with expiry
const cache = new Map<string, { data: Record<string, string>[]; ts: number }>();
const CACHE_TTL = 1000 * 60 * 60; // 1 hour

async function fetchStateCSV(stateAbbr: string): Promise<Record<string, string>[]> {
  const cached = cache.get(stateAbbr);
  if (cached && Date.now() - cached.ts < CACHE_TTL) {
    console.log(`Cache hit for ${stateAbbr} (${cached.data.length} legislators)`);
    return cached.data;
  }

  const url = `https://data.openstates.org/people/current/${stateAbbr}.csv`;
  console.log(`Fetching legislators CSV: ${url}`);

  const resp = await fetch(url);
  if (!resp.ok) {
    throw new Error(`Failed to fetch CSV for ${stateAbbr}: ${resp.status}`);
  }

  const text = await resp.text();
  const rows = parseCSV(text);
  cache.set(stateAbbr, { data: rows, ts: Date.now() });
  console.log(`Parsed ${rows.length} legislators for ${stateAbbr}`);
  return rows;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { chamber, search, page = 1, per_page = 50, jurisdiction = 'Nevada' } = await req.json().catch(() => ({}));

    // Resolve state abbreviation
    const stateAbbr = STATE_ABBR[jurisdiction.toLowerCase()] || jurisdiction.toLowerCase();
    if (!stateAbbr || stateAbbr.length !== 2) {
      return new Response(
        JSON.stringify({ success: false, error: `Unknown jurisdiction: ${jurisdiction}` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const rows = await fetchStateCSV(stateAbbr);

    // Filter by chamber
    let filtered = rows;
    if (chamber === 'upper' || chamber === 'senate') {
      filtered = filtered.filter(r => r.current_chamber === 'upper');
    } else if (chamber === 'lower' || chamber === 'assembly') {
      filtered = filtered.filter(r => r.current_chamber === 'lower');
    }

    // Filter by name search
    if (search) {
      const q = search.toLowerCase();
      filtered = filtered.filter(r => r.name.toLowerCase().includes(q));
    }

    const total = filtered.length;

    // Paginate
    const pageNum = Math.max(1, Number(page));
    const perPage = Math.min(100, Math.max(1, Number(per_page)));
    const start = (pageNum - 1) * perPage;
    const pageRows = filtered.slice(start, start + perPage);

    // Transform to legislator format matching the frontend interface
    const legislators = pageRows.map((r) => {
      const chamberName = r.current_chamber === 'upper' ? 'Senate' : 'Assembly';
      const district = r.current_district || '';
      const party = r.current_party === 'Democratic' ? 'Democrat' : (r.current_party || 'Unknown');
      const title = chamberName === 'Senate' ? 'Senator' : 'Representative';

      // Build social handles
      const socialHandles: Record<string, string> = {};
      if (r.twitter) socialHandles.x = r.twitter.replace(/^@/, '');
      if (r.facebook) socialHandles.facebook = r.facebook;
      if (r.instagram) socialHandles.instagram = r.instagram;
      if (r.youtube) socialHandles.youtube = r.youtube;

      // Extract primary website from links (semicolon-separated)
      let website: string | undefined;
      const links = (r.links || '').split(';').map(l => l.trim()).filter(Boolean);
      if (links.length > 0) {
        // Prefer official legislative site
        website = links.find(l => l.includes('.gov')) || links[0];
      }

      // Phone: prefer capitol, fallback to district
      const phone = r.capitol_voice || r.district_voice || undefined;

      return {
        id: r.id,
        name: r.name,
        title: district ? `${title}, District ${district}` : title,
        party,
        office: `${jurisdiction} ${chamberName}`,
        region: district ? `District ${district}` : '',
        level: 'state' as const,
        imageUrl: r.image ? r.image.replace(/^http:\/\//i, 'https://') : undefined,
        chamber: chamberName,
        district,
        email: r.email || undefined,
        website,
        phone,
        socialHandles: Object.keys(socialHandles).length > 0 ? socialHandles : undefined,
        openstatesUrl: `https://open.pluralpolicy.com/${r.id?.replace('ocd-person/', '')}` || undefined,
      };
    });

    return new Response(
      JSON.stringify({ success: true, legislators, total }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error fetching legislators:', error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Failed to fetch legislators' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
