const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const FIRECRAWL_API_KEY = Deno.env.get('FIRECRAWL_API_KEY');
    if (!FIRECRAWL_API_KEY) {
      return new Response(
        JSON.stringify({ success: false, error: 'Firecrawl not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({ success: false, error: 'AI gateway not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Step 1: Search for Nevada political news via Firecrawl
    const searchQueries = [
      'Nevada legislature law bill 2025 2026',
      'Las Vegas politics policy mayor',
      'Nevada politician controversy news',
      'Las Vegas Nevada political social media',
    ];

    const allResults: any[] = [];

    for (const query of searchQueries) {
      try {
        const searchResp = await fetch('https://api.firecrawl.dev/v1/search', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${FIRECRAWL_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            query,
            limit: 5,
            tbs: 'qdr:w', // last week
          }),
        });

        if (searchResp.ok) {
          const searchData = await searchResp.json();
          if (searchData.data) {
            allResults.push(...searchData.data);
          }
        }
      } catch (e) {
        console.error(`Search failed for "${query}":`, e);
      }
    }

    // Deduplicate by URL
    const seen = new Set<string>();
    const uniqueResults = allResults.filter((r) => {
      if (!r.url || seen.has(r.url)) return false;
      seen.add(r.url);
      return true;
    });

    console.log(`Found ${uniqueResults.length} unique results`);

    if (uniqueResults.length === 0) {
      return new Response(
        JSON.stringify({ success: true, news: [], trending: [] }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Step 2: Use AI to categorize and summarize the results
    const articlesText = uniqueResults
      .slice(0, 15) // limit to avoid token overflow
      .map((r: any, i: number) => `[${i + 1}] Title: ${r.title || 'Untitled'}\nURL: ${r.url}\nDescription: ${r.description || 'No description'}\nContent snippet: ${(r.markdown || '').slice(0, 300)}`)
      .join('\n\n');

    const aiResp = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-3-flash-preview',
        messages: [
          {
            role: 'system',
            content: `You are a political news analyst specializing in Nevada and Las Vegas politics. You categorize and summarize political news articles.

Given a list of search results about Nevada politics, return a JSON response with:
1. "news" - an array of news items, each with:
   - "title": a clear, concise headline (keep original if good, improve if needed)
   - "summary": 1-2 sentence summary of the article (max 200 chars)
   - "category": one of "law", "policy", "politician", "social"
   - "source": the publication/source name extracted from the URL domain
   - "url": the article URL
   - "isBreaking": true only if it seems very recent and significant
2. "trending" - an array of 6 trending story/topic objects:
   - "topic": short topic name (2-4 words)
   - "mentions": estimated relevance score (100-3000)
   - "trend": "up", "down", or "stable"
3. "trendingIndividuals" - an array of up to 6 politicians/political figures most mentioned across the articles, ranked by frequency:
   - "name": full name of the politician
   - "title": their political title (e.g. "Governor", "U.S. Senator")
   - "mentions": estimated number of mentions across articles (100-3000)
   - "trend": "up", "down", or "stable"

Only include articles actually related to Nevada/Las Vegas politics. Skip irrelevant results.
Return ONLY valid JSON, no markdown fences.`,
          },
          {
            role: 'user',
            content: `Here are the search results to analyze:\n\n${articlesText}`,
          },
        ],
        tools: [
          {
            type: 'function',
            function: {
              name: 'format_news',
              description: 'Format categorized Nevada political news and trending topics',
              parameters: {
                type: 'object',
                properties: {
                  news: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        title: { type: 'string' },
                        summary: { type: 'string' },
                        category: { type: 'string', enum: ['law', 'policy', 'politician', 'social'] },
                        source: { type: 'string' },
                        url: { type: 'string' },
                        isBreaking: { type: 'boolean' },
                      },
                      required: ['title', 'summary', 'category', 'source', 'url'],
                    },
                  },
                  trending: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        topic: { type: 'string' },
                        mentions: { type: 'number' },
                        trend: { type: 'string', enum: ['up', 'down', 'stable'] },
                      },
                      required: ['topic', 'mentions', 'trend'],
                    },
                  },
                  trendingIndividuals: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        name: { type: 'string' },
                        title: { type: 'string' },
                        mentions: { type: 'number' },
                        trend: { type: 'string', enum: ['up', 'down', 'stable'] },
                      },
                      required: ['name', 'title', 'mentions', 'trend'],
                    },
                  },
                },
                required: ['news', 'trending', 'trendingIndividuals'],
              },
            },
          },
        ],
        tool_choice: { type: 'function', function: { name: 'format_news' } },
      }),
    });

    if (!aiResp.ok) {
      const errText = await aiResp.text();
      console.error('AI gateway error:', aiResp.status, errText);

      if (aiResp.status === 429) {
        return new Response(
          JSON.stringify({ success: false, error: 'Rate limit exceeded. Please try again in a moment.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (aiResp.status === 402) {
        return new Response(
          JSON.stringify({ success: false, error: 'AI usage credits exhausted.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ success: false, error: 'Failed to process news' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const aiData = await aiResp.json();
    
    // Extract from tool call response
    let result: any = { news: [], trending: [], trendingIndividuals: [] };
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (toolCall?.function?.arguments) {
      try {
        result = JSON.parse(toolCall.function.arguments);
      } catch (e) {
        console.error('Failed to parse AI tool call:', e);
      }
    }

    // Add IDs and time info
    const now = new Date();
    result.news = (result.news || []).map((item: any, i: number) => ({
      ...item,
      id: `news-${i}-${Date.now()}`,
      date: now.toISOString().split('T')[0],
      timeAgo: 'Just now',
    }));

    result.trending = (result.trending || []).map((item: any, i: number) => ({
      ...item,
      id: `trend-${i}`,
    }));

    result.trendingIndividuals = (result.trendingIndividuals || []).map((item: any, i: number) => ({
      ...item,
      id: `individual-${i}`,
    }));

    return new Response(
      JSON.stringify({ success: true, ...result }),
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
