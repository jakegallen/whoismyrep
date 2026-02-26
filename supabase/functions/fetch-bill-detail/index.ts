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

    const { billId, jurisdiction, session, identifier } = await req.json().catch(() => ({}));

    // Build the bill lookup URL
    // For OpenStates v3, use the search endpoint with filters to find a specific bill
    let bill: any = null;

    if (billId && billId.startsWith('ocd-bill')) {
      // Direct lookup by OCD ID
      const url = `https://v3.openstates.org/bills/${encodeURIComponent(billId)}?include=votes&include=documents&include=versions&include=actions&include=sponsorships`;
      console.log('Fetching bill by ID:', url);
      const resp = await fetch(url, { headers: { 'X-API-KEY': apiKey } });
      if (!resp.ok) {
        const errText = await resp.text();
        console.error(`OpenStates bill detail error: ${resp.status} ${errText}`);
        return new Response(
          JSON.stringify({ success: false, error: `OpenStates API error: ${resp.status}` }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      bill = await resp.json();
    } else {
      // Search by jurisdiction + session + identifier
      const searchParams = new URLSearchParams({
        jurisdiction: jurisdiction || 'Nevada',
        q: identifier || '',
        per_page: '5',
      });
      if (session) searchParams.set('session', session);
      searchParams.append('include', 'votes');
      searchParams.append('include', 'documents');
      searchParams.append('include', 'versions');
      searchParams.append('include', 'actions');
      searchParams.append('include', 'sponsorships');

      const url = `https://v3.openstates.org/bills?${searchParams}`;
      console.log('Searching for bill:', url);
      const resp = await fetch(url, { headers: { 'X-API-KEY': apiKey } });
      if (!resp.ok) {
        const errText = await resp.text();
        console.error(`OpenStates search error: ${resp.status} ${errText}`);
        return new Response(
          JSON.stringify({ success: false, error: `OpenStates API error: ${resp.status}` }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      const data = await resp.json();
      const results = data.results || [];
      // Find exact match by identifier
      bill = results.find((b: any) => b.identifier === identifier) || results[0];
      if (!bill) {
        return new Response(
          JSON.stringify({ success: false, error: 'Bill not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    console.log(`Processing bill: ${bill.identifier} (${bill.id})`);

    // Process vote roll calls
    const rollCalls = (bill.votes || []).map((v: any) => {
      const counts = v.counts || [];
      const yesCount = counts.find((c: any) => c.option === 'yes')?.value || 0;
      const noCount = counts.find((c: any) => c.option === 'no')?.value || 0;
      const otherCount = counts.find((c: any) => c.option === 'other')?.value || 0;
      const absentCount = counts.find((c: any) => c.option === 'absent')?.value || 0;

      const passed = v.result?.toLowerCase()?.includes('pass') || v.result?.toLowerCase()?.includes('adopt');

      // Individual votes grouped by option
      const individualVotes = (v.votes || []).map((iv: any) => ({
        legislator: iv.voter_name || 'Unknown',
        option: iv.option || 'other',
      }));

      const yesVoters = individualVotes.filter((iv: any) => iv.option === 'yes').map((iv: any) => iv.legislator);
      const noVoters = individualVotes.filter((iv: any) => iv.option === 'no').map((iv: any) => iv.legislator);
      const otherVoters = individualVotes.filter((iv: any) => iv.option !== 'yes' && iv.option !== 'no').map((iv: any) => `${iv.legislator} (${iv.option})`);

      return {
        id: v.id,
        date: v.start_date || '',
        motion: v.motion_text || v.motion_classification?.[0] || 'Vote',
        classification: v.motion_classification || [],
        result: passed ? 'Passed' : 'Failed',
        chamber: v.organization?.classification === 'upper' ? 'Senate' : 'Assembly',
        yesCount,
        noCount,
        otherCount: otherCount + absentCount,
        yesVoters,
        noVoters,
        otherVoters,
        totalVoters: individualVotes.length,
      };
    });

    // Process actions (includes amendments, readings, referrals, etc.)
    const actions = (bill.actions || []).map((a: any) => ({
      date: a.date || '',
      description: a.description || '',
      classification: a.classification || [],
      organization: a.organization?.name || '',
      chamber: a.organization?.classification === 'upper' ? 'Senate' : 'Assembly',
      order: a.order || 0,
    }));

    // Sort actions by date descending
    actions.sort((a: any, b: any) => b.date.localeCompare(a.date));

    // Identify amendments from actions
    const amendments = actions.filter((a: any) =>
      a.classification.some((c: string) => c.includes('amendment')) ||
      a.description.toLowerCase().includes('amend')
    );

    // Process bill versions (full text links)
    const versions = (bill.versions || []).map((v: any) => ({
      note: v.note || 'Bill Text',
      date: v.date || '',
      links: (v.links || []).map((l: any) => ({
        url: l.url,
        mediaType: l.media_type || 'text/html',
      })),
    }));

    // Process documents (fiscal notes, exhibits, etc.)
    const documents = (bill.documents || []).map((d: any) => ({
      note: d.note || 'Document',
      date: d.date || '',
      links: (d.links || []).map((l: any) => ({
        url: l.url,
        mediaType: l.media_type || 'text/html',
      })),
    }));

    // Sponsors
    const sponsors = (bill.sponsorships || []).map((s: any) => ({
      name: s.name || '',
      classification: s.classification || 'sponsor',
      primary: s.primary || false,
      entityType: s.entity_type || 'person',
    }));

    console.log(`Bill detail: ${rollCalls.length} roll calls, ${actions.length} actions, ${amendments.length} amendments, ${versions.length} versions, ${documents.length} documents`);

    return new Response(
      JSON.stringify({
        success: true,
        billId: bill.id,
        identifier: bill.identifier,
        title: bill.title,
        session: bill.session,
        rollCalls,
        actions,
        amendments,
        versions,
        documents,
        sponsors,
        subject: bill.subject || [],
        abstracts: (bill.abstracts || []).map((a: any) => a.abstract),
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error fetching bill detail:', error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Failed to fetch bill detail' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
