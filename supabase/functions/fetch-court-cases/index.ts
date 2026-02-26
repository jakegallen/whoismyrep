const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { type = 'opinions', search, page = 1, per_page = 20, court } = await req.json().catch(() => ({}));

    const token = Deno.env.get('COURTLISTENER_TOKEN');
    const headers: Record<string, string> = { 'Accept': 'application/json' };
    if (token) {
      headers['Authorization'] = `Token ${token}`;
    }

    let url: string;

    if (type === 'opinions') {
      const params = new URLSearchParams({
        order_by: 'dateFiled desc',
        page_size: String(per_page),
        page: String(page),
      });

      // Filter to Nevada courts
      const nevadaCourts = court || 'nev,nvd';
      nevadaCourts.split(',').forEach((c: string) => {
        params.append('court', c.trim());
      });

      if (search) {
        params.set('q', search);
      } else {
        params.set('q', 'Nevada');
      }

      url = `https://www.courtlistener.com/api/rest/v4/search/?${params}`;
    } else if (type === 'dockets') {
      const params = new URLSearchParams({
        order_by: '-date_filed',
        page_size: String(per_page),
        page: String(page),
      });

      const nevadaCourts = court || 'nev,nvd';
      nevadaCourts.split(',').forEach((c: string) => {
        params.append('court', c.trim());
      });

      if (search) {
        params.set('q', search);
      }

      url = `https://www.courtlistener.com/api/rest/v4/search/?type=r&${params}`;
    } else {
      // oral arguments
      const params = new URLSearchParams({
        order_by: '-dateArgued',
        page_size: String(per_page),
        page: String(page),
      });

      const nevadaCourts = court || 'nev,nvd';
      nevadaCourts.split(',').forEach((c: string) => {
        params.append('court', c.trim());
      });

      if (search) {
        params.set('q', search);
      }

      url = `https://www.courtlistener.com/api/rest/v4/search/?type=oa&${params}`;
    }

    console.log('Fetching CourtListener:', url);

    const resp = await fetch(url, { headers });

    if (!resp.ok) {
      const errText = await resp.text();
      console.error(`CourtListener API error: ${resp.status} ${errText}`);
      return new Response(
        JSON.stringify({ success: false, error: `CourtListener API error: ${resp.status}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await resp.json();
    const results = data.results || [];

    const cases = results.map((item: any) => {
      return {
        id: item.id || item.absolute_url || '',
        caseName: item.caseName || item.case_name || item.caseNameShort || '',
        court: item.court || item.court_citation_string || '',
        courtId: item.court_id || '',
        dateFiled: item.dateFiled || item.date_filed || '',
        dateArgued: item.dateArgued || item.date_argued || '',
        status: item.status || '',
        docketNumber: item.docketNumber || item.docket_number || '',
        suitNature: item.suitNature || item.nature_of_suit || '',
        url: item.absolute_url
          ? `https://www.courtlistener.com${item.absolute_url}`
          : '',
        snippet: item.snippet || '',
        citation: item.citation || (item.citations || []).map((c: any) => c.toString()).join(', ') || '',
        judge: item.judge || '',
        caseType: type === 'dockets' ? 'Docket' : type === 'oral_arguments' ? 'Oral Argument' : 'Opinion',
      };
    });

    console.log(`Fetched ${cases.length} CourtListener results (page ${page})`);

    return new Response(
      JSON.stringify({
        success: true,
        cases,
        total: data.count || cases.length,
        page,
        totalPages: Math.ceil((data.count || 1) / per_page),
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error fetching CourtListener:', error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Failed to fetch court data' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
