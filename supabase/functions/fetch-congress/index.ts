const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const BASE_URL = 'https://api.congress.gov/v3';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get('CONGRESS_GOV_API_KEY');
    if (!apiKey) {
      return new Response(
        JSON.stringify({ success: false, error: 'Congress.gov API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { endpoint = 'bills', search, congress, chamber, state, limit = 20, offset = 0, billType, billNumber } = await req.json().catch(() => ({}));

    let url: string;
    const params = new URLSearchParams({ api_key: apiKey, format: 'json' });

    if (endpoint === 'bill_detail' && congress && billType && billNumber) {
      // Single bill detail
      url = `${BASE_URL}/bill/${congress}/${billType}/${billNumber}?${params}`;
    } else if (endpoint === 'bills') {
      params.set('limit', String(limit));
      params.set('offset', String(offset));
      params.set('sort', 'updateDate+desc');
      // Filter by congress session
      if (congress) {
        url = `${BASE_URL}/bill/${congress}?${params}`;
      } else {
        url = `${BASE_URL}/bill?${params}`;
      }
    } else if (endpoint === 'members') {
      params.set('limit', String(limit));
      params.set('offset', String(offset));
      params.set('currentMember', 'true');
      const stateAbbr = state || 'NV';
      url = `${BASE_URL}/member/${stateAbbr}?${params}`;
    } else if (endpoint === 'member_bills' && search) {
      // Bills sponsored by a specific member (search = bioguideId)
      params.set('limit', String(limit));
      params.set('offset', String(offset));
      url = `${BASE_URL}/member/${search}/sponsored-legislation?${params}`;
    } else if (endpoint === 'committee_reports') {
      params.set('limit', String(limit));
      params.set('offset', String(offset));
      if (congress) {
        url = `${BASE_URL}/committee-report/${congress}?${params}`;
      } else {
        url = `${BASE_URL}/committee-report?${params}`;
      }
    } else if (endpoint === 'nominations') {
      params.set('limit', String(limit));
      params.set('offset', String(offset));
      if (congress) {
        url = `${BASE_URL}/nomination/${congress}?${params}`;
      } else {
        url = `${BASE_URL}/nomination?${params}`;
      }
    } else {
      // Default: bills
      params.set('limit', String(limit));
      params.set('offset', String(offset));
      url = `${BASE_URL}/bill?${params}`;
    }

    console.log('Fetching Congress.gov:', url.replace(apiKey, '***'));

    const resp = await fetch(url, {
      headers: { 'Accept': 'application/json' },
    });

    if (!resp.ok) {
      const errText = await resp.text();
      console.error(`Congress.gov API error: ${resp.status} ${errText}`);
      return new Response(
        JSON.stringify({ success: false, error: `Congress.gov API error: ${resp.status}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await resp.json();

    // Normalize response based on endpoint
    let result: any = { success: true };

    if (endpoint === 'bill_detail') {
      const bill = data.bill || {};
      result.bill = {
        congress: bill.congress,
        number: bill.number,
        type: bill.type,
        title: bill.title,
        shortTitle: bill.shortTitle || '',
        introducedDate: bill.introducedDate || '',
        updateDate: bill.updateDate || '',
        originChamber: bill.originChamber || '',
        latestAction: bill.latestAction || {},
        sponsors: (bill.sponsors || []).map((s: any) => ({
          name: `${s.firstName || ''} ${s.lastName || ''}`.trim(),
          party: s.party || '',
          state: s.state || '',
          bioguideId: s.bioguideId || '',
        })),
        cosponsors: bill.cosponsors?.count || 0,
        subjects: bill.subjects || {},
        policyArea: bill.policyArea?.name || '',
        summaries: bill.summaries || [],
        textUrl: bill.textVersions?.url || '',
        url: bill.url || '',
      };
    } else if (endpoint === 'bills') {
      const bills = data.bills || [];
      result.items = bills.map((b: any) => ({
        congress: b.congress,
        number: b.number,
        type: b.type,
        title: b.title || b.shortTitle || '',
        introducedDate: b.introducedDate || '',
        updateDate: b.updateDate || '',
        originChamber: b.originChamber || '',
        latestAction: b.latestAction || {},
        url: b.url || '',
      }));
      result.pagination = data.pagination || {};
    } else if (endpoint === 'members') {
      const members = data.members || [];
      result.items = members.map((m: any) => ({
        bioguideId: m.bioguideId || '',
        name: m.name || '',
        party: m.partyName || '',
        state: m.state || 'Nevada',
        district: m.district || null,
        chamber: m.terms?.item?.[0]?.chamber || '',
        url: m.url || '',
        depiction: m.depiction || {},
      }));
      result.pagination = data.pagination || {};
    } else if (endpoint === 'member_bills') {
      const bills = data.sponsoredLegislation || [];
      result.items = bills.map((b: any) => ({
        congress: b.congress,
        number: b.number,
        type: b.type,
        title: b.title || '',
        introducedDate: b.introducedDate || '',
        updateDate: b.updateDate || '',
        latestAction: b.latestAction || {},
        url: b.url || '',
      }));
      result.pagination = data.pagination || {};
    } else if (endpoint === 'committee_reports') {
      const reports = data.reports || [];
      result.items = reports.map((r: any) => ({
        citation: r.citation || '',
        number: r.number || '',
        type: r.type || '',
        title: r.title || '',
        congress: r.congress || '',
        chamber: r.chamber || '',
        updateDate: r.updateDate || '',
        url: r.url || '',
      }));
      result.pagination = data.pagination || {};
    } else if (endpoint === 'nominations') {
      const nominations = data.nominations || [];
      result.items = nominations.map((n: any) => ({
        number: n.number || '',
        congress: n.congress || '',
        description: n.description || '',
        receivedDate: n.receivedDate || '',
        latestAction: n.latestAction || {},
        url: n.url || '',
      }));
      result.pagination = data.pagination || {};
    }

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error fetching Congress.gov:', error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Failed to fetch data' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
