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

    // The /Bills/Prefiled page has structured content that Firecrawl can parse
    const billListUrl = `https://www.leg.state.nv.us/App/NELIS/REL/${session}/Bills/Prefiled`;
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
    console.log('Markdown length:', markdown.length, 'First 500 chars:', markdown.substring(0, 500));

    // Parse bills from the structured markdown
    const bills = parseBillsFromMarkdown(markdown, session);

    // Apply search filter if provided
    let filteredBills = bills;
    if (search) {
      const q = search.toLowerCase();
      filteredBills = bills.filter(
        (b: any) =>
          b.billNumber.toLowerCase().includes(q) ||
          b.title.toLowerCase().includes(q)
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

  // Pattern: [AB1](url) followed by "Introduced DATE" then title text
  // Each bill block is separated by "* * *" (horizontal rule)
  let i = 0;
  while (i < lines.length) {
    const line = lines[i].trim();
    
    // Match lines like [AB1](https://...Overview) or [SB1](https://...Overview)
    const linkMatch = line.match(/^\[((?:AB|SB|AJR|SJR|ACR|SCR|AR|SR)\d+)\]\((https?:\/\/[^\)]+)\)$/i);
    if (linkMatch) {
      const billNumber = linkMatch[1].toUpperCase();
      const overviewUrl = linkMatch[2];
      
      // Next non-empty line should be "Introduced DATE"
      let dateIntroduced = '';
      let title = '';
      let j = i + 1;
      
      // Skip empty lines
      while (j < lines.length && lines[j].trim() === '') j++;
      
      // Check for introduced date
      if (j < lines.length) {
        const dateLine = lines[j].trim();
        const dateMatch = dateLine.match(/^Introduced\s+(.+)$/i);
        if (dateMatch) {
          dateIntroduced = dateMatch[1];
          j++;
        }
      }
      
      // Skip empty lines
      while (j < lines.length && lines[j].trim() === '') j++;
      
      // Next non-empty line(s) should be the title/description
      const titleParts: string[] = [];
      while (j < lines.length) {
        const tl = lines[j].trim();
        if (tl === '' || tl === '* * *' || tl.match(/^\[(?:AB|SB|AJR|SJR|ACR|SCR|AR|SR)\d+\]/i)) break;
        titleParts.push(tl);
        j++;
      }
      title = titleParts.join(' ').trim();
      
      // Clean up title - remove BDR reference for cleaner display
      const bdrMatch = title.match(/\(BDR\s+[\w\-]+\)\s*$/);
      const bdr = bdrMatch ? bdrMatch[0] : '';
      const cleanTitle = title.replace(/\s*\(BDR\s+[\w\-]+\)\s*$/, '').trim();
      
      if (!cleanTitle) {
        i = j;
        continue;
      }

      // Determine chamber from prefix
      const chamber = billNumber.startsWith('S') ? 'Senate' : 'Assembly';

      // Determine type
      let type = 'Bill';
      if (billNumber.includes('JR')) type = 'Joint Resolution';
      else if (billNumber.includes('CR')) type = 'Concurrent Resolution';
      else if (/^[AS]R\d/.test(billNumber)) type = 'Resolution';

      bills.push({
        id: billNumber.toLowerCase(),
        billNumber,
        title: cleanTitle.length > 200 ? cleanTitle.substring(0, 197) + '...' : cleanTitle,
        chamber,
        type,
        session,
        status: 'Introduced',
        dateIntroduced,
        bdr: bdr.replace(/[()]/g, '').trim(),
        url: overviewUrl,
        sponsors: [],
      });
      
      i = j;
    } else {
      i++;
    }
  }

  // Sort bills naturally
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
