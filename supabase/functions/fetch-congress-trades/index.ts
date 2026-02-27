const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const HOUSE_URL = 'https://house-stock-watcher-data.s3-us-west-2.amazonaws.com/data/all_transactions.json';
const SENATE_URL = 'https://senate-stock-watcher-data.s3-us-west-2.amazonaws.com/aggregate/all_transactions.json';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const { chamber, politician, ticker, type, limit = 100, offset = 0 } = body;

    console.log(`Fetching congress trades: chamber=${chamber}, politician=${politician}, ticker=${ticker}, type=${type}`);

    // Fetch from both chambers or a specific one
    const fetchHouse = !chamber || chamber === 'house';
    const fetchSenate = !chamber || chamber === 'senate';

    const fetches: Promise<any[]>[] = [];

    if (fetchHouse) {
      fetches.push(
        fetch(HOUSE_URL)
          .then(r => {
            if (!r.ok) throw new Error(`House API returned ${r.status}`);
            return r.json();
          })
          .then((data: any[]) =>
            data.map(t => ({
              ...normalizeHouseTrade(t),
              chamber: 'House' as const,
            }))
          )
          .catch(err => {
            console.error('House fetch error:', err);
            return [];
          })
      );
    }

    if (fetchSenate) {
      fetches.push(
        fetch(SENATE_URL)
          .then(r => {
            if (!r.ok) throw new Error(`Senate API returned ${r.status}`);
            return r.json();
          })
          .then((data: any[]) =>
            data.map(t => ({
              ...normalizeSenateTrade(t),
              chamber: 'Senate' as const,
            }))
          )
          .catch(err => {
            console.error('Senate fetch error:', err);
            return [];
          })
      );
    }

    const results = await Promise.all(fetches);
    let trades = results.flat();

    // Apply filters
    if (politician) {
      const q = politician.toLowerCase();
      trades = trades.filter(t =>
        t.politician.toLowerCase().includes(q)
      );
    }

    if (ticker) {
      const q = ticker.toUpperCase();
      trades = trades.filter(t =>
        t.ticker?.toUpperCase() === q
      );
    }

    if (type) {
      const q = type.toLowerCase();
      trades = trades.filter(t =>
        t.type?.toLowerCase().includes(q)
      );
    }

    // Sort by date descending (most recent first)
    trades.sort((a, b) => {
      const da = a.transactionDate ? new Date(a.transactionDate).getTime() : 0;
      const db = b.transactionDate ? new Date(b.transactionDate).getTime() : 0;
      return db - da;
    });

    const total = trades.length;

    // Paginate
    const paginated = trades.slice(offset, offset + limit);

    // Get summary stats
    const purchaseCount = trades.filter(t => t.type?.toLowerCase().includes('purchase')).length;
    const saleCount = trades.filter(t => t.type?.toLowerCase().includes('sale')).length;

    // Top traders by trade count
    const traderCounts: Record<string, number> = {};
    for (const t of trades) {
      traderCounts[t.politician] = (traderCounts[t.politician] || 0) + 1;
    }
    const topTraders = Object.entries(traderCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([name, count]) => ({ name, tradeCount: count }));

    // Top tickers
    const tickerCounts: Record<string, number> = {};
    for (const t of trades) {
      if (t.ticker) {
        tickerCounts[t.ticker] = (tickerCounts[t.ticker] || 0) + 1;
      }
    }
    const topTickers = Object.entries(tickerCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([symbol, count]) => ({ symbol, tradeCount: count }));

    console.log(`Returning ${paginated.length} of ${total} trades`);

    return new Response(
      JSON.stringify({
        success: true,
        trades: paginated,
        total,
        purchaseCount,
        saleCount,
        topTraders,
        topTickers,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Congress trades error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Failed to fetch trades' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function normalizeHouseTrade(t: any) {
  return {
    politician: t.representative || 'Unknown',
    party: t.party || null,
    state: t.state || null,
    district: t.district || null,
    ticker: t.ticker || null,
    assetDescription: t.asset_description || t.ticker || 'Unknown',
    type: t.type || 'Unknown',
    amount: t.amount || 'Unknown',
    transactionDate: t.transaction_date || null,
    disclosureDate: t.disclosure_date || null,
    owner: t.owner || null,
    source: 'house-stock-watcher',
  };
}

function normalizeSenateTrade(t: any) {
  return {
    politician: formatSenateName(t.senator || t.first_name + ' ' + t.last_name || 'Unknown'),
    party: t.party || null,
    state: t.state || null,
    district: null,
    ticker: t.ticker || null,
    assetDescription: t.asset_description || t.asset_type || t.ticker || 'Unknown',
    type: t.type || t.transaction_type || 'Unknown',
    amount: t.amount || 'Unknown',
    transactionDate: t.transaction_date || null,
    disclosureDate: t.disclosure_date || null,
    owner: t.owner || null,
    source: 'senate-stock-watcher',
  };
}

function formatSenateName(name: string): string {
  if (!name) return 'Unknown';
  // Handle "Last, First" format
  if (name.includes(',')) {
    const [last, first] = name.split(',').map(s => s.trim());
    return `${first} ${last}`;
  }
  return name;
}
