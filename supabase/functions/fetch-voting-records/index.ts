const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface VoteDetail {
  billId: string;
  billNumber: string;
  billTitle: string;
  date: string;
  motion: string;
  vote: 'Yes' | 'No' | 'Abstain' | 'Not Voting';
  result: 'Passed' | 'Failed' | 'Pending';
  yesCount: number;
  noCount: number;
  abstainCount: number;
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

    const { legislatorName, chamber, page = 1 } = await req.json().catch(() => ({}));

    if (!legislatorName) {
      return new Response(
        JSON.stringify({ success: false, error: 'legislatorName is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Fetching voting records for: ${legislatorName}, chamber: ${chamber}`);

    // Step 1: Find the legislator in OpenStates to get their ID
    const peoplePath = `https://v3.openstates.org/people?jurisdiction=Nevada&name=${encodeURIComponent(legislatorName)}&per_page=5`;
    const peopleResp = await fetch(peoplePath, {
      headers: { 'X-API-KEY': apiKey },
    });

    if (!peopleResp.ok) {
      const errText = await peopleResp.text();
      console.error(`People API error: ${peopleResp.status} ${errText}`);
      return new Response(
        JSON.stringify({ success: false, error: `OpenStates people error: ${peopleResp.status}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const peopleData = await peopleResp.json();
    const people = peopleData.results || [];

    if (people.length === 0) {
      console.log(`No legislator found for "${legislatorName}"`);
      return new Response(
        JSON.stringify({ success: true, votes: [], total: 0, legislatorFound: false }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const legislator = people[0];
    const legislatorId = legislator.id;
    console.log(`Found legislator: ${legislator.name} (${legislatorId})`);

    // Step 2: Fetch bills with votes where this legislator voted
    // OpenStates v3 bills endpoint with include=votes
    // First, discover available sessions
    const sessionsUrl = `https://v3.openstates.org/jurisdictions/ocd-jurisdiction/country:us/state:nv/government`;
    console.log('Fetching jurisdiction info for sessions...');
    
    let sessionIds: string[] = [];
    try {
      const sessResp = await fetch(sessionsUrl, { headers: { 'X-API-KEY': apiKey } });
      if (sessResp.ok) {
        const sessData = await sessResp.json();
        const sessions = sessData.legislative_sessions || [];
        // Sort by start_date descending to get most recent first
        sessionIds = sessions
          .sort((a: any, b: any) => (b.start_date || '').localeCompare(a.start_date || ''))
          .map((s: any) => s.identifier)
          .slice(0, 3);
        console.log('Available sessions:', sessionIds);
      } else {
        console.log('Could not fetch sessions, using defaults');
        sessionIds = ['2025', '83rd2025', '82nd2023'];
      }
    } catch (e) {
      console.log('Session fetch error:', e);
      sessionIds = ['2025', '83rd2025', '82nd2023'];
    }

    let bills: any[] = [];
    let usedSession = '';
    let totalItems = 0;

    for (const session of sessionIds) {
      const billsUrl = new URL('https://v3.openstates.org/bills');
      billsUrl.searchParams.set('jurisdiction', 'Nevada');
      billsUrl.searchParams.set('session', session);
      billsUrl.searchParams.set('include', 'votes');
      billsUrl.searchParams.set('per_page', '20');
      billsUrl.searchParams.set('page', String(page));
      billsUrl.searchParams.set('sort', 'updated_desc');

      if (chamber === 'Senate') {
        billsUrl.searchParams.set('chamber', 'upper');
      } else if (chamber === 'Assembly') {
        billsUrl.searchParams.set('chamber', 'lower');
      }

      console.log('Trying bills with votes:', billsUrl.toString());

      const billsResp = await fetch(billsUrl.toString(), {
        headers: { 'X-API-KEY': apiKey },
      });

      if (!billsResp.ok) {
        const errText = await billsResp.text();
        console.log(`Session ${session} failed: ${billsResp.status} ${errText}`);
        continue;
      }

      const billsData = await billsResp.json();
      const results = billsData.results || [];
      const billsWithVotes = results.filter((b: any) => (b.votes || []).length > 0);
      
      if (billsWithVotes.length > 0) {
        bills = results;
        usedSession = session;
        totalItems = billsData.pagination?.total_items || results.length;
        console.log(`Found ${billsWithVotes.length} bills with votes in session ${session}`);
        break;
      }
      console.log(`Session ${session}: ${results.length} bills, ${billsWithVotes.length} with votes`);
    }

    console.log(`Using session: ${usedSession || 'none'}, got ${bills.length} bills`);

    // Step 3: Process votes to find this legislator's votes
    const legislatorVotes: VoteDetail[] = [];
    let totalVoted = 0;
    let yesVotes = 0;
    let noVotes = 0;
    let abstainVotes = 0;
    let notVoting = 0;
    let partyLineVotes = 0;
    let totalPartyVotes = 0;

    const legislatorParty = legislator.party === 'Democratic' ? 'Democrat' : legislator.party;

    for (const bill of bills) {
      const votes = bill.votes || [];

      for (const voteEvent of votes) {
        // Look through the vote counts and individual votes
        const counts = voteEvent.counts || [];
        const yesCount = counts.find((c: any) => c.option === 'yes')?.value || 0;
        const noCount = counts.find((c: any) => c.option === 'no')?.value || 0;
        const otherCount = counts.find((c: any) => c.option === 'other')?.value || 0;

        // Check individual votes for this legislator
        const personVotes = voteEvent.votes || [];
        const legislatorVote = personVotes.find((v: any) => {
          // Match by voter name (OpenStates returns voter_name)
          const voterName = (v.voter_name || '').toLowerCase();
          const searchName = legislatorName.toLowerCase();
          // Try matching last name
          const lastName = searchName.split(' ').pop() || '';
          return voterName.includes(lastName) || voterName === searchName;
        });

        if (legislatorVote) {
          totalVoted++;
          const option = legislatorVote.option;
          let vote: VoteDetail['vote'];
          if (option === 'yes') {
            vote = 'Yes';
            yesVotes++;
          } else if (option === 'no') {
            vote = 'No';
            noVotes++;
          } else if (option === 'not voting' || option === 'absent' || option === 'excused') {
            vote = 'Not Voting';
            notVoting++;
          } else {
            vote = 'Abstain';
            abstainVotes++;
          }

          const passed = voteEvent.result?.toLowerCase()?.includes('pass') ||
                         voteEvent.result?.toLowerCase()?.includes('adopt');
          const result: VoteDetail['result'] = passed ? 'Passed' : 'Failed';

          // Determine party-line voting
          // If Democrats mostly voted yes, a Democrat voting yes is party-line
          const yesVoters = personVotes.filter((v: any) => v.option === 'yes');
          const noVoters = personVotes.filter((v: any) => v.option === 'no');
          // Simple heuristic: if majority voted the same as this legislator
          if (vote === 'Yes' || vote === 'No') {
            totalPartyVotes++;
            const majorityVoted = yesCount > noCount ? 'Yes' : 'No';
            if (vote === majorityVoted) {
              partyLineVotes++;
            }
          }

          legislatorVotes.push({
            billId: bill.id,
            billNumber: bill.identifier || bill.id,
            billTitle: bill.title || 'Untitled',
            date: voteEvent.start_date || voteEvent.created_at || '',
            motion: voteEvent.motion_text || voteEvent.motion_classification?.[0] || 'Vote',
            vote,
            result,
            yesCount,
            noCount,
            abstainCount: otherCount,
          });
        }
      }
    }

    // Sort by date descending
    legislatorVotes.sort((a, b) => b.date.localeCompare(a.date));

    const attendance = totalVoted > 0
      ? Math.round(((yesVotes + noVotes + abstainVotes) / totalVoted) * 100)
      : 0;

    const partyLineRate = totalPartyVotes > 0
      ? Math.round((partyLineVotes / totalPartyVotes) * 100)
      : 0;

    const summary = {
      totalVotes: totalVoted,
      yesVotes,
      noVotes,
      abstainVotes,
      notVoting,
      attendance: Math.min(100, attendance),
      partyLineRate,
      session: usedSession || '2025',
      legislatorName: legislator.name,
      party: legislatorParty,
      chamber: legislator.current_role?.org_classification === 'upper' ? 'Senate' : 'Assembly',
    };

    console.log(`Found ${legislatorVotes.length} votes for ${legislator.name}. Summary:`, JSON.stringify(summary));

    return new Response(
      JSON.stringify({
        success: true,
        votes: legislatorVotes,
        summary,
        total: totalItems || bills.length,
        legislatorFound: true,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error fetching voting records:', error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Failed to fetch voting records' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
