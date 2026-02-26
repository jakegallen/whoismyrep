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
    params.append('include', 'other_identifiers');

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

      // Extract social handles from links array
      const socialFromLinks: Record<string, string> = {};
      let website: string | undefined;
      for (const link of (person.links || [])) {
        if (!link.url) continue;
        const lUrl = link.url.toLowerCase();
        const lNote = (link.note || '').toLowerCase();
        if (lNote.includes('twitter') || lUrl.includes('x.com') || lUrl.includes('twitter.com')) {
          socialFromLinks.x = link.url;
        } else if (lUrl.includes('facebook.com')) {
          socialFromLinks.facebook = link.url;
        } else if (lUrl.includes('instagram.com')) {
          socialFromLinks.instagram = link.url;
        } else if (lUrl.includes('youtube.com')) {
          socialFromLinks.youtube = link.url;
        } else if (lUrl.includes('tiktok.com')) {
          socialFromLinks.tiktok = link.url;
        } else if (!website) {
          website = link.url;
        }
      }

      // Extract social handles from ids array (OpenStates stores twitter/facebook/youtube/instagram as ids)
      const socialFromIds: Record<string, string> = {};
      for (const idObj of (person.ids || [])) {
        const scheme = (idObj.identifier_type || idObj.scheme || '').toLowerCase();
        const value = idObj.identifier || idObj.id || '';
        if (!value) continue;
        if (scheme === 'twitter' || scheme === 'x') {
          socialFromIds.x = value.replace(/^@/, '');
        } else if (scheme === 'facebook') {
          socialFromIds.facebook = value;
        } else if (scheme === 'instagram') {
          socialFromIds.instagram = value;
        } else if (scheme === 'youtube') {
          socialFromIds.youtube = value;
        } else if (scheme === 'tiktok') {
          socialFromIds.tiktok = value;
        }
      }

      // Also check other_identifiers field (some OpenStates versions use this)
      for (const idObj of (person.other_identifiers || [])) {
        const scheme = (idObj.scheme || '').toLowerCase();
        const value = idObj.identifier || '';
        if (!value) continue;
        if (scheme === 'twitter' || scheme === 'x') {
          socialFromIds.x = socialFromIds.x || value.replace(/^@/, '');
        } else if (scheme === 'facebook') {
          socialFromIds.facebook = socialFromIds.facebook || value;
        } else if (scheme === 'instagram') {
          socialFromIds.instagram = socialFromIds.instagram || value;
        } else if (scheme === 'youtube') {
          socialFromIds.youtube = socialFromIds.youtube || value;
        } else if (scheme === 'tiktok') {
          socialFromIds.tiktok = socialFromIds.tiktok || value;
        }
      }

      // Merge: ids take priority (cleaner handles), links as fallback (full URLs)
      const merged: Record<string, string> = { ...socialFromLinks, ...socialFromIds };
      const socialHandles = Object.fromEntries(
        Object.entries(merged).filter(([, v]) => v)
      );

      // Log first legislator's raw data for debugging
      if (results.indexOf(person) === 0) {
        console.log('Sample person ids:', JSON.stringify(person.ids || []));
        console.log('Sample person other_identifiers:', JSON.stringify(person.other_identifiers || []));
        console.log('Sample person links:', JSON.stringify(person.links || []));
        console.log('Extracted socialHandles:', JSON.stringify(socialHandles));
      }

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
        website: website || undefined,
        socialHandles,
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
