const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { url, title, summary, category } = await req.json();

    if (!url) {
      return new Response(
        JSON.stringify({ success: false, error: 'URL is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const FIRECRAWL_API_KEY = Deno.env.get('FIRECRAWL_API_KEY');
    if (!FIRECRAWL_API_KEY) {
      return new Response(
        JSON.stringify({ success: false, error: 'Firecrawl not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
    if (!OPENAI_API_KEY) {
      return new Response(
        JSON.stringify({ success: false, error: 'OPENAI_API_KEY not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Step 1: Scrape the full article content
    let articleContent = '';
    try {
      const scrapeResp = await fetch('https://api.firecrawl.dev/v1/scrape', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${FIRECRAWL_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url,
          formats: ['markdown'],
          onlyMainContent: true,
        }),
      });

      if (scrapeResp.ok) {
        const scrapeData = await scrapeResp.json();
        articleContent = scrapeData.data?.markdown || scrapeData.markdown || '';
      }
    } catch (e) {
      console.error('Scrape failed:', e);
    }

    // Step 2: Generate in-depth analysis via AI
    const contentContext = articleContent
      ? `\n\nFull article content:\n${articleContent.slice(0, 6000)}`
      : '';

    const aiResp = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `You are an expert Nevada political analyst. Given a news article about Nevada or Las Vegas politics, produce a comprehensive analysis in markdown format.

Structure your analysis with these sections:
## Key Takeaways
- 3-5 bullet points summarizing the most important facts

## Background & Context
A 2-3 paragraph section explaining the broader political context in Nevada, relevant history, and why this matters.

## Stakeholders & Impact
Who are the key players involved? How does this affect Nevada residents, businesses, and the political landscape?

## What's Next
What are the likely next steps, upcoming votes, or potential outcomes? What should readers watch for?

## Local Perspective
How does this specifically impact Las Vegas and Clark County residents?

Write in a professional, journalistic tone. Be factual and balanced. If you don't have enough information to be certain, say so.`,
          },
          {
            role: 'user',
            content: `Analyze this Nevada political news article:

Title: ${title}
Category: ${category}
Summary: ${summary}
Source URL: ${url}${contentContext}`,
          },
        ],
      }),
    });

    if (!aiResp.ok) {
      if (aiResp.status === 429) {
        return new Response(
          JSON.stringify({ success: false, error: 'Rate limit exceeded. Please try again shortly.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (aiResp.status === 402) {
        return new Response(
          JSON.stringify({ success: false, error: 'AI credits exhausted.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      const errText = await aiResp.text();
      console.error('AI error:', aiResp.status, errText);
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to generate analysis' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const aiData = await aiResp.json();
    const analysis = aiData.choices?.[0]?.message?.content || '';

    return new Response(
      JSON.stringify({ success: true, analysis }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
