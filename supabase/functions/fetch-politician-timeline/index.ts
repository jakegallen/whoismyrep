const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface TimelineEvent {
  id: string;
  type: 'vote' | 'bill' | 'social' | 'donation';
  date: string;
  title: string;
  description: string;
  meta?: Record<string, string | number>;
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

    const { legislatorName, chamber, jurisdiction } = await req.json().catch(() => ({}));

    if (!legislatorName) {
      return new Response(
        JSON.stringify({ success: false, error: 'legislatorName is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Fetching timeline for: ${legislatorName}`);
    const headers = { 'X-API-KEY': apiKey };
    const events: TimelineEvent[] = [];

    // 1. Find legislator in OpenStates
    const peopleUrl = `https://v3.openstates.org/people?jurisdiction=${encodeURIComponent(jurisdiction)}&name=${encodeURIComponent(legislatorName)}&per_page=5`;
    const peopleResp = await fetch(peopleUrl, { headers });
    let legislatorId = '';

    if (peopleResp.ok) {
      const peopleData = await peopleResp.json();
      const person = (peopleData.results || [])[0];
      if (person) {
        legislatorId = person.id;
        console.log(`Found legislator: ${person.name} (${legislatorId})`);
      }
    } else {
      await peopleResp.text();
    }

    // 2. Fetch sponsored bills
    if (legislatorId) {
      const billsUrl = new URL('https://v3.openstates.org/bills');
      billsUrl.searchParams.set('jurisdiction', jurisdiction);
      billsUrl.searchParams.set('sponsor', legislatorId);
      billsUrl.searchParams.set('sort', 'updated_desc');
      billsUrl.searchParams.set('per_page', '10');
      billsUrl.searchParams.set('include', 'actions');

      try {
        const billsResp = await fetch(billsUrl.toString(), { headers });
        if (billsResp.ok) {
          const billsData = await billsResp.json();
          for (const bill of (billsData.results || [])) {
            // Bill sponsorship event
            const firstAction = (bill.actions || [])[0];
            events.push({
              id: `bill-${bill.id}`,
              type: 'bill',
              date: firstAction?.date || bill.created_at || bill.updated_at || '',
              title: `Sponsored ${bill.identifier}`,
              description: bill.title || 'Untitled bill',
              meta: {
                billId: bill.id,
                identifier: bill.identifier,
                status: bill.latest_action_description || '',
              },
            });

            // Committee/hearing actions
            for (const action of (bill.actions || [])) {
              if (
                action.description?.toLowerCase().includes('committee') ||
                action.description?.toLowerCase().includes('hearing') ||
                action.description?.toLowerCase().includes('passed') ||
                action.description?.toLowerCase().includes('signed')
              ) {
                events.push({
                  id: `action-${bill.id}-${action.date}-${action.order}`,
                  type: 'bill',
                  date: action.date || '',
                  title: `${bill.identifier}: ${action.description}`,
                  description: bill.title || '',
                  meta: { identifier: bill.identifier },
                });
              }
            }
          }
        } else {
          await billsResp.text();
        }
      } catch (e) {
        console.log('Bills fetch error:', e);
      }
    }

    // 3. Fetch voting records (reuse existing logic, simplified)
    if (legislatorId) {
      // Build OCD jurisdiction ID from the jurisdiction parameter
      const jMap: Record<string, string> = {
        'Alabama': 'al', 'Alaska': 'ak', 'Arizona': 'az', 'Arkansas': 'ar', 'California': 'ca',
        'Colorado': 'co', 'Connecticut': 'ct', 'Delaware': 'de', 'Florida': 'fl', 'Georgia': 'ga',
        'Hawaii': 'hi', 'Idaho': 'id', 'Illinois': 'il', 'Indiana': 'in', 'Iowa': 'ia',
        'Kansas': 'ks', 'Kentucky': 'ky', 'Louisiana': 'la', 'Maine': 'me', 'Maryland': 'md',
        'Massachusetts': 'ma', 'Michigan': 'mi', 'Minnesota': 'mn', 'Mississippi': 'ms', 'Missouri': 'mo',
        'Montana': 'mt', 'Nebraska': 'ne', 'Nevada': 'nv', 'New Hampshire': 'nh', 'New Jersey': 'nj',
        'New Mexico': 'nm', 'New York': 'ny', 'North Carolina': 'nc', 'North Dakota': 'nd', 'Ohio': 'oh',
        'Oklahoma': 'ok', 'Oregon': 'or', 'Pennsylvania': 'pa', 'Rhode Island': 'ri',
        'South Carolina': 'sc', 'South Dakota': 'sd', 'Tennessee': 'tn', 'Texas': 'tx', 'Utah': 'ut',
        'Vermont': 'vt', 'Virginia': 'va', 'Washington': 'wa', 'West Virginia': 'wv', 'Wisconsin': 'wi',
        'Wyoming': 'wy', 'District of Columbia': 'dc', 'Puerto Rico': 'pr',
      };
      const jName = jurisdiction;
      const stAbbr = jMap[jName] || jName.toLowerCase().slice(0, 2);
      const ocdJurisdiction = stAbbr === 'dc'
        ? 'ocd-jurisdiction/country:us/district:dc/government'
        : `ocd-jurisdiction/country:us/state:${stAbbr}/government`;

      // Get current session
      let session = '';
      try {
        const sessResp = await fetch(
          `https://v3.openstates.org/jurisdictions/${ocdJurisdiction}`,
          { headers }
        );
        if (sessResp.ok) {
          const sessData = await sessResp.json();
          const sessions = sessData.legislative_sessions || [];
          session = sessions
            .sort((a: any, b: any) => (b.start_date || '').localeCompare(a.start_date || ''))
            [0]?.identifier || '';
        } else { await sessResp.text(); }
      } catch (e) { console.log('Session error:', e); }

      if (session) {
        const votesUrl = new URL('https://v3.openstates.org/bills');
        votesUrl.searchParams.set('jurisdiction', jurisdiction);
        votesUrl.searchParams.set('session', session);
        votesUrl.searchParams.set('include', 'votes');
        votesUrl.searchParams.set('per_page', '15');
        votesUrl.searchParams.set('sort', 'updated_desc');
        if (chamber === 'Senate') votesUrl.searchParams.set('chamber', 'upper');
        else if (chamber === 'Assembly') votesUrl.searchParams.set('chamber', 'lower');

        try {
          const vResp = await fetch(votesUrl.toString(), { headers });
          if (vResp.ok) {
            const vData = await vResp.json();
            const nameTokens = legislatorName.trim().split(/\s+/);
            const lastName = (nameTokens[nameTokens.length - 1] || '').toLowerCase();
            const firstName = (nameTokens[0] || '').toLowerCase();
            const firstPrefix = firstName.slice(0, Math.min(3, firstName.length));
            const lastNameRegex = lastName.length > 2 ? new RegExp(`\\b${lastName}\\b`, 'i') : null;

            for (const bill of (vData.results || [])) {
              for (const voteEvent of (bill.votes || [])) {
                const personVotes = voteEvent.votes || [];
                const myVote = personVotes.find((v: any) => {
                  const vn = (v.voter_name || '').toLowerCase();
                  // Exact full-name match
                  if (vn === legislatorName.toLowerCase()) return true;
                  // Word-boundary last name + first-name prefix (≥2 chars)
                  if (lastNameRegex && lastNameRegex.test(vn) && firstPrefix.length >= 2 && vn.includes(firstPrefix)) return true;
                  return false;
                });
                if (myVote) {
                  const option = myVote.option === 'yes' ? 'Yes' : myVote.option === 'no' ? 'No' : 'Abstain';
                  events.push({
                    id: `vote-${bill.id}-${voteEvent.start_date}`,
                    type: 'vote',
                    date: voteEvent.start_date || '',
                    title: `Voted ${option} on ${bill.identifier}`,
                    description: bill.title || '',
                    meta: {
                      vote: option,
                      result: voteEvent.result || '',
                      identifier: bill.identifier,
                    },
                  });
                }
              }
            }
          } else { await vResp.text(); }
        } catch (e) {
          console.log('Votes fetch error:', e);
        }
      }
    }

    // Sort all events by date descending
    events.sort((a, b) => (b.date || '').localeCompare(a.date || ''));

    // Deduplicate by id
    const seen = new Set<string>();
    const unique = events.filter(e => {
      if (seen.has(e.id)) return false;
      seen.add(e.id);
      return true;
    });

    console.log(`Timeline: ${unique.length} events for ${legislatorName}`);

    return new Response(
      JSON.stringify({ success: true, events: unique }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Timeline error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Failed to fetch timeline' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
