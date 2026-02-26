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

    const headers = { 'X-API-KEY': apiKey };
    const jurisdiction = 'ocd-jurisdiction/country:us/state:nv/government';

    // Fetch events from OpenStates
    const eventsUrl = new URL('https://v3.openstates.org/events');
    eventsUrl.searchParams.set('jurisdiction', jurisdiction);
    eventsUrl.searchParams.set('per_page', '50');

    // Also fetch recent bills with hearing/committee actions as fallback calendar items
    const sessionsUrl = `https://v3.openstates.org/jurisdictions/${jurisdiction}`;
    
    const [eventsResp, sessResp] = await Promise.all([
      fetch(eventsUrl.toString(), { headers }),
      fetch(sessionsUrl, { headers }),
    ]);

    let events: any[] = [];
    if (eventsResp.ok) {
      const eventsData = await eventsResp.json();
      events = (eventsData.results || []).map((evt: any) => ({
        id: evt.id,
        name: evt.name || 'Untitled Event',
        description: evt.description || '',
        startDate: evt.start_date || '',
        endDate: evt.end_date || '',
        location: evt.location?.name || '',
        type: classifyEventType(evt.name || '', evt.description || ''),
        chamber: inferChamber(evt.name || '', evt.description || ''),
        relatedBills: (evt.agenda || []).flatMap((a: any) =>
          (a.related_entities || [])
            .filter((e: any) => e.entity_type === 'bill')
            .map((e: any) => e.name || e.bill_id || '')
        ),
        source: 'openstates_event',
      }));
    } else {
      console.log('Events fetch status:', eventsResp.status, await eventsResp.text());
    }

    // Get current session and fetch bills with upcoming committee actions
    let currentSession = '';
    if (sessResp.ok) {
      const sessData = await sessResp.json();
      const sessions = sessData.legislative_sessions || [];
      const sorted = sessions.sort((a: any, b: any) =>
        (b.start_date || '').localeCompare(a.start_date || '')
      );
      currentSession = sorted[0]?.identifier || '';
    } else {
      await sessResp.text();
    }

    // Fetch bills with recent committee/hearing actions to supplement calendar
    let billEvents: any[] = [];
    if (currentSession) {
      const billsUrl = new URL('https://v3.openstates.org/bills');
      billsUrl.searchParams.set('jurisdiction', 'Nevada');
      billsUrl.searchParams.set('session', currentSession);
      billsUrl.searchParams.set('sort', 'updated_desc');
      billsUrl.searchParams.set('per_page', '30');
      billsUrl.searchParams.set('include', 'actions');

      try {
        const billsResp = await fetch(billsUrl.toString(), { headers });
        if (billsResp.ok) {
          const billsData = await billsResp.json();
          for (const bill of (billsData.results || [])) {
            const actions = bill.actions || [];
            const calendarActions = actions.filter((a: any) => {
              const desc = (a.description || '').toLowerCase();
              return desc.includes('hearing') ||
                desc.includes('committee') ||
                desc.includes('referred') ||
                desc.includes('scheduled') ||
                desc.includes('vote') ||
                desc.includes('reading');
            });

            for (const action of calendarActions.slice(-2)) {
              billEvents.push({
                id: `${bill.id}-${action.date}`,
                name: `${bill.identifier}: ${action.description}`,
                description: bill.title,
                startDate: action.date || '',
                endDate: '',
                location: '',
                type: classifyEventType(action.description || '', ''),
                chamber: bill.from_organization?.classification === 'upper' ? 'Senate' : 'Assembly',
                relatedBills: [bill.identifier],
                source: 'bill_action',
              });
            }
          }
        } else { await billsResp.text(); }
      } catch (e) {
        console.log('Bills fetch error:', e);
      }
    }

    // Merge and deduplicate
    const allEvents = [...events, ...billEvents];
    
    // Sort by date descending (most recent first)
    allEvents.sort((a, b) => (b.startDate || '').localeCompare(a.startDate || ''));

    console.log(`Found ${events.length} OpenStates events, ${billEvents.length} bill-action events, session=${currentSession}`);

    return new Response(
      JSON.stringify({
        success: true,
        events: allEvents,
        session: currentSession,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error fetching calendar:', error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Failed to fetch calendar' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function classifyEventType(name: string, description: string): string {
  const text = `${name} ${description}`.toLowerCase();
  if (text.includes('hearing')) return 'hearing';
  if (text.includes('committee')) return 'committee';
  if (text.includes('vote') || text.includes('reading')) return 'vote';
  if (text.includes('session') || text.includes('floor')) return 'session';
  if (text.includes('referred')) return 'committee';
  if (text.includes('scheduled')) return 'hearing';
  return 'other';
}

function inferChamber(name: string, description: string): string {
  const text = `${name} ${description}`.toLowerCase();
  if (text.includes('senate') || text.includes('upper')) return 'Senate';
  if (text.includes('assembly') || text.includes('lower') || text.includes('house')) return 'Assembly';
  return 'Joint';
}
