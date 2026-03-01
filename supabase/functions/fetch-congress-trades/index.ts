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

    const quiverKey = Deno.env.get('QUIVER_API_KEY');

    if (!quiverKey) {
      console.warn('QUIVER_API_KEY not set — returning empty results');
      return new Response(
        JSON.stringify({
          success: true,
          trades: [],
          total: 0,
          purchaseCount: 0,
          saleCount: 0,
          topTraders: [],
          topTickers: [],
          warning: 'QUIVER_API_KEY is not configured. Add it via: supabase secrets set QUIVER_API_KEY=your_key',
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Fetching congress trades from Quiver Quantitative: chamber=${chamber}, politician=${politician}, ticker=${ticker}`);

    let trades: CongressTrade[] = [];

    // ── Quiver Quantitative — Congressional Trading ───────────────────────────
    // Docs: https://www.quiverquant.com/sources/senatetrading
    //       https://www.quiverquant.com/sources/housetrading
    // Field names: Representative, Ticker, Transaction, Range, Party, State,
    //              District ("Senate" for senators), Date, TransactionDate, ReportDate
    try {
      const resp = await fetch('https://api.quiverquant.com/beta/live/congresstrading', {
        headers: {
          'Authorization': `Token ${quiverKey}`,
          'Accept': 'application/json',
        },
      });

      if (resp.ok) {
        const data = await resp.json();
        trades = (Array.isArray(data) ? data : []).map(normalizeQuiverTrade);
        console.log(`Quiver returned ${trades.length} raw trades`);
      } else {
        const errText = await resp.text().catch(() => '');
        console.error(`Quiver API error ${resp.status}:`, errText);
      }
    } catch (e) {
      console.error('Quiver fetch error:', e);
    }

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

    // ── Sort: most recent first ───────────────────────────────────────────────
    trades.sort((a, b) => {
      const da = a.transactionDate ? new Date(a.transactionDate).getTime() : 0;
      const db = b.transactionDate ? new Date(b.transactionDate).getTime() : 0;
      return db - da;
    });

    const total = trades.length;
    const paginated = trades.slice(offset, offset + limit);

    // ── Summary stats ─────────────────────────────────────────────────────────
    const purchaseCount = trades.filter(t => t.type?.toLowerCase().includes('purchase')).length;
    const saleCount = trades.filter(t => t.type?.toLowerCase().includes('sale')).length;

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

// ── Normalizers ────────────────────────────────────────────────────────────────

function normalizeQuiverTrade(t: any): CongressTrade {
  // Quiver Quant congressional trading fields:
  //   Representative, Ticker, Transaction, Range, Party, State,
  //   District ("Senate" for senators, number for House members),
  //   Date (disclosure/report date), TransactionDate, ReportDate, Owner, Comment
  const districtRaw = String(t.District || t.district || '');
  const isSenate = districtRaw.toLowerCase() === 'senate';

  return {
    politician: t.Representative || t.representative || 'Unknown',
    party: normalizeParty(t.Party || t.party || ''),
    state: t.State || t.state || null,
    district: isSenate ? null : (districtRaw || null),
    chamber: isSenate ? 'Senate' : 'House',
    ticker: t.Ticker || t.ticker || null,
    assetDescription: t.Asset || t.asset || t.AssetDescription || t.asset_description || t.Ticker || t.ticker || 'Unknown',
    type: t.Transaction || t.transaction || 'Unknown',
    amount: t.Range || t.range || 'Unknown',
    transactionDate: parseDate(t.TransactionDate || t.transaction_date || t.Date || t.date || null),
    disclosureDate: parseDate(t.ReportDate || t.report_date || t.DisclosureDate || t.disclosure_date || null),
    owner: t.Owner || t.owner || null,
    source: 'quiverquant',
  };
}

function normalizeParty(raw: string): string {
  const r = raw.trim();
  if (r === 'D') return 'Democrat';
  if (r === 'R') return 'Republican';
  if (r === 'I') return 'Independent';
  const lo = r.toLowerCase();
  if (lo.includes('democrat')) return 'Democrat';
  if (lo.includes('republican')) return 'Republican';
  if (lo.includes('independent')) return 'Independent';
  return r || 'Unknown';
}

// Handles "MM/DD/YYYY" → "YYYY-MM-DD" and passthrough for ISO strings
function parseDate(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const s = String(raw).trim();
  const mmddyyyy = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/;
  const match = s.match(mmddyyyy);
  if (match) {
    return `${match[3]}-${match[1].padStart(2, '0')}-${match[2].padStart(2, '0')}`;
  }
  // Already ISO or unknown — return as-is
  return s;
}
