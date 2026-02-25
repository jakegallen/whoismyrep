const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get('FIRECRAWL_API_KEY');
    if (!apiKey) {
      console.error('FIRECRAWL_API_KEY not configured');
      return new Response(
        JSON.stringify({ success: false, error: 'Firecrawl connector not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { session = '83rd2025', search } = await req.json().catch(() => ({}));

    // Scrape the Nevada Legislature bill list page
    const billListUrl = `https://www.leg.state.nv.us/App/NELIS/REL/${session}/BillsList`;
    console.log('Scraping bill list:', billListUrl);

    const scrapeResponse = await fetch('https://api.firecrawl.dev/v1/scrape', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: billListUrl,
        formats: ['markdown'],
        onlyMainContent: true,
        waitFor: 3000,
      }),
    });

    const scrapeData = await scrapeResponse.json();

    if (!scrapeResponse.ok) {
      console.error('Firecrawl API error:', scrapeData);
      return new Response(
        JSON.stringify({ success: false, error: scrapeData.error || 'Failed to scrape bills' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const markdown = scrapeData.data?.markdown || scrapeData.markdown || '';

    // Parse bills from the scraped markdown
    const bills = parseBillsFromMarkdown(markdown, session);

    // Apply search filter if provided
    let filteredBills = bills;
    if (search) {
      const q = search.toLowerCase();
      filteredBills = bills.filter(
        (b: any) =>
          b.billNumber.toLowerCase().includes(q) ||
          b.title.toLowerCase().includes(q) ||
          (b.sponsors && b.sponsors.some((s: string) => s.toLowerCase().includes(q)))
      );
    }

    console.log(`Parsed ${bills.length} bills, returning ${filteredBills.length}`);

    return new Response(
      JSON.stringify({
        success: true,
        bills: filteredBills,
        total: bills.length,
        session,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error fetching bills:', error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Failed to fetch bills' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function parseBillsFromMarkdown(markdown: string, session: string): any[] {
  const bills: any[] = [];
  const lines = markdown.split('\n');

  // Match patterns like "AB1", "AB 1", "SB1", "SB 1", "AJR1", "SJR1", etc.
  const billPattern = /\b((?:AB|SB|AJR|SJR|ACR|SCR|AR|SR|AJR|SJR)\s*\d+)\b/gi;
  const seen = new Set<string>();

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    const matches = line.match(billPattern);
    if (!matches) continue;

    for (const rawMatch of matches) {
      const billNumber = rawMatch.replace(/\s+/g, '').toUpperCase();
      if (seen.has(billNumber)) continue;
      seen.add(billNumber);

      // Try to extract a title from the surrounding text
      let title = '';
      // Look at the rest of the line after the bill number
      const afterBill = line.substring(line.toUpperCase().indexOf(billNumber) + billNumber.length).trim();
      if (afterBill.length > 5) {
        title = afterBill
          .replace(/^[\s\-–—:|]+/, '')
          .replace(/\[.*?\]/g, '')
          .replace(/\(.*?\)/g, '')
          .trim();
      }
      // Also check the next line
      if (!title && i + 1 < lines.length) {
        const nextLine = lines[i + 1].trim();
        if (nextLine && !nextLine.match(billPattern) && nextLine.length > 5) {
          title = nextLine.replace(/^[\s\-–—:|]+/, '').trim();
        }
      }

      if (!title) title = `${billNumber} — Nevada ${session.includes('2025') ? '83rd Session' : session}`;

      // Truncate long titles
      if (title.length > 200) title = title.substring(0, 197) + '...';

      // Determine chamber from prefix
      const chamber = billNumber.startsWith('S') ? 'Senate' : 'Assembly';

      // Determine type
      let type = 'Bill';
      if (billNumber.includes('JR')) type = 'Joint Resolution';
      else if (billNumber.includes('CR')) type = 'Concurrent Resolution';
      else if (billNumber.includes('R') && !billNumber.includes('JR') && !billNumber.includes('CR')) type = 'Resolution';

      bills.push({
        id: billNumber.toLowerCase().replace(/\s/g, ''),
        billNumber,
        title,
        chamber,
        type,
        session,
        status: 'Introduced',
        url: `https://www.leg.state.nv.us/App/NELIS/REL/${session}/Bill/${billNumber.replace(/(\D+)(\d+)/, '$1/$2')}`,
        sponsors: [],
      });
    }
  }

  // Sort bills naturally (AB1, AB2, ... AB10, etc.)
  bills.sort((a, b) => {
    const prefixA = a.billNumber.replace(/\d+/, '');
    const prefixB = b.billNumber.replace(/\d+/, '');
    if (prefixA !== prefixB) return prefixA.localeCompare(prefixB);
    const numA = parseInt(a.billNumber.replace(/\D+/, ''));
    const numB = parseInt(b.billNumber.replace(/\D+/, ''));
    return numA - numB;
  });

  return bills;
}
