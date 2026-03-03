const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

/** Map OpenStates jurisdiction name → 2-letter state abbreviation for OCD slug */
function jurisdictionToAbbr(jurisdiction: string): string {
  const map: Record<string, string> = {
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
  return map[jurisdiction] || jurisdiction.toLowerCase().slice(0, 2);
}

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
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { legislatorName, chamber, page = 1, jurisdiction, bioguideId, level } = await req.json().catch(() => ({}));

    if (!legislatorName) {
      return new Response(
        JSON.stringify({ success: false, error: 'legislatorName is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Fetching voting records for: ${legislatorName}, chamber: ${chamber}, level: ${level}, bioguideId: ${bioguideId}`);

    // Federal politicians: use GovTrack API (free, no key required)
    if (level === 'federal') {
      try {
        // 1. Find the person on GovTrack — prefer direct bioguideId lookup (avoids "Last, First" format issues)
        let persons: any[] = [];
        if (bioguideId) {
          const bioResp = await fetch(
            `https://www.govtrack.us/api/v2/person?bioguideid=${encodeURIComponent(bioguideId)}&limit=1`
          );
          if (bioResp.ok) {
            const bioData = await bioResp.json();
            persons = bioData.objects || [];
          }
        }

        // Fall back to name search if bioguideId lookup returned nothing
        if (persons.length === 0) {
          // Convert "Last, First Middle" → "First Last" for GovTrack's name search
          // Strip suffixes (Jr., Sr., III, etc.) that break comma splitting
          let searchName = legislatorName;
          if (legislatorName.includes(',')) {
            const suffixes = /\b(jr\.?|sr\.?|ii|iii|iv|v|vi|vii|viii)\b/gi;
            const cleaned = legislatorName.replace(suffixes, '').replace(/,\s*,/g, ',').replace(/,\s*$/, '');
            const [last, firstPart] = cleaned.split(',');
            const first = (firstPart || '').trim().split(' ')[0];
            searchName = `${first} ${last.trim()}`;
          }
          const searchResp = await fetch(
            `https://www.govtrack.us/api/v2/person?q=${encodeURIComponent(searchName)}&limit=10`
          );
          if (!searchResp.ok) throw new Error(`GovTrack person search failed: ${searchResp.status}`);
          const searchData = await searchResp.json();
          persons = searchData.objects || [];
        }

        // Prefer match by bioguideId if available, else first result
        let person = bioguideId
          ? persons.find((p: any) => p.bioguideid === bioguideId)
          : null;
        if (!person) person = persons.find((p: any) => p.osid) || persons[0];

        if (!person) {
          console.log(`GovTrack: no match found for "${legislatorName}"`);
          return new Response(
            JSON.stringify({ success: true, votes: [], total: 0, legislatorFound: false }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Extract GovTrack numeric ID from link URL (e.g. /congress/members/ted_cruz/412573)
        const govtrackId = person.link?.split('/').pop();
        if (!govtrackId) throw new Error('Could not extract GovTrack person ID from link');
        console.log(`GovTrack: found ${person.name} (id=${govtrackId})`);

        // Extract social media handles from GovTrack person object
        const socialHandles: Record<string, string> = {};
        if (person.twitterid) socialHandles.x = person.twitterid;
        if (person.youtubeid) socialHandles.youtube = person.youtubeid;

        // Current congress: 119th (2025-2026); formula: floor((year-1789)/2)+1
        const currentYear = new Date().getFullYear();
        const currentCongress = Math.floor((currentYear - 1789) / 2) + 1;

        // 2. Fetch two pages of 250 vote_voter records in parallel (covers ~500 most recent votes)
        const fetchVoterPage = async (offset: number): Promise<any[]> => {
          const r = await fetch(
            `https://www.govtrack.us/api/v2/vote_voter?person=${govtrackId}&limit=250&offset=${offset}&order_by=-created`
          );
          if (!r.ok) return [];
          const d = await r.json();
          return d.objects || [];
        };
        const [page0, page1] = await Promise.all([fetchVoterPage(0), fetchVoterPage(250)]);
        const allRecords: any[] = [...page0, ...page1];

        // Filter to current congress only
        const congressRecords = allRecords.filter((vv: any) => vv.vote?.congress === currentCongress);
        console.log(`GovTrack: ${allRecords.length} total records, ${congressRecords.length} in ${currentCongress}th Congress`);

        // 3. Tally votes
        let yesVotes = 0, noVotes = 0, abstainVotes = 0, notVotingCount = 0;
        let partyLineVotes = 0, totalPartyVotes = 0;

        const votes: VoteDetail[] = congressRecords.map((vv: any) => {
          const optKey = vv.option?.key || '';
          const v = vv.vote || {};

          let vote: VoteDetail['vote'];
          if (optKey === '+') { vote = 'Yes'; yesVotes++; }
          else if (optKey === '-') { vote = 'No'; noVotes++; }
          else if (optKey === '0' || optKey === 'P') { vote = 'Abstain'; abstainVotes++; }
          else { vote = 'Not Voting'; notVotingCount++; }

          const yesCount = v.total_plus || 0;
          const noCount = v.total_minus || 0;

          // Majority-alignment heuristic: did this member vote with the chamber majority?
          if (vote === 'Yes' || vote === 'No') {
            totalPartyVotes++;
            const majorityVoted = yesCount > noCount ? 'Yes' : (noCount > yesCount ? 'No' : null);
            if (majorityVoted && vote === majorityVoted) {
              partyLineVotes++;
            }
          }

          // Extract bill number from question text (e.g. "H.R. 123" or "S. 45")
          const billMatch = (v.question || '').match(/\b(S\.|H\.R\.|H\.J\.Res\.|S\.J\.Res\.|H\.Con\.Res\.|S\.Con\.Res\.)\s*\d+/i);
          const billNumber = billMatch ? billMatch[0] : `Vote ${v.number || ''}`;

          return {
            billId: String(v.related_bill || v.number || ''),
            billNumber,
            billTitle: v.question || '',
            date: (v.created || '').slice(0, 10),
            motion: v.vote_type || v.question || '',
            vote,
            result: v.passed ? 'Passed' : 'Failed',
            yesCount,
            noCount,
            abstainCount: v.total_other || 0,
          };
        });

        const totalVoted = yesVotes + noVotes + abstainVotes + notVotingCount;
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
          notVoting: notVotingCount,
          attendance,
          partyLineRate,
          session: `${currentCongress}th Congress`,
          legislatorName: person.name || legislatorName,
          party: '',
          chamber: chamber || '',
        };

        console.log(`GovTrack federal summary for ${legislatorName}:`, JSON.stringify(summary));

        return new Response(
          JSON.stringify({ success: true, votes, summary, total: totalVoted, legislatorFound: true, socialHandles }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      } catch (e) {
        console.error('GovTrack federal voting error:', e);
        return new Response(
          JSON.stringify({ success: false, error: String(e) }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Step 1: Find the legislator in OpenStates to get their ID
    // Normalise "Last, First" → "First Last" so OpenStates name search works
    // Strip suffixes (Jr., Sr., III, etc.) that break comma splitting
    let searchName = legislatorName;
    if (legislatorName.includes(',')) {
      const suffixes = /\b(jr\.?|sr\.?|ii|iii|iv|v|vi|vii|viii)\b/gi;
      const cleaned = legislatorName.replace(suffixes, '').replace(/,\s*,/g, ',').replace(/,\s*$/, '');
      const [last, firstPart] = cleaned.split(',');
      const first = (firstPart || '').trim().split(' ')[0];
      searchName = `${first} ${last.trim()}`;
    }
    // Convert plain state name ("Colorado") → OCD jurisdiction ID
    const stateAbbr = jurisdictionToAbbr(jurisdiction);
    // DC uses "district:dc" not "state:dc" in OCD format
    const ocdJurisdictionId = stateAbbr === 'dc'
      ? `ocd-jurisdiction/country:us/district:dc/government`
      : `ocd-jurisdiction/country:us/state:${stateAbbr}/government`;
    const peoplePath = `https://v3.openstates.org/people?jurisdiction=${encodeURIComponent(ocdJurisdictionId)}&name=${encodeURIComponent(searchName)}&per_page=5`;
    const peopleResp = await fetch(peoplePath, {
      headers: { 'X-API-KEY': apiKey },
    });

    if (!peopleResp.ok) {
      const errText = await peopleResp.text();
      console.error(`People API error: ${peopleResp.status} ${errText}`);
      const error = peopleResp.status === 429
        ? 'API rate limit reached. Please try again later.'
        : `OpenStates people error: ${peopleResp.status}`;
      return new Response(
        JSON.stringify({ success: false, error }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
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
    // First, discover available sessions — ocdJurisdictionId already computed above
    const sessionsUrl = `https://v3.openstates.org/jurisdictions/${ocdJurisdictionId}`;
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
        console.log('Could not fetch sessions, using dynamic year defaults');
        const y = new Date().getFullYear();
        sessionIds = [String(y), String(y - 1), String(y - 2)];
      }
    } catch (e) {
      console.log('Session fetch error:', e);
      const y = new Date().getFullYear();
      sessionIds = [String(y), String(y - 1), String(y - 2)];
    }

    let bills: any[] = [];
    let usedSession = '';
    let totalItems = 0;

    for (const session of sessionIds) {
      // Fetch up to 3 pages of 50 bills to maximise vote coverage
      let sessionBills: any[] = [];
      for (let p = 1; p <= 3; p++) {
        const billsUrl = new URL('https://v3.openstates.org/bills');
        billsUrl.searchParams.set('jurisdiction', ocdJurisdictionId);
        billsUrl.searchParams.set('session', session);
        billsUrl.searchParams.set('include', 'votes');
        billsUrl.searchParams.set('per_page', '50');
        billsUrl.searchParams.set('page', String(p));
        billsUrl.searchParams.set('sort', 'updated_desc');

        if (chamber === 'Senate') {
          billsUrl.searchParams.set('chamber', 'upper');
        } else if (chamber === 'Assembly') {
          billsUrl.searchParams.set('chamber', 'lower');
        }

        console.log(`Fetching bills page ${p} for session ${session}`);

        const billsResp = await fetch(billsUrl.toString(), {
          headers: { 'X-API-KEY': apiKey },
        });

        if (!billsResp.ok) {
          console.log(`Session ${session} page ${p} failed: ${billsResp.status}`);
          break;
        }

        const billsData = await billsResp.json();
        const results = billsData.results || [];
        sessionBills.push(...results);
        if (p === 1) totalItems = billsData.pagination?.total_items || results.length;

        // Stop if we've exhausted results
        if (results.length < 50) break;
      }

      const billsWithVotes = sessionBills.filter((b: any) => (b.votes || []).length > 0);
      
      if (billsWithVotes.length > 0) {
        bills = sessionBills;
        usedSession = session;
        console.log(`Found ${billsWithVotes.length} bills with votes in session ${session} (${sessionBills.length} total bills)`);
        break;
      }
      console.log(`Session ${session}: ${sessionBills.length} bills, ${billsWithVotes.length} with votes`);
    }

    // If no votes found in general bill search, try bills sponsored by this legislator
    if (bills.length === 0 || bills.every((b: any) => (b.votes || []).length === 0)) {
      console.log('No votes in general bills — trying legislator-sponsored bills');
      for (const session of sessionIds) {
        const sponsorUrl = new URL('https://v3.openstates.org/bills');
        sponsorUrl.searchParams.set('jurisdiction', ocdJurisdictionId);
        sponsorUrl.searchParams.set('session', session);
        sponsorUrl.searchParams.set('sponsor', legislatorId);
        sponsorUrl.searchParams.set('include', 'votes');
        sponsorUrl.searchParams.set('per_page', '50');
        sponsorUrl.searchParams.set('sort', 'updated_desc');

        try {
          const sResp = await fetch(sponsorUrl.toString(), { headers: { 'X-API-KEY': apiKey } });
          if (sResp.ok) {
            const sData = await sResp.json();
            const sBills = sData.results || [];
            const withVotes = sBills.filter((b: any) => (b.votes || []).length > 0);
            if (withVotes.length > 0) {
              bills = sBills;
              usedSession = session;
              totalItems = sData.pagination?.total_items || sBills.length;
              console.log(`Sponsor search: found ${withVotes.length} bills with votes in session ${session}`);
              break;
            }
          }
        } catch (e) {
          console.log(`Sponsor search error for session ${session}:`, e);
        }
      }
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
          // 1. Match by OpenStates voter ID (most reliable)
          if (v.voter_id && legislatorId && v.voter_id === legislatorId) return true;
          // Also match partial ID (OpenStates sometimes uses short IDs in votes)
          if (v.voter_id && legislatorId) {
            const shortId = legislatorId.split('/').pop() || '';
            if (shortId && v.voter_id.includes(shortId)) return true;
          }
          // 2. Match by full name
          const voterName = (v.voter_name || '').toLowerCase().trim();
          const fullName = legislatorName.toLowerCase().trim();
          if (voterName === fullName) return true;
          // Also match "First Last" against "Last, First" format
          const legislatorDisplayName = (legislator.name || '').toLowerCase().trim();
          if (voterName === legislatorDisplayName) return true;
          // 3. Match by last name as a whole word + first-name prefix (≥3 chars)
          const nameParts = fullName.split(/\s+/);
          const lastName = nameParts[nameParts.length - 1] || '';
          const firstName = nameParts[0] || '';
          // Use word-boundary regex so "Johnson" won't match "Johnston"
          if (lastName.length > 2) {
            const lastNameRegex = new RegExp(`\\b${lastName}\\b`, 'i');
            if (lastNameRegex.test(voterName)) {
              // Require first 3+ chars of first name to also appear (not just initial)
              const prefix = firstName.slice(0, Math.min(3, firstName.length)).toLowerCase();
              if (prefix.length >= 2 && voterName.includes(prefix)) return true;
            }
          }
          return false;
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
          // Majority-alignment heuristic: did this member vote with the chamber majority?
          if (vote === 'Yes' || vote === 'No') {
            totalPartyVotes++;
            const majorityVoted = yesCount > noCount ? 'Yes' : (noCount > yesCount ? 'No' : null);
            if (majorityVoted && vote === majorityVoted) {
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
      session: usedSession || String(new Date().getFullYear()),
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
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
