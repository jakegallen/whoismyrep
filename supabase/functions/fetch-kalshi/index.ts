import { getCorsHeaders } from "../_shared/cors.ts";

const KALSHI_API = 'https://api.elections.kalshi.com/trade-api/v2';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: getCorsHeaders(req) });
  }

  try {
    const { politicianName, state } = await req.json();

    if (!politicianName || politicianName.trim().length < 2) {
      return new Response(
        JSON.stringify({ success: false, error: 'politicianName is required' }),
        { status: 400, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } }
      );
    }

    const name = politicianName.trim();
    const stateStr = (state || '').trim();
    console.log(`Fetching Kalshi data for: ${name} (${stateStr})`);

    // Kalshi public events endpoint — search for political events
    const nameParts = name.split(/\s+/);
    const lastName = nameParts[nameParts.length - 1];

    // Build search terms for client-side filtering
    const searchTerms = [name.toLowerCase(), lastName.toLowerCase()];
    if (stateStr) searchTerms.push(stateStr.toLowerCase());

    // Fetch events once with a generous limit (API has no text search param)
    const allEvents: any[] = [];
    const url = `${KALSHI_API}/events?status=open&with_nested_markets=true&limit=100`;

    try {
      const resp = await fetch(url, {
        headers: { 'Accept': 'application/json' },
      });
      if (resp.ok) {
        const data = await resp.json();
        if (data.events && Array.isArray(data.events)) {
          // Keep events whose title/category mentions any search term
          for (const event of data.events) {
            const text = [
              event.title || '',
              event.sub_title || '',
              event.category || '',
            ].join(' ').toLowerCase();
            if (searchTerms.some(term => text.includes(term))) {
              allEvents.push(event);
            }
          }
        }
      }
    } catch (err) {
      console.error(`Kalshi fetch error:`, err);
    }

    // Extract markets from events
    const nameLC = name.toLowerCase();
    const lastNameLC = lastName.toLowerCase();
    const stateLC = stateStr.toLowerCase();

    function isRelevant(text: string): boolean {
      if (text.includes(nameLC)) return true;
      if (text.includes(lastNameLC)) {
        const politicalTerms = ['senator', 'senate', 'governor', 'congress', 'election',
          'vote', 'primary', 'campaign', 'representative', 'house',
          'democrat', 'republican', 'president', 'political', stateLC];
        return politicalTerms.some(t => text.includes(t));
      }
      if (stateLC && text.includes(stateLC)) {
        const politicalTerms = ['senator', 'senate', 'governor', 'election', 'congress',
          'house', 'primary', 'vote', 'ballot'];
        return politicalTerms.some(t => text.includes(t));
      }
      return false;
    }

    // Deduplicate and normalize
    const seenTickers = new Set<string>();
    const markets: any[] = [];

    for (const event of allEvents) {
      const eventText = [event.title || '', event.sub_title || ''].join(' ').toLowerCase();
      const nestedMarkets = event.markets || [];

      for (const m of nestedMarkets) {
        const ticker = m.ticker;
        if (!ticker || seenTickers.has(ticker)) continue;

        const marketText = [
          m.title || '',
          m.subtitle || '',
          eventText,
        ].join(' ').toLowerCase();

        if (!isRelevant(marketText)) continue;
        seenTickers.add(ticker);

        const yesPrice = m.yes_ask != null ? m.yes_ask : (m.last_price != null ? m.last_price : null);
        const noPrice = m.no_ask != null ? m.no_ask : (yesPrice != null ? 1 - yesPrice : null);

        markets.push({
          id: ticker,
          question: m.title || m.subtitle || event.title || 'Unknown',
          eventTitle: event.title || null,
          ticker,
          yesPercent: yesPrice != null ? Math.round(yesPrice * 100) : null,
          noPercent: noPrice != null ? Math.round(noPrice * 100) : null,
          volume: m.volume || 0,
          volumeFormatted: formatVolume(m.volume || 0),
          openInterest: m.open_interest || 0,
          endDate: m.expiration_time || m.close_time || null,
          active: m.status === 'active' || m.status === 'open',
          closed: m.status === 'closed' || m.status === 'settled',
          url: `https://kalshi.com/markets/${event.event_ticker || ticker}`,
          source: 'kalshi' as const,
        });
      }
    }

    // Filter out closed, sort by volume
    const active = markets.filter(m => !m.closed);
    active.sort((a, b) => b.volume - a.volume);

    console.log(`Found ${active.length} relevant Kalshi markets for "${name}"`);

    return new Response(
      JSON.stringify({ success: true, markets: active, total: active.length }),
      { headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Kalshi fetch error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Failed to fetch Kalshi data' }),
      { status: 500, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } }
    );
  }
});

function formatVolume(vol: number): string {
  if (vol >= 1_000_000) return `$${(vol / 1_000_000).toFixed(1)}M`;
  if (vol >= 1_000) return `$${(vol / 1_000).toFixed(0)}K`;
  return `$${Math.round(vol)}`;
}
