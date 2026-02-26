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

    const { chamber, search, page = 1, per_page = 50, jurisdiction = 'Nevada' } = await req.json().catch(() => ({}));

    const params = new URLSearchParams({
      jurisdiction,
      per_page: String(per_page),
      page: String(page),
    });
    params.append('include', 'links');
    params.append('include', 'sources');
    params.append('include', 'other_names');

    if (chamber === 'upper' || chamber === 'senate') {
      params.set('org_classification', 'upper');
    } else if (chamber === 'lower' || chamber === 'assembly') {
      params.set('org_classification', 'lower');
    }

    if (search) params.set('name', search);

    const url = `https://v3.openstates.org/people?${params}`;
    console.log('Fetching legislators from OpenStates:', url);

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

    const legislators = results.map((person: any) => {
      const currentRole = (person.current_role) || {};
      const party = person.party || 'Unknown';
      const chamber = currentRole.org_classification === 'upper' ? 'Senate' : 'Assembly';
      const district = currentRole.district || '';
      const title = currentRole.title || (chamber === 'Senate' ? 'Senator' : 'Assembly Member');

      // Extract links
      const links = (person.links || []).reduce((acc: Record<string, string>, link: any) => {
        if (link.url) {
          const lUrl = link.url.toLowerCase();
          const lNote = (link.note || '').toLowerCase();
          if (lNote.includes('twitter') || lUrl.includes('x.com') || lUrl.includes('twitter.com')) {
            acc.x = link.url;
          } else if (lUrl.includes('facebook.com')) {
            acc.facebook = link.url;
          } else if (lUrl.includes('instagram.com')) {
            acc.instagram = link.url;
          } else if (lUrl.includes('youtube.com')) {
            acc.youtube = link.url;
          } else if (lUrl.includes('tiktok.com')) {
            acc.tiktok = link.url;
          } else if (!acc.website) {
            acc.website = link.url;
          }
        }
        return acc;
      }, {} as Record<string, string>);

      return {
        id: person.id,
        name: person.name,
        title: `${title}, District ${district}`,
        party: party === 'Democratic' ? 'Democrat' : party,
        office: `${jurisdiction} ${chamber}`,
        region: `District ${district}`,
        level: 'state' as const,
        imageUrl: person.image || undefined,
        chamber,
        district,
        email: person.email || undefined,
        website: links.website || undefined,
        socialHandles: Object.fromEntries(
          Object.entries({
            x: links.x,
            facebook: links.facebook,
            instagram: links.instagram,
            youtube: links.youtube,
            tiktok: links.tiktok,
          }).filter(([, v]) => v)
        ),
        openstatesUrl: person.openstates_url || undefined,
      };
    });

    console.log(`Fetched ${legislators.length} legislators from OpenStates`);

    return new Response(
      JSON.stringify({
        success: true,
        legislators,
        total: data.pagination?.total_items || legislators.length,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error fetching legislators:', error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Failed to fetch legislators' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
