const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface CongressTrade {
  politician: string;
  party: string | null;
  state: string | null;
  district: string | null;
  chamber: 'House' | 'Senate';
  ticker: string | null;
  assetDescription: string;
  type: string;
  amount: string;
  transactionDate: string | null;
  disclosureDate: string | null;
  owner: string | null;
  source: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const { chamber, politician, ticker, type, limit = 100, offset = 0 } = body;

    const fmpKey = Deno.env.get('FMP_API_KEY');

    if (!fmpKey) {
      console.warn('FMP_API_KEY not set — returning empty results');
      return new Response(
        JSON.stringify({
          success: true,
          trades: [],
          total: 0,
          purchaseCount: 0,
          saleCount: 0,
          topTraders: [],
          topTickers: [],
          warning: 'FMP_API_KEY is not configured. Add it via: supabase secrets set FMP_API_KEY=your_key',
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Fetching congress trades from FMP: chamber=${chamber}, politician=${politician}, ticker=${ticker}`);

    // FMP paginates in pages of ~100. Fetch pages 0-4 (up to ~500 recent trades).
    const MAX_PAGES = 5;

    const fetchSenate = !chamber || chamber === 'senate';
    const fetchHouse  = !chamber || chamber === 'house';

    // Build page fetch promises for each chamber
    const senatePromises: Promise<CongressTrade[]>[] = [];
    const housePromises:  Promise<CongressTrade[]>[] = [];

    for (let page = 0; page < MAX_PAGES; page++) {
      if (fetchSenate) {
        senatePromises.push(
          fetch(`https://financialmodelingprep.com/api/v4/senate-trading-rss-feed?page=${page}&apikey=${fmpKey}`)
            .then(r => {
              if (!r.ok) throw new Error(`Senate page ${page}: ${r.status}`);
              return r.json();
            })
            .then((data: any[]) => {
              if (!Array.isArray(data) || data.length === 0) throw new Error('empty');
              return data.map(t => normalizeFmpTrade(t, 'Senate'));
            })
            .catch(err => {
              if (!String(err).includes('empty')) console.warn('Senate FMP error:', err);
              return [];
            })
        );
      }

      if (fetchHouse) {
        housePromises.push(
          fetch(`https://financialmodelingprep.com/api/v4/house-disclosure-rss-feed?page=${page}&apikey=${fmpKey}`)
            .then(r => {
              if (!r.ok) throw new Error(`House page ${page}: ${r.status}`);
              return r.json();
            })
            .then((data: any[]) => {
              if (!Array.isArray(data) || data.length === 0) throw new Error('empty');
              return data.map(t => normalizeFmpTrade(t, 'House'));
            })
            .catch(err => {
              if (!String(err).includes('empty')) console.warn('House FMP error:', err);
              return [];
            })
        );
      }
    }

    const allResults = await Promise.all([...senatePromises, ...housePromises]);
    let trades: CongressTrade[] = allResults.flat();

    console.log(`FMP returned ${trades.length} raw trades`);

    // ── Apply filters ─────────────────────────────────────────────────────────
    if (chamber) {
      const c = chamber.toLowerCase();
      trades = trades.filter(t => t.chamber.toLowerCase() === c);
    }
    if (politician) {
      const q = politician.toLowerCase();
      trades = trades.filter(t => t.politician.toLowerCase().includes(q));
    }
    if (ticker) {
      const q = ticker.toUpperCase();
      trades = trades.filter(t => t.ticker?.toUpperCase() === q);
    }
    if (type) {
      const q = type.toLowerCase();
      trades = trades.filter(t => t.type?.toLowerCase().includes(q));
    }

    // ── Sort: most recent transaction date first ──────────────────────────────
    trades.sort((a, b) => {
      const da = a.transactionDate ? new Date(a.transactionDate).getTime() : 0;
      const db = b.transactionDate ? new Date(b.transactionDate).getTime() : 0;
      return db - da;
    });

    const total = trades.length;
    const paginated = trades.slice(offset, offset + limit);

    // ── Summary stats ─────────────────────────────────────────────────────────
    const purchaseCount = trades.filter(t => t.type?.toLowerCase().includes('purchase')).length;
    const saleCount     = trades.filter(t => t.type?.toLowerCase().includes('sale')).length;

    const traderCounts: Record<string, number> = {};
    for (const t of trades) {
      traderCounts[t.politician] = (traderCounts[t.politician] || 0) + 1;
    }
    const topTraders = Object.entries(traderCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([name, count]) => ({ name, tradeCount: count }));

    const tickerCounts: Record<string, number> = {};
    for (const t of trades) {
      if (t.ticker) tickerCounts[t.ticker] = (tickerCounts[t.ticker] || 0) + 1;
    }
    const topTickers = Object.entries(tickerCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([symbol, count]) => ({ symbol, tradeCount: count }));

    console.log(`Returning ${paginated.length} of ${total} trades`);

    return new Response(
      JSON.stringify({ success: true, trades: paginated, total, purchaseCount, saleCount, topTraders, topTickers }),
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

// ── Normalizer ─────────────────────────────────────────────────────────────────
// FMP senate-trading-rss-feed and house-disclosure-rss-feed field names:
//   firstName, lastName, office, dateRecieved, transactionDate, owner,
//   assetDescription, assetType, type, amount, comment, symbol
//   (party and state are not always present; office describes role)

function normalizeFmpTrade(t: any, defaultChamber: 'House' | 'Senate'): CongressTrade {
  const firstName = t.firstName || t.first_name || '';
  const lastName  = t.lastName  || t.last_name  || '';
  const name = [firstName, lastName].filter(Boolean).join(' ').trim() || 'Unknown';

  // "office" can be "Senator", "Representative", chamber name, etc.
  const office = String(t.office || '').toLowerCase();
  let chamber: 'House' | 'Senate' = defaultChamber;
  if (office.includes('senate') || office.includes('senator')) chamber = 'Senate';
  if (office.includes('house') || office.includes('representative')) chamber = 'House';

  return {
    politician: name,
    party: normalizeParty(t.party || ''),
    state: t.state || null,
    district: t.district || null,
    chamber,
    ticker: t.symbol || t.ticker || null,
    assetDescription: t.assetDescription || t.asset_description || t.symbol || t.ticker || 'Unknown',
    type: t.type || t.transactionType || 'Unknown',
    amount: t.amount || 'Unknown',
    transactionDate: t.transactionDate || t.transaction_date || null,
    disclosureDate: t.dateRecieved || t.date_recieved || t.disclosureDate || t.disclosure_date || null,
    owner: t.owner || null,
    source: 'fmp',
  };
}

function normalizeParty(raw: string): string {
  if (!raw) return 'Unknown';
  const lo = raw.toLowerCase().trim();
  if (lo === 'd' || lo.includes('democrat')) return 'Democrat';
  if (lo === 'r' || lo.includes('republican')) return 'Republican';
  if (lo === 'i' || lo.includes('independent')) return 'Independent';
  return raw;
}
