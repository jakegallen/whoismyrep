const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// ── Free RSS feed sources (no API key needed) ──────────────────────────
const RSS_FEEDS = [
  { name: 'Las Vegas Sun', url: 'https://lasvegassun.com/feeds/headlines/all/' },
  { name: 'Las Vegas Sun Politics', url: 'https://lasvegassun.com/feeds/headlines/politics/' },
  { name: 'KTNV Las Vegas', url: 'https://www.ktnv.com/feeds/rssFeed?obfType=RSS_FEED&siteId=10073&categoryId=501' },
  { name: 'Reno Gazette Journal', url: 'https://rssfeeds.rgj.com/reno/news' },
  { name: 'US News Nevada', url: 'https://www.usnews.com/rss/news/nevada' },
];

// ── Lightweight XML → items parser (no deps) ───────────────────────────
function parseRssItems(xml: string, sourceName: string): Array<{ title: string; url: string; description: string; pubDate: string; source: string }> {
  const items: Array<{ title: string; url: string; description: string; pubDate: string; source: string }> = [];
  const itemRegex = /<item[\s>]([\s\S]*?)<\/item>/gi;
  let match: RegExpExecArray | null;

  while ((match = itemRegex.exec(xml)) !== null) {
    const block = match[1];
    const title = extractTag(block, 'title');
    const link = extractTag(block, 'link');
    const description = extractTag(block, 'description');
    const pubDate = extractTag(block, 'pubDate');

    if (title && link) {
      items.push({
        title: stripCdata(title),
        url: link.trim(),
        description: stripCdata(description || '').replace(/<[^>]*>/g, '').slice(0, 400),
        pubDate: pubDate || '',
        source: sourceName,
      });
    }
  }
  return items;
}

function extractTag(xml: string, tag: string): string | null {
  const re = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i');
  const m = xml.match(re);
  return m ? m[1] : null;
}

function stripCdata(s: string): string {
  return s.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1').trim();
}

// ── Fetch a single RSS feed with timeout ────────────────────────────────
async function fetchFeed(feed: { name: string; url: string }): Promise<Array<{ title: string; url: string; description: string; pubDate: string; source: string }>> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    const resp = await fetch(feed.url, {
      signal: controller.signal,
      headers: { 'User-Agent': 'NevadaPoliticsBot/1.0' },
    });
    clearTimeout(timeout);

    if (!resp.ok) {
      console.warn(`RSS feed ${feed.name} returned ${resp.status}`);
      return [];
    }

    const xml = await resp.text();
    return parseRssItems(xml, feed.name);
  } catch (e) {
    console.warn(`RSS feed ${feed.name} failed:`, e);
    return [];
  }
}

// ── Main handler ────────────────────────────────────────────────────────
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({ success: false, error: 'AI gateway not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ── Step 1: Fetch RSS feeds + Firecrawl + NewsAPI in parallel ────────
    const rssPromises = RSS_FEEDS.map(fetchFeed);
    const firecrawlPromise = fetchFirecrawlResults();
    const newsApiPromise = fetchNewsApiResults();

    const [rssResults, firecrawlResults, newsApiResults] = await Promise.all([
      Promise.all(rssPromises),
      firecrawlPromise,
      newsApiPromise,
    ]);

    const allResults: Array<{ title: string; url: string; description: string; source: string }> = [];

    // Flatten RSS results
    for (const feedItems of rssResults) {
      for (const item of feedItems) {
        allResults.push(item);
      }
    }

    // Add Firecrawl results
    for (const item of firecrawlResults) {
      allResults.push(item);
    }

    // Add NewsAPI results
    for (const item of newsApiResults) {
      allResults.push(item);
    }

    // Deduplicate by URL
    const seen = new Set<string>();
    const uniqueResults = allResults.filter((r) => {
      if (!r.url || seen.has(r.url)) return false;
      seen.add(r.url);
      return true;
    });

    console.log(`Found ${uniqueResults.length} unique results (RSS: ${rssResults.flat().length}, Firecrawl: ${firecrawlResults.length}, NewsAPI: ${newsApiResults.length})`);

    if (uniqueResults.length === 0) {
      return new Response(
        JSON.stringify({ success: true, news: [], trending: [], trendingIndividuals: [] }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ── Step 2: AI categorization ──────────────────────────────────────
    const articlesText = uniqueResults
      .slice(0, 20)
      .map((r, i) => `[${i + 1}] Title: ${r.title}\nURL: ${r.url}\nSource: ${r.source}\nDescription: ${r.description}`)
      .join('\n\n');

    const aiResult = await categorizeWithAI(articlesText, LOVABLE_API_KEY);
    if ('error' in aiResult) {
      return new Response(
        JSON.stringify({ success: false, error: aiResult.error }),
        { status: aiResult.status || 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Add IDs and time info
    const now = new Date();
    aiResult.news = (aiResult.news || []).map((item: any, i: number) => ({
      ...item,
      id: `news-${i}-${Date.now()}`,
      date: now.toISOString().split('T')[0],
      timeAgo: 'Just now',
    }));
    aiResult.trending = (aiResult.trending || []).map((item: any, i: number) => ({
      ...item,
      id: `trend-${i}`,
    }));
    aiResult.trendingIndividuals = (aiResult.trendingIndividuals || []).map((item: any, i: number) => ({
      ...item,
      id: `individual-${i}`,
    }));

    return new Response(
      JSON.stringify({ success: true, ...aiResult }),
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

// ── Firecrawl (optional, uses API key if available) ─────────────────────
async function fetchFirecrawlResults(): Promise<Array<{ title: string; url: string; description: string; source: string }>> {
  const FIRECRAWL_API_KEY = Deno.env.get('FIRECRAWL_API_KEY');
  if (!FIRECRAWL_API_KEY) return [];

  const queries = [
    'Nevada legislature law bill 2025 2026',
    'Las Vegas politics policy mayor',
    'Nevada politician controversy news',
  ];

  const results: Array<{ title: string; url: string; description: string; source: string }> = [];

  for (const query of queries) {
    try {
      const resp = await fetch('https://api.firecrawl.dev/v1/search', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${FIRECRAWL_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query, limit: 5, tbs: 'qdr:w' }),
      });

      if (resp.ok) {
        const data = await resp.json();
        if (data.data) {
          for (const r of data.data) {
            if (r.url && r.title) {
              results.push({
                title: r.title,
                url: r.url,
                description: r.description || (r.markdown || '').slice(0, 300),
                source: 'Firecrawl',
              });
            }
          }
        }
      }
    } catch (e) {
      console.warn(`Firecrawl search failed for "${query}":`, e);
    }
  }

  return results;
}

// ── AI categorization via Lovable gateway ───────────────────────────────
async function categorizeWithAI(articlesText: string, apiKey: string): Promise<any> {
  const aiResp = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
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
   - "party": single letter party abbreviation: "R" for Republican, "D" for Democrat, "I" for Independent, "L" for Libertarian
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
                      party: { type: 'string', enum: ['R', 'D', 'I', 'L'] },
                      mentions: { type: 'number' },
                      trend: { type: 'string', enum: ['up', 'down', 'stable'] },
                    },
                    required: ['name', 'title', 'party', 'mentions', 'trend'],
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
    if (aiResp.status === 429) return { error: 'Rate limit exceeded. Please try again in a moment.', status: 429 };
    if (aiResp.status === 402) return { error: 'AI usage credits exhausted.', status: 402 };
    return { error: 'Failed to process news', status: 500 };
  }

  const aiData = await aiResp.json();
  let result: any = { news: [], trending: [], trendingIndividuals: [] };
  const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
  if (toolCall?.function?.arguments) {
    try {
      result = JSON.parse(toolCall.function.arguments);
    } catch (e) {
      console.error('Failed to parse AI tool call:', e);
    }
  }

  return result;
}

// ── NewsAPI (uses NEWSAPI_KEY if available) ──────────────────────────────
async function fetchNewsApiResults(): Promise<Array<{ title: string; url: string; description: string; source: string }>> {
  const apiKey = Deno.env.get('NEWSAPI_KEY');
  if (!apiKey) return [];

  const results: Array<{ title: string; url: string; description: string; source: string }> = [];

  const queries = [
    'Nevada politics',
    'Las Vegas government',
    'Nevada legislature',
  ];

  for (const q of queries) {
    try {
      const params = new URLSearchParams({
        q,
        language: 'en',
        sortBy: 'publishedAt',
        pageSize: '10',
        apiKey,
      });

      const resp = await fetch(`https://newsapi.org/v2/everything?${params}`, {
        headers: { 'User-Agent': 'NevadaPoliticsBot/1.0' },
      });

      if (!resp.ok) {
        const errText = await resp.text();
        console.warn(`NewsAPI error for "${q}": ${resp.status} ${errText}`);
        continue;
      }

      const data = await resp.json();
      for (const article of (data.articles || [])) {
        if (article.url && article.title && article.title !== '[Removed]') {
          results.push({
            title: article.title,
            url: article.url,
            description: (article.description || '').slice(0, 400),
            source: article.source?.name || 'NewsAPI',
          });
        }
      }
    } catch (e) {
      console.warn(`NewsAPI fetch failed for "${q}":`, e);
    }
  }

  return results;
}
