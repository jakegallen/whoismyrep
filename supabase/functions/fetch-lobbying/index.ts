const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const BASE_URL = 'https://lda.senate.gov/api/v1';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { endpoint = 'filings', search, page = 1, filing_year, filing_type, registrant_name, client_name } = await req.json().catch(() => ({}));

    let url: string;

    if (endpoint === 'filings') {
      const params = new URLSearchParams({
        page: String(page),
        page_size: '20',
        ordering: '-dt_posted',
        // LDA API requires at least one filter param — default to current year
        filing_year: String(filing_year || new Date().getFullYear()),
      });

      if (search) {
        params.set('client_name', search);
      }
      if (filing_type) {
        params.set('filing_type', filing_type);
      }
      if (registrant_name) {
        params.set('registrant_name', registrant_name);
      }
      if (client_name) {
        params.set('client_name', client_name);
      }

      url = `${BASE_URL}/filings/?${params}`;
    } else if (endpoint === 'registrants') {
      const params = new URLSearchParams({
        page: String(page),
        page_size: '20',
      });
      if (search) {
        params.set('name', search);
      }
      url = `${BASE_URL}/registrants/?${params}`;
    } else if (endpoint === 'clients') {
      const params = new URLSearchParams({
        page: String(page),
        page_size: '20',
      });
      if (search) {
        params.set('name', search);
      }
      // Filter for Nevada clients
      if (!search) {
        params.set('name', 'Nevada');
      }
      url = `${BASE_URL}/clients/?${params}`;
    } else if (endpoint === 'lobbyists') {
      const params = new URLSearchParams({
        page: String(page),
        page_size: '20',
      });
      if (search) {
        params.set('lobbyist_name', search);
      }
      url = `${BASE_URL}/lobbyists/?${params}`;
    } else {
      url = `${BASE_URL}/filings/?page=${page}&page_size=20&ordering=-dt_posted`;
    }

    console.log('Fetching Senate LDA:', url);

    const resp = await fetch(url, {
      headers: { 'Accept': 'application/json' },
    });

    if (!resp.ok) {
      const errText = await resp.text();
      console.error(`Senate LDA API error: ${resp.status} ${errText}`);
      return new Response(
        JSON.stringify({ success: false, error: `Senate LDA API error: ${resp.status}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await resp.json();
    const results = data.results || [];

    let items: any[];

    if (endpoint === 'filings') {
      items = results.map((f: any) => ({
        id: f.filing_uuid || '',
        filingType: f.filing_type_display || f.filing_type || '',
        filingYear: f.filing_year || '',
        filingPeriod: f.filing_period_display || f.filing_period || '',
        datePosted: f.dt_posted || '',
        registrant: f.registrant?.name || '',
        registrantId: f.registrant?.id || '',
        registrantDescription: f.registrant?.description || '',
        client: f.client?.name || '',
        clientId: f.client?.id || '',
        clientState: f.client?.state || '',
        clientCountry: f.client?.country || '',
        clientDescription: f.client?.client_general_description || '',
        amount: f.income || f.expenses || null,
        lobbyists: (f.lobbying_activities || []).flatMap((a: any) =>
          (a.lobbyists || []).map((l: any) => ({
            name: `${l.lobbyist?.first_name || ''} ${l.lobbyist?.last_name || ''}`.trim(),
            coveredPosition: l.covered_position || '',
          }))
        ),
        issues: (f.lobbying_activities || []).map((a: any) => ({
          generalIssue: a.general_issue_code_display || a.general_issue_code || '',
          description: a.description || '',
        })),
        url: f.filing_document_url || `https://lda.senate.gov/filings/public/filing/${f.filing_uuid}/print/`,
      }));
    } else if (endpoint === 'registrants') {
      items = results.map((r: any) => ({
        id: r.id || '',
        name: r.name || '',
        description: r.description || '',
        address: r.address || '',
        country: r.country || '',
        state: r.state || '',
        url: r.url || '',
      }));
    } else if (endpoint === 'clients') {
      items = results.map((c: any) => ({
        id: c.id || '',
        name: c.name || '',
        description: c.client_general_description || '',
        state: c.state || '',
        country: c.country || '',
        url: c.url || '',
      }));
    } else {
      items = results.map((l: any) => ({
        id: l.id || '',
        name: `${l.lobbyist?.first_name || ''} ${l.lobbyist?.last_name || ''}`.trim(),
        prefix: l.lobbyist?.prefix || '',
        suffix: l.lobbyist?.suffix || '',
        url: l.url || '',
      }));
    }

    console.log(`Fetched ${items.length} LDA ${endpoint} (page ${page})`);

    return new Response(
      JSON.stringify({
        success: true,
        items,
        total: data.count || items.length,
        page,
        totalPages: Math.ceil((data.count || 1) / 20),
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error fetching lobbying data:', error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Failed to fetch lobbying data' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
