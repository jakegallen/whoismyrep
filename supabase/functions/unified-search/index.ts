const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') || '';

async function invokeFunction(name: string, body: Record<string, unknown>): Promise<any> {
  const resp = await fetch(`${SUPABASE_URL}/functions/v1/${name}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      'apikey': SUPABASE_ANON_KEY,
    },
    body: JSON.stringify(body),
  });
  if (!resp.ok) return null;
  return resp.json();
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { query, sources } = await req.json().catch(() => ({ query: '', sources: [] }));

    if (!query || query.trim().length < 2) {
      return new Response(
        JSON.stringify({ success: false, error: 'Search query must be at least 2 characters' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const q = query.trim();
    const enabledSources: string[] = sources?.length > 0
      ? sources
      : ['bills', 'court_cases', 'lobbying', 'federal_register', 'news'];

    console.log(`Unified search: "${q}" across [${enabledSources.join(', ')}]`);

    // Fan out all searches in parallel
    const promises: Record<string, Promise<any>> = {};

    if (enabledSources.includes('bills')) {
      promises.bills = invokeFunction('fetch-bills', { search: q, per_page: 8 });
    }
    if (enabledSources.includes('court_cases')) {
      promises.court_cases = invokeFunction('fetch-court-cases', { search: q, per_page: 8 });
    }
    if (enabledSources.includes('lobbying')) {
      promises.lobbying = invokeFunction('fetch-lobbying', { endpoint: 'filings', search: q });
    }
    if (enabledSources.includes('federal_register')) {
      promises.federal_register = invokeFunction('fetch-federal-register', { search: q, per_page: 8 });
    }
    if (enabledSources.includes('news')) {
      promises.news = invokeFunction('fetch-nevada-news', { search: q });
    }

    const keys = Object.keys(promises);
    const settled = await Promise.allSettled(Object.values(promises));

    const results: Record<string, any[]> = {};
    const counts: Record<string, number> = {};

    for (let i = 0; i < keys.length; i++) {
      const key = keys[i];
      const outcome = settled[i];

      if (outcome.status === 'fulfilled' && outcome.value?.success !== false) {
        const data = outcome.value;
        let items: any[] = [];

        switch (key) {
          case 'bills':
            items = (data.bills || []).map((b: any) => ({
              id: b.id,
              title: b.billNumber + ': ' + b.title,
              description: b.abstract || b.status || '',
              date: b.latestActionDate || b.dateIntroduced || '',
              url: b.url,
              meta: { chamber: b.chamber, type: b.type, sponsors: b.sponsors },
            }));
            break;
          case 'court_cases':
            items = (data.cases || []).map((c: any) => ({
              id: c.id || c.absoluteUrl,
              title: c.caseName || c.caseTitle || 'Untitled case',
              description: c.snippet || c.suitNature || '',
              date: c.dateFiled || '',
              url: c.absoluteUrl ? `https://www.courtlistener.com${c.absoluteUrl}` : '',
              meta: { court: c.court, status: c.status },
            }));
            break;
          case 'lobbying':
            items = (data.filings || []).map((f: any) => ({
              id: f.id || f.filing_uuid,
              title: (f.registrant?.name || 'Unknown') + ' → ' + (f.client?.name || 'Unknown'),
              description: f.specific_issues?.join('; ') || f.filing_type || '',
              date: f.dt_posted || '',
              url: f.filing_url || '',
              meta: { amount: f.income || f.expenses, type: f.filing_type },
            }));
            break;
          case 'federal_register':
            items = (data.documents || []).map((d: any) => ({
              id: d.document_number || d.id,
              title: d.title || 'Untitled',
              description: d.abstract || d.excerpt || '',
              date: d.publication_date || '',
              url: d.html_url || d.url || '',
              meta: { type: d.type, agencies: d.agencies?.map((a: any) => a.name) },
            }));
            break;
          case 'news':
            items = (data.articles || []).map((a: any) => ({
              id: a.id || a.url,
              title: a.title || 'Untitled',
              description: a.description || a.excerpt || '',
              date: a.pubDate || a.publishedAt || '',
              url: a.url,
              meta: { source: a.source },
            }));
            break;
        }

        results[key] = items;
        counts[key] = items.length;
      } else {
        results[key] = [];
        counts[key] = 0;
        console.log(`Source "${key}" failed or returned no data`);
      }
    }

    const totalResults = Object.values(counts).reduce((a, b) => a + b, 0);
    console.log(`Unified search complete: ${totalResults} total results`, counts);

    return new Response(
      JSON.stringify({ success: true, query: q, results, counts, totalResults }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Unified search error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Search failed' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
