const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const FEC_BASE = 'https://api.open.fec.gov/v1';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get('FEC_API_KEY');
    if (!apiKey) {
      return new Response(
        JSON.stringify({ success: false, error: 'FEC API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { candidateName, candidateId, state, office, cycle } = await req.json().catch(() => ({}));
    console.log(`FEC query: name=${candidateName}, id=${candidateId}, state=${state}, office=${office}, cycle=${cycle}`);

    const result: any = { success: true };

    // Step 1: Find candidate if no ID provided
    let fecCandidateId = candidateId;
    if (!fecCandidateId && candidateName) {
      const searchUrl = new URL(`${FEC_BASE}/candidates/search/`);
      searchUrl.searchParams.set('api_key', apiKey);
      // FEC stores names as "LAST, FIRST" — search by last name for better matching
      const nameParts = candidateName.trim().split(' ');
      const lastName = nameParts[nameParts.length - 1];
      searchUrl.searchParams.set('q', lastName);
      searchUrl.searchParams.set('state', state || 'NV');
      searchUrl.searchParams.set('per_page', '5');
      searchUrl.searchParams.set('sort', '-receipts');
      if (office) {
        const officeMap: Record<string, string> = { senate: 'S', house: 'H', president: 'P' };
        const o = officeMap[office.toLowerCase()] || '';
        if (o) searchUrl.searchParams.set('office', o);
      }

      console.log('FEC search URL:', searchUrl.toString().replace(apiKey, '***'));
      const resp = await fetch(searchUrl.toString());
      if (resp.ok) {
        const data = await resp.json();
        const candidates = data.results || [];
        console.log(`FEC search returned ${candidates.length} candidates`);
        if (candidates.length > 0) {
          // Try to match by first name if multiple results
          const firstName = nameParts[0].toLowerCase();
          const best = candidates.find((c: any) =>
            c.name.toLowerCase().includes(firstName)
          ) || candidates[0];
          fecCandidateId = best.candidate_id;
          result.candidate = {
            id: best.candidate_id,
            name: best.name,
            party: best.party_full || best.party,
            office: best.office_full || best.office,
            state: best.state,
            district: best.district,
            electionYears: best.election_years || [],
            incumbentChallenger: best.incumbent_challenge_full || '',
          };
          console.log(`Found FEC candidate: ${best.name} (${fecCandidateId})`);
        }
      } else {
        const errText = await resp.text();
        console.error(`FEC search error: ${resp.status} ${errText}`);
      }
    }

    if (!fecCandidateId) {
      return new Response(
        JSON.stringify({ success: true, candidate: null, totals: null, donors: [], disbursements: [] }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Step 2: Get financial totals
    const totalsUrl = new URL(`${FEC_BASE}/candidate/${fecCandidateId}/totals/`);
    totalsUrl.searchParams.set('api_key', apiKey);
    totalsUrl.searchParams.set('per_page', '4');
    totalsUrl.searchParams.set('sort', '-cycle');
    if (cycle) totalsUrl.searchParams.set('cycle', String(cycle));

    const totalsResp = await fetch(totalsUrl.toString());
    if (totalsResp.ok) {
      const tData = await totalsResp.json();
      const totals = (tData.results || []).map((t: any) => ({
        cycle: t.cycle,
        receipts: t.receipts || 0,
        disbursements: t.disbursements || 0,
        cashOnHand: t.cash_on_hand_end_period || 0,
        debts: t.debts_owed_by_committee || 0,
        individualContributions: t.individual_contributions || 0,
        pacContributions: t.other_political_committee_contributions || 0,
        partyContributions: t.political_party_committee_contributions || 0,
        candidateContributions: t.candidate_contribution || 0,
        smallDonorTotal: t.individual_itemized_contributions || 0,
        lastReportDate: t.coverage_end_date || '',
      }));
      result.totals = totals;
    } else {
      await totalsResp.text();
      result.totals = [];
    }

    // Step 3: Get top contributors (committee schedules)
    // First find the committee
    const cmteUrl = new URL(`${FEC_BASE}/candidate/${fecCandidateId}/committees/`);
    cmteUrl.searchParams.set('api_key', apiKey);
    cmteUrl.searchParams.set('per_page', '3');

    let committeeId = '';
    const cmteResp = await fetch(cmteUrl.toString());
    if (cmteResp.ok) {
      const cmteData = await cmteResp.json();
      const committees = cmteData.results || [];
      // Prefer principal campaign committee
      const principal = committees.find((c: any) => c.designation === 'P') || committees[0];
      if (principal) committeeId = principal.committee_id;
    } else {
      await cmteResp.text();
    }

    // Step 4: Get top donors via schedule A (itemized receipts)
    if (committeeId) {
      const donorsUrl = new URL(`${FEC_BASE}/schedules/schedule_a/by_size/by_candidate/`);
      donorsUrl.searchParams.set('api_key', apiKey);
      donorsUrl.searchParams.set('candidate_id', fecCandidateId);
      donorsUrl.searchParams.set('per_page', '20');
      if (cycle) donorsUrl.searchParams.set('cycle', String(cycle));

      const donorsResp = await fetch(donorsUrl.toString());
      if (donorsResp.ok) {
        const dData = await donorsResp.json();
        result.donorsBySize = (dData.results || []).map((d: any) => ({
          size: d.size,
          total: d.total || 0,
          count: d.count || 0,
          cycle: d.cycle,
        }));
      } else {
        await donorsResp.text();
        result.donorsBySize = [];
      }

      // Get top employer/occupation aggregates
      const empUrl = new URL(`${FEC_BASE}/schedules/schedule_a/by_employer/`);
      empUrl.searchParams.set('api_key', apiKey);
      empUrl.searchParams.set('committee_id', committeeId);
      empUrl.searchParams.set('per_page', '10');
      empUrl.searchParams.set('sort', '-total');
      if (cycle) empUrl.searchParams.set('cycle', String(cycle));

      const empResp = await fetch(empUrl.toString());
      if (empResp.ok) {
        const eData = await empResp.json();
        result.topEmployers = (eData.results || []).map((e: any) => ({
          employer: e.employer || 'Not Reported',
          total: e.total || 0,
          count: e.count || 0,
        }));
      } else {
        await empResp.text();
        result.topEmployers = [];
      }

      // Step 5: Get disbursements by purpose
      const disbUrl = new URL(`${FEC_BASE}/schedules/schedule_b/by_purpose/`);
      disbUrl.searchParams.set('api_key', apiKey);
      disbUrl.searchParams.set('committee_id', committeeId);
      disbUrl.searchParams.set('per_page', '10');
      disbUrl.searchParams.set('sort', '-total');
      if (cycle) disbUrl.searchParams.set('cycle', String(cycle));

      const disbResp = await fetch(disbUrl.toString());
      if (disbResp.ok) {
        const disbData = await disbResp.json();
        result.disbursementsByPurpose = (disbData.results || []).map((d: any) => ({
          purpose: d.purpose || 'Other',
          total: d.total || 0,
          count: d.count || 0,
        }));
      } else {
        await disbResp.text();
        result.disbursementsByPurpose = [];
      }
    }

    console.log(`FEC data retrieved for ${fecCandidateId}`);

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('FEC error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Failed to fetch FEC data' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
