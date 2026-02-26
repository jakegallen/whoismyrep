const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { billUrl, billNumber, billTitle } = await req.json();

    if (!billUrl || !billNumber) {
      return new Response(
        JSON.stringify({ success: false, error: 'billUrl and billNumber are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Step 1: Scrape bill detail page with Firecrawl
    const firecrawlKey = Deno.env.get('FIRECRAWL_API_KEY');
    if (!firecrawlKey) {
      return new Response(
        JSON.stringify({ success: false, error: 'Firecrawl connector not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Scraping bill detail:', billUrl);

    const scrapeResp = await fetch('https://api.firecrawl.dev/v1/scrape', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${firecrawlKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: billUrl,
        formats: ['markdown'],
        onlyMainContent: true,
        waitFor: 3000,
      }),
    });

    const scrapeData = await scrapeResp.json();
    const billMarkdown = scrapeData.data?.markdown || scrapeData.markdown || '';

    if (!billMarkdown) {
      return new Response(
        JSON.stringify({ success: false, error: 'Could not scrape bill content' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Step 2: Summarize with Lovable AI
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({ success: false, error: 'LOVABLE_API_KEY not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const systemPrompt = `You are a U.S. politics expert. Analyze the following bill content and provide:
1. A plain-English summary (2-3 paragraphs) that any resident can understand
2. Key impacts: who this bill affects and how
3. Current status in the legislative process
4. Related issues/topics

Format your response in markdown. Be factual and non-partisan. If the content is insufficient, note what information is available.`;

    const aiResp = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-3-flash-preview',
        messages: [
          { role: 'system', content: systemPrompt },
          {
            role: 'user',
            content: `Analyze this bill (${billNumber}: ${billTitle || 'No title'}):\n\n${billMarkdown.substring(0, 12000)}`,
          },
        ],
      }),
    });

    if (!aiResp.ok) {
      if (aiResp.status === 429) {
        return new Response(
          JSON.stringify({ success: false, error: 'Rate limit exceeded. Please try again in a moment.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (aiResp.status === 402) {
        return new Response(
          JSON.stringify({ success: false, error: 'AI credits exhausted. Please add funds.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      const errText = await aiResp.text();
      console.error('AI gateway error:', aiResp.status, errText);
      return new Response(
        JSON.stringify({ success: false, error: 'AI analysis failed' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const aiData = await aiResp.json();
    const summary = aiData.choices?.[0]?.message?.content || 'Unable to generate summary.';

    // Also extract sponsors and status from the scraped content
    const details = extractBillDetails(billMarkdown);

    console.log('Bill summary generated for', billNumber);

    return new Response(
      JSON.stringify({
        success: true,
        summary,
        rawContent: billMarkdown.substring(0, 5000),
        ...details,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error summarizing bill:', error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Failed to summarize bill' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function extractBillDetails(markdown: string) {
  const details: any = { sponsors: [], status: 'Introduced', subjects: [] };

  // Try to extract sponsors
  const sponsorPatterns = [
    /(?:Sponsor|Author|Introduced by)[:\s]+([^\n]+)/gi,
    /(?:Primary Sponsor)[:\s]+([^\n]+)/gi,
  ];
  for (const pattern of sponsorPatterns) {
    const match = pattern.exec(markdown);
    if (match) {
      details.sponsors = match[1]
        .split(/[,;]/)
        .map((s: string) => s.trim())
        .filter((s: string) => s.length > 0 && s.length < 80);
      break;
    }
  }

  // Try to extract status
  const statusPatterns = [
    /(?:Status|Bill Status)[:\s]+([^\n]+)/i,
    /(?:Last Action)[:\s]+([^\n]+)/i,
  ];
  for (const pattern of statusPatterns) {
    const match = pattern.exec(markdown);
    if (match) {
      details.status = match[1].trim().substring(0, 100);
      break;
    }
  }

  return details;
}
