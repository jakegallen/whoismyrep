const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get('OPENSTATES_API_KEY');
    if (!apiKey) {
      return new Response(
        JSON.stringify({ success: false, error: 'OpenStates API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { session, search, page = 1, per_page = 50 } = await req.json().catch(() => ({}));

    // Build query params for OpenStates v3 REST API
    const params = new URLSearchParams({
      jurisdiction: 'Nevada',
      per_page: String(per_page),
      page: String(page),
      sort: 'updated_desc',
    });
    params.append('include', 'sponsorships');
    params.append('include', 'abstracts');

    if (session) params.set('session', session);
    if (search) params.set('q', search);

    const url = `https://v3.openstates.org/bills?${params}`;
    console.log('Fetching bills from OpenStates:', url);

    const resp = await fetch(url, {
      headers: { 'X-API-KEY': apiKey },
    });

    if (!resp.ok) {
      const errText = await resp.text();
      console.error(`OpenStates API error: ${resp.status} ${errText}`);
      return new Response(
        JSON.stringify({ success: false, error: `OpenStates API error: ${resp.status}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await resp.json();
    const results = data.results || [];

    const bills = results.map((bill: any) => {
      const chamber = bill.from_organization?.classification === 'upper' ? 'Senate' : 'Assembly';

      // Determine bill type
      let type = 'Bill';
      const id = (bill.identifier || '').toUpperCase();
      if (id.includes('JR')) type = 'Joint Resolution';
      else if (id.includes('CR')) type = 'Concurrent Resolution';
      else if (/^[AS]R\d/.test(id)) type = 'Resolution';

      // Get sponsors
      const sponsors = (bill.sponsorships || []).map((s: any) => s.name).filter(Boolean);

      // Get latest action as status
      const latestAction = bill.latest_action_description || bill.extras?.latest_action || 'Introduced';

      // Get abstract/summary if available
      const abstract = (bill.abstracts || [])[0]?.abstract || '';

      return {
        id: bill.id || id.toLowerCase(),
        billNumber: bill.identifier || '',
        title: bill.title || '',
        chamber,
        type,
        session: bill.session || session || '',
        status: latestAction,
        dateIntroduced: bill.first_action_date || bill.created_at || '',
        url: bill.openstates_url || `https://openstates.org/nv/bills/${bill.session}/${bill.identifier}/`,
        sponsors,
        abstract,
        subject: bill.subject || [],
        latestActionDate: bill.latest_action_date || '',
      };
    });

    console.log(`Fetched ${bills.length} bills from OpenStates (page ${page})`);

    return new Response(
      JSON.stringify({
        success: true,
        bills,
        total: data.pagination?.total_items || bills.length,
        page: data.pagination?.page || page,
        maxPage: data.pagination?.max_page || 1,
        session: session || '',
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error fetching bills:', error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Failed to fetch bills' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
