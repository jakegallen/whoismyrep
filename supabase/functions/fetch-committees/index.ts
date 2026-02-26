const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface CommitteeMember {
  name: string;
  role: string;
}

function parseCommittees(results: any[], chamberLabel: string) {
  return results.map((org: any) => {
    const members: CommitteeMember[] = (org.memberships || []).map((m: any) => ({
      name: m.person_name || m.name || '',
      role: m.role || 'member',
    }));
    return {
      id: org.id,
      name: org.name,
      chamber: chamberLabel,
      memberCount: members.length,
      members,
    };
  });
}

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

    const { chamber, legislatorName, jurisdiction = 'Nevada', stateAbbr = 'nv' } = await req.json().catch(() => ({}));
    console.log(`Fetching committees. chamber=${chamber}, legislator=${legislatorName}, jurisdiction=${jurisdiction}`);

    const headers = { 'X-API-KEY': apiKey };
    const ocdJurisdiction = stateAbbr === 'dc'
      ? 'ocd-jurisdiction/country:us/district:dc/government'
      : `ocd-jurisdiction/country:us/state:${stateAbbr.toLowerCase()}/government`;

    // Fetch committees by chamber to correctly label them
    const buildUrl = (ch?: string) => {
      const url = new URL('https://v3.openstates.org/committees');
      url.searchParams.set('jurisdiction', ocdJurisdiction);
      url.searchParams.set('per_page', '20');
      url.searchParams.set('include', 'memberships');
      if (ch) url.searchParams.set('chamber', ch);
      return url.toString();
    };

    let committees: any[] = [];

    if (chamber === 'Senate') {
      const resp = await fetch(buildUrl('upper'), { headers });
      if (resp.ok) {
        const d = await resp.json();
        committees = parseCommittees(d.results || [], 'Senate');
      } else { await resp.text(); }
    } else if (chamber === 'Assembly') {
      const resp = await fetch(buildUrl('lower'), { headers });
      if (resp.ok) {
        const d = await resp.json();
        committees = parseCommittees(d.results || [], 'Assembly');
      } else { await resp.text(); }
    } else {
      // Fetch both chambers in parallel
      const [upperResp, lowerResp] = await Promise.all([
        fetch(buildUrl('upper'), { headers }),
        fetch(buildUrl('lower'), { headers }),
      ]);

      if (upperResp.ok) {
        const d = await upperResp.json();
        committees.push(...parseCommittees(d.results || [], 'Senate'));
      } else { await upperResp.text(); }

      if (lowerResp.ok) {
        const d = await lowerResp.json();
        committees.push(...parseCommittees(d.results || [], 'Assembly'));
      } else { await lowerResp.text(); }

      // Also try without chamber param (for joint committees)
      if (!chamber || chamber === 'Joint') {
        const jointResp = await fetch(buildUrl(), { headers });
        if (jointResp.ok) {
          const d = await jointResp.json();
          const allIds = new Set(committees.map((c: any) => c.id));
          const jointOnes = parseCommittees(
            (d.results || []).filter((o: any) => !allIds.has(o.id)),
            'Joint'
          );
          committees.push(...jointOnes);
        } else { await jointResp.text(); }
      }

      // Filter to Joint only if that was requested
      if (chamber === 'Joint') {
        committees = committees.filter((c: any) => c.chamber === 'Joint');
      }
    }

    // Sort alphabetically
    committees.sort((a: any, b: any) => a.name.localeCompare(b.name));

    // Fetch session info for bills
    const sessionsUrl = `https://v3.openstates.org/jurisdictions/${ocdJurisdiction}`;
    let currentSession = '';
    try {
      const sessResp = await fetch(sessionsUrl, { headers });
      if (sessResp.ok) {
        const sessData = await sessResp.json();
        const sessions = sessData.legislative_sessions || [];
        const sorted = sessions.sort((a: any, b: any) =>
          (b.start_date || '').localeCompare(a.start_date || '')
        );
        currentSession = sorted[0]?.identifier || '';
      } else { await sessResp.text(); }
    } catch (e) {
      console.log('Session fetch error:', e);
    }

    // Fetch recent bills with committee actions
    let recentBills: any[] = [];
    if (currentSession) {
      const billsUrl = new URL('https://v3.openstates.org/bills');
      billsUrl.searchParams.set('jurisdiction', jurisdiction);
      billsUrl.searchParams.set('session', currentSession);
      billsUrl.searchParams.set('sort', 'updated_desc');
      billsUrl.searchParams.set('per_page', '20');
      billsUrl.searchParams.set('include', 'actions');
      if (chamber === 'Senate') billsUrl.searchParams.set('chamber', 'upper');
      else if (chamber === 'Assembly') billsUrl.searchParams.set('chamber', 'lower');

      try {
        const billsResp = await fetch(billsUrl.toString(), { headers });
        if (billsResp.ok) {
          const billsData = await billsResp.json();
          recentBills = (billsData.results || []).map((bill: any) => {
            const actions = bill.actions || [];
            const committeeActions = actions.filter((a: any) =>
              a.description?.toLowerCase().includes('committee') ||
              a.description?.toLowerCase().includes('hearing') ||
              a.description?.toLowerCase().includes('referred')
            );
            const latestAction = committeeActions[committeeActions.length - 1] || actions[actions.length - 1];
            return {
              id: bill.id,
              identifier: bill.identifier,
              title: bill.title,
              chamber: bill.from_organization?.classification === 'upper' ? 'Senate' : 'Assembly',
              lastAction: latestAction?.description || '',
              lastActionDate: latestAction?.date || bill.updated_at || '',
              committeeRef: committeeActions.length > 0
                ? committeeActions[committeeActions.length - 1]?.description || ''
                : '',
            };
          });
        } else { await billsResp.text(); }
      } catch (e) {
        console.log('Bills fetch error:', e);
      }
    }

    // Find legislator's committees
    let legislatorCommittees: string[] = [];
    if (legislatorName && committees.length > 0) {
      const lastName = legislatorName.split(' ').pop()?.toLowerCase() || '';
      legislatorCommittees = committees
        .filter((c: any) =>
          c.members.some((m: any) => m.name.toLowerCase().includes(lastName))
        )
        .map((c: any) => c.name);
    }

    console.log(`Found ${committees.length} committees, ${recentBills.length} bills, session=${currentSession}`);

    return new Response(
      JSON.stringify({
        success: true,
        committees,
        legislatorCommittees,
        recentBills,
        session: currentSession,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error fetching committees:', error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Failed to fetch committees' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
