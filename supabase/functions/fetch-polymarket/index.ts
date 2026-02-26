const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const GAMMA_API = 'https://gamma-api.polymarket.com';
const SEARCH_API = 'https://gamma-api.polymarket.com/public-search';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { politicianName, state } = await req.json();

    if (!politicianName || politicianName.trim().length < 2) {
      return new Response(
        JSON.stringify({ success: false, error: 'politicianName is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const name = politicianName.trim();
    const stateStr = (state || 'Nevada').trim();
    console.log(`Fetching Polymarket data for: ${name} (${stateStr})`);

    const nameParts = name.split(/\s+/);
    const lastName = nameParts[nameParts.length - 1];
    const lastTwoParts = nameParts.length >= 3
      ? nameParts.slice(-2).join(' ')
      : null;

    // Use the public-search endpoint for text-based search
    const searchTerms = [name];
    if (lastTwoParts && lastTwoParts !== name) searchTerms.push(lastTwoParts);

    const rawEvents: any[] = [];
    const fetches: Promise<void>[] = [];

    for (const term of searchTerms) {
      fetches.push(
        fetch(`${SEARCH_API}?q=${encodeURIComponent(term)}&events_status=active&limit_per_type=20`)
          .then(r => r.ok ? r.json() : { events: [] })
          .then((data: any) => {
            if (data.events && Array.isArray(data.events)) {
              rawEvents.push(...data.events);
            }
          })
          .catch(() => {})
      );
    }

    // Also search for state-specific political markets
    fetches.push(
      fetch(`${SEARCH_API}?q=${encodeURIComponent(stateStr + ' election')}&events_status=active&limit_per_type=10`)
        .then(r => r.ok ? r.json() : { events: [] })
        .then((data: any) => {
          if (data.events && Array.isArray(data.events)) {
            rawEvents.push(...data.events);
          }
        })
        .catch(() => {})
    );

    await Promise.all(fetches);

    // Extract markets from events
    const eventMarkets: any[] = [];
    for (const event of rawEvents) {
      if (event.markets && Array.isArray(event.markets)) {
        for (const market of event.markets) {
          eventMarkets.push({
            ...market,
            eventTitle: event.title,
            eventSlug: event.slug,
            eventDescription: event.description || '',
          });
        }
      }
    }

    // Build strict relevance checker
    const nameLC = name.toLowerCase();
    const lastNameLC = lastName.toLowerCase();
    const lastTwoLC = lastTwoParts?.toLowerCase() || null;
    const stateLC = stateStr.toLowerCase();

    // Require the market to mention either:
    // 1. The politician's full name or last name (for multi-word last names, check last two parts)
    // 2. The state name in a political context
    function isRelevant(m: any): boolean {
      const text = [
        m.question || '',
        m.title || '',
        m.eventTitle || '',
        m.eventDescription || '',
        m.description || '',
      ].join(' ').toLowerCase();

      // Direct name match (strongest signal)
      if (text.includes(nameLC)) return true;
      if (lastTwoLC && text.includes(lastTwoLC)) return true;

      // Last name match — but only if text also mentions politics/election/senate/governor etc.
      if (text.includes(lastNameLC)) {
        const politicalTerms = ['senator', 'senate', 'governor', 'congress', 'election',
          'vote', 'primary', 'campaign', 'incumbent', 'representative', 'house',
          'democrat', 'republican', 'gop', 'dem', 'political', 'legislation',
          stateLC];
        return politicalTerms.some(term => text.includes(term));
      }

      // State-specific political market
      if (text.includes(stateLC)) {
        const politicalTerms = ['senator', 'senate', 'governor', 'congress', 'election',
          'vote', 'primary', 'house race', 'ballot', 'midterm'];
        return politicalTerms.some(term => text.includes(term));
      }

      return false;
    }

    // Deduplicate and filter
    const seenIds = new Set<string>();
    const filteredMarkets: any[] = [];

    for (const m of eventMarkets) {
      const id = m.condition_id || m.id || m.questionID;
      if (!id || seenIds.has(id)) continue;
      if (!isRelevant(m)) continue;
      seenIds.add(id);
      filteredMarkets.push(m);
    }

    // Normalize market data
    const normalized = filteredMarkets.map((m: any) => {
      const outcomePrices = m.outcomePrices
        ? (typeof m.outcomePrices === 'string' ? JSON.parse(m.outcomePrices) : m.outcomePrices)
        : [];
      const outcomes = m.outcomes
        ? (typeof m.outcomes === 'string' ? JSON.parse(m.outcomes) : m.outcomes)
        : ['Yes', 'No'];

      const yesPrice = outcomePrices[0] ? parseFloat(outcomePrices[0]) : null;
      const noPrice = outcomePrices[1] ? parseFloat(outcomePrices[1]) : null;

      return {
        id: m.condition_id || m.id,
        question: m.question || m.title || 'Unknown',
        eventTitle: m.eventTitle || null,
        slug: m.eventSlug || m.slug || null,
        yesPercent: yesPrice !== null ? Math.round(yesPrice * 100) : null,
        noPercent: noPrice !== null ? Math.round(noPrice * 100) : null,
        outcomes,
        volume: m.volume ? parseFloat(m.volume) : 0,
        volumeFormatted: formatVolume(m.volume ? parseFloat(m.volume) : 0),
        liquidity: m.liquidity ? parseFloat(m.liquidity) : 0,
        endDate: m.endDate || m.end_date_iso || null,
        image: m.image || null,
        active: m.active !== false,
        closed: m.closed === true,
        url: m.slug
          ? `https://polymarket.com/event/${m.eventSlug || m.slug}`
          : null,
      };
    });

    // Filter out closed markets, then sort by volume
    const active = normalized.filter(m => !m.closed);
    active.sort((a, b) => b.volume - a.volume);

    console.log(`Found ${active.length} relevant Polymarket markets for "${name}"`);

    return new Response(
      JSON.stringify({ success: true, markets: active, total: active.length }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Polymarket fetch error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Failed to fetch Polymarket data' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function formatVolume(vol: number): string {
  if (vol >= 1_000_000) return `$${(vol / 1_000_000).toFixed(1)}M`;
  if (vol >= 1_000) return `$${(vol / 1_000).toFixed(0)}K`;
  return `$${Math.round(vol)}`;
}
