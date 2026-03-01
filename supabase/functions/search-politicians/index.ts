const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

export interface PoliticianSuggestion {
  id: string;
  name: string;
  title: string;
  party: string;
  state: string;
  level: 'federal' | 'state';
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { query } = await req.json().catch(() => ({}));

    if (!query || query.trim().length < 2) {
      return new Response(
        JSON.stringify({ success: true, suggestions: [] }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const q = query.trim();
    const suggestions: PoliticianSuggestion[] = [];

    // ── 1. Congress.gov members ──────────────────────────────────────────────
    // The Congress.gov q={"name":...} filter doesn't actually filter by name.
    // Instead, fetch all current members (two pages of 250) and filter locally.
    const congressKey = Deno.env.get('CONGRESS_API_KEY');
    if (congressKey) {
      try {
        const fetchPage = async (offset: number): Promise<any[]> => {
          const params = new URLSearchParams({
            'currentMember': 'true',
            'limit': '250',
            'offset': String(offset),
            'format': 'json',
            'api_key': congressKey,
          });
          const resp = await fetch(
            `https://api.congress.gov/v3/member?${params}`,
            { headers: { Accept: 'application/json' } }
          );
          if (!resp.ok) return [];
          const data = await resp.json();
          return data.members || [];
        };

        // Fetch two pages in parallel — covers all ~535 current members
        const [page0, page1] = await Promise.all([fetchPage(0), fetchPage(250)]);
        const allMembers = [...page0, ...page1];

        // Filter by name (Congress.gov stores as "LastName, FirstName")
        const qLower = q.toLowerCase();
        const matches = allMembers.filter((m) => {
          const raw = (m.name || '').toLowerCase();
          const formatted = formatName(m.name || '').toLowerCase();
          return raw.includes(qLower) || formatted.includes(qLower);
        });

        for (const m of matches.slice(0, 8)) {
          const lastTerm = (m.terms?.item || []).at(-1);
          const chamber = lastTerm?.chamber || '';
          const title = chamber.toLowerCase().includes('senate') ? 'Senator' : 'Representative';
          suggestions.push({
            id: `congress-${m.bioguideId}`,
            name: formatName(m.name || ''),
            title,
            party: normalizeParty(m.partyName || ''),
            state: m.state || '',
            level: 'federal',
          });
        }
      } catch (e) {
        console.warn('Congress.gov search error:', e);
      }
    }

    // ── 2. OpenStates people ─────────────────────────────────────────────────
    const openStatesKey = Deno.env.get('OPENSTATES_API_KEY');
    if (openStatesKey) {
      try {
        const params = new URLSearchParams({
          name: q,
          per_page: '6',
          include: 'other_names',
        });
        const resp = await fetch(
          `https://v3.openstates.org/people?${params}`,
          { headers: { 'X-API-KEY': openStatesKey } }
        );
        if (resp.ok) {
          const data = await resp.json();
          for (const p of (data.results || [])) {
            const role = p.current_role || {};
            const chamber = (role.chamber || '').toLowerCase();
            const title = chamber === 'upper' ? 'State Senator' : chamber === 'lower' ? 'State Representative' : 'State Legislator';
            const stateAbbr = (p.jurisdiction?.name || '').replace('Nevada', 'NV');
            suggestions.push({
              id: `state-${p.id}`,
              name: p.name || '',
              title,
              party: normalizeParty(p.party || ''),
              state: p.jurisdiction?.name || stateAbbr,
              level: 'state',
            });
          }
        }
      } catch (e) {
        console.warn('OpenStates search error:', e);
      }
    }

    // Deduplicate by lowercased name, federal first
    const seen = new Set<string>();
    const unique = suggestions.filter((s) => {
      const key = s.name.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    return new Response(
      JSON.stringify({ success: true, suggestions: unique.slice(0, 10) }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('search-politicians error:', err);
    return new Response(
      JSON.stringify({ success: false, suggestions: [], error: String(err) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// "Pelosi, Nancy" → "Nancy Pelosi"
function formatName(raw: string): string {
  if (!raw.includes(',')) return raw;
  const [last, first] = raw.split(',').map((s) => s.trim());
  return first ? `${first} ${last}` : last;
}

function normalizeParty(raw: string): string {
  const r = raw.toLowerCase();
  if (r.includes('democrat')) return 'Democrat';
  if (r.includes('republican')) return 'Republican';
  if (r.includes('independent')) return 'Independent';
  return raw;
}
