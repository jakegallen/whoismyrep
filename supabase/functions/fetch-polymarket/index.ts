const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const GAMMA_API = 'https://gamma-api.polymarket.com';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { politicianName } = await req.json();

    if (!politicianName || politicianName.trim().length < 2) {
      return new Response(
        JSON.stringify({ success: false, error: 'politicianName is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const name = politicianName.trim();
    console.log(`Fetching Polymarket data for: ${name}`);

    // Search events matching the politician name
    const eventsUrl = `${GAMMA_API}/events?title=${encodeURIComponent(name)}&active=true&closed=false&limit=20`;
    const eventsResp = await fetch(eventsUrl);
    let events = [];
    
    if (eventsResp.ok) {
      events = await eventsResp.json();
    }

    // Also search markets directly for broader coverage
    const marketsUrl = `${GAMMA_API}/markets?title=${encodeURIComponent(name)}&active=true&closed=false&limit=20`;
    const marketsResp = await fetch(marketsUrl);
    let directMarkets: any[] = [];

    if (marketsResp.ok) {
      directMarkets = await marketsResp.json();
    }

    // If no results with full name, try last name only
    const lastName = name.split(' ').pop() || name;
    let lastNameEvents: any[] = [];
    let lastNameMarkets: any[] = [];

    if (events.length === 0 && directMarkets.length === 0 && lastName !== name) {
      const lnEventsResp = await fetch(`${GAMMA_API}/events?title=${encodeURIComponent(lastName)}&active=true&closed=false&limit=20`);
      if (lnEventsResp.ok) lastNameEvents = await lnEventsResp.json();

      const lnMarketsResp = await fetch(`${GAMMA_API}/markets?title=${encodeURIComponent(lastName)}&active=true&closed=false&limit=20`);
      if (lnMarketsResp.ok) lastNameMarkets = await lnMarketsResp.json();
    }

    // Combine and deduplicate
    const allEvents = [...events, ...lastNameEvents];
    const allDirectMarkets = [...directMarkets, ...lastNameMarkets];

    // Extract markets from events
    const eventMarkets: any[] = [];
    for (const event of allEvents) {
      if (event.markets && Array.isArray(event.markets)) {
        for (const market of event.markets) {
          eventMarkets.push({
            ...market,
            eventTitle: event.title,
            eventSlug: event.slug,
          });
        }
      }
    }

    // Merge direct markets with event markets, dedup by condition_id
    // Then filter to only markets that actually mention the politician
    const nameParts = name.toLowerCase().split(/\s+/);
    const lastNamePart = nameParts[nameParts.length - 1];
    const seenIds = new Set<string>();
    const allMarkets: any[] = [];

    for (const m of [...eventMarkets, ...allDirectMarkets]) {
      const id = m.condition_id || m.id || m.questionID;
      const text = `${m.question || ''} ${m.title || ''} ${m.eventTitle || ''}`.toLowerCase();
      const isRelevant = text.includes(lastNamePart) || text.includes(name.toLowerCase());
      if (id && !seenIds.has(id) && isRelevant) {
        seenIds.add(id);
        allMarkets.push(m);
      }
    }

    // Normalize market data
    const normalized = allMarkets.map((m: any) => {
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

    // Sort by volume (most popular first)
    normalized.sort((a: any, b: any) => b.volume - a.volume);

    console.log(`Found ${normalized.length} Polymarket markets for "${name}"`);

    return new Response(
      JSON.stringify({ success: true, markets: normalized, total: normalized.length }),
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
