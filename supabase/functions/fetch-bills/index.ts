import { getCorsHeaders, handleCors, withCache } from "../_shared/cors.ts";

/** Map state name → 2-letter abbreviation for building OCD jurisdiction IDs */
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

Deno.serve(async (req) => {
  const preflight = handleCors(req);
  if (preflight) return preflight;

  try {
    const { session, search, page = 1, per_page = 20, jurisdiction, level, bioguideId } = await req.json().catch(() => ({}));

    // Federal politicians: use Congress.gov API via bioguideId
    if (level === 'federal' && bioguideId) {
      const congressApiKey = Deno.env.get('CONGRESS_API_KEY');
      if (!congressApiKey) {
        return new Response(
          JSON.stringify({ success: false, error: 'Congress API key not configured' }),
          { headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } }
        );
      }

      const url = new URL(`https://api.congress.gov/v3/member/${encodeURIComponent(bioguideId)}/sponsored-legislation`);
      url.searchParams.set('format', 'json');
      url.searchParams.set('limit', String(per_page));
      url.searchParams.set('offset', String((page - 1) * per_page));
      url.searchParams.set('api_key', congressApiKey);

      console.log(`Fetching federal bills for bioguideId=${bioguideId} from Congress.gov`);
      const resp = await fetch(url.toString());
      if (!resp.ok) {
        const errText = await resp.text();
        console.error(`Congress.gov API error: ${resp.status} ${errText}`);
        const error = resp.status === 429
          ? 'API rate limit reached. Please try again later.'
          : `Congress.gov API error: ${resp.status}`;
        return new Response(
          JSON.stringify({ success: false, error }),
          { headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } }
        );
      }

      const data = await resp.json();
      const items: any[] = data.sponsoredLegislation || [];
      const total: number = data.pagination?.count || items.length;

      const bills = items.map((item: any, idx: number) => {
        const typeCode: string = (item.type || '').toUpperCase();
        const chamber = typeCode.startsWith('H') ? 'House' : 'Senate';
        const congress: number = item.congress || 119;
        const billNum: string = item.number || '';

        // Build congress.gov URL
        const typeSlug: Record<string, string> = {
          'HR': 'house-bill', 'HJRES': 'house-joint-resolution',
          'HCONRES': 'house-concurrent-resolution', 'HRES': 'house-simple-resolution',
          'S': 'senate-bill', 'SJRES': 'senate-joint-resolution',
          'SCONRES': 'senate-concurrent-resolution', 'SRES': 'senate-simple-resolution',
        };
        const slug = typeSlug[typeCode] || 'bill';
        const ordinal = congress === 119 ? '119th' : `${congress}th`;
        const billUrl = `https://www.congress.gov/bill/${ordinal}-congress/${slug}/${billNum}`;

        let type = 'Bill';
        if (typeCode.includes('JRES')) type = 'Joint Resolution';
        else if (typeCode.includes('CONRES')) type = 'Concurrent Resolution';
        else if (typeCode.endsWith('RES')) type = 'Resolution';

        return {
          id: `congress-${congress}-${typeCode || 'unknown'}-${billNum || String(idx)}`,
          billNumber: `${typeCode} ${billNum}`,
          title: item.title || '',
          chamber,
          type,
          session: `${congress}th Congress`,
          status: item.latestAction?.text || 'Introduced',
          dateIntroduced: item.introducedDate || '',
          latestActionDate: item.latestAction?.actionDate || '',
          url: billUrl,
          sponsors: [],
          abstract: '',
          subject: item.policyArea?.name ? [item.policyArea.name] : [],
        };
      });

      console.log(`Congress.gov: ${bills.length} sponsored bills for ${bioguideId} (total=${total})`);
      return new Response(
        JSON.stringify({ success: true, bills, total, page, maxPage: Math.ceil(total / per_page) || 1, session: '' }),
        { headers: withCache({ ...getCorsHeaders(req), 'Content-Type': 'application/json' }) }
      );
    }

    const apiKey = Deno.env.get('OPENSTATES_API_KEY');
    if (!apiKey) {
      return new Response(
        JSON.stringify({ success: false, error: 'OpenStates API key not configured' }),
        { headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } }
      );
    }

    // Convert state name to OCD jurisdiction ID (e.g. "Colorado" → "ocd-jurisdiction/country:us/state:co/government")
    const stateAbbr = jurisdictionToAbbr(jurisdiction);
    // DC uses "district:dc" not "state:dc" in OCD format
    const ocdJurisdiction = stateAbbr === 'dc'
      ? `ocd-jurisdiction/country:us/district:dc/government`
      : `ocd-jurisdiction/country:us/state:${stateAbbr}/government`;

    // Normalise "Last, First" → "First Last" for OpenStates name search
    // Handle suffixes like Jr., Sr., III, IV, II that may appear after extra commas
    let personName = search || '';
    if (personName.includes(',')) {
      const suffixes = /\b(jr\.?|sr\.?|ii|iii|iv|v|vi|vii|viii)\b/gi;
      const cleaned = personName.replace(suffixes, '').replace(/,\s*,/g, ',').replace(/,\s*$/, '');
      const [last, firstPart] = cleaned.split(',');
      personName = `${(firstPart || '').trim().split(' ')[0]} ${last.trim()}`;
    }

    // Look up the legislator's OpenStates person ID so we can filter by sponsor
    let sponsorId: string | undefined;
    if (personName) {
      try {
        const peopleResp = await fetch(
          `https://v3.openstates.org/people?jurisdiction=${encodeURIComponent(ocdJurisdiction)}&name=${encodeURIComponent(personName)}&per_page=5`,
          { headers: { 'X-API-KEY': apiKey } }
        );
        if (peopleResp.ok) {
          const peopleData = await peopleResp.json();
          const people = peopleData.results || [];
          if (people.length > 0) {
            sponsorId = people[0].id;
            console.log(`Person lookup: "${personName}" → ${sponsorId}`);
          } else {
            console.log(`Person lookup: no results for "${personName}" in ${ocdJurisdiction}`);
          }
        }
      } catch (e) {
        console.log(`Person lookup failed:`, e);
      }
    }

    // Build query params for OpenStates v3 REST API (max per_page is 20)
    const osPerPage = Math.min(per_page, 20);
    const params = new URLSearchParams({
      jurisdiction: ocdJurisdiction,
      per_page: String(osPerPage),
      page: String(page),
      sort: 'updated_desc',
    });
    params.append('include', 'sponsorships');
    params.append('include', 'abstracts');

    if (session) params.set('session', session);
    // Use sponsor ID filter when we found the person; fall back to text search
    if (sponsorId) {
      params.set('sponsor', sponsorId);
    } else if (search) {
      params.set('q', search);
    }

    const url = `https://v3.openstates.org/bills?${params}`;
    console.log('Fetching bills from OpenStates:', url);

    const resp = await fetch(url, {
      headers: { 'X-API-KEY': apiKey },
    });

    if (!resp.ok) {
      const errText = await resp.text();
      console.error(`OpenStates API error: ${resp.status} ${errText}`);
      const error = resp.status === 429
        ? 'API rate limit reached. Please try again later.'
        : `OpenStates API error: ${resp.status} — ${errText.slice(0, 300)}`;
      return new Response(
        JSON.stringify({ success: false, error }),
        { headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } }
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
        url: bill.openstates_url || (jurisdiction ? `https://openstates.org/${jurisdiction.toLowerCase().replace(/\s+/g, '-')}/bills/${bill.session}/${bill.identifier}/` : ''),
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
      { headers: withCache({ ...getCorsHeaders(req), 'Content-Type': 'application/json' }) }
    );
  } catch (error) {
    console.error('Error fetching bills:', error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Failed to fetch bills' }),
      { headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } }
    );
  }
});
