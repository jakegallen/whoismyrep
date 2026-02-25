const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// Nevada political social media accounts to scrape via Firecrawl
const SOCIAL_ACCOUNTS = [
  // Twitter/X profiles
  { platform: 'twitter', url: 'https://x.com/GovLombardo', name: 'Gov. Joe Lombardo', handle: '@GovLombardo' },
  { platform: 'twitter', url: 'https://x.com/SenCortezMasto', name: 'Sen. Catherine Cortez Masto', handle: '@SenCortezMasto' },
  { platform: 'twitter', url: 'https://x.com/SenJackyRosen', name: 'Sen. Jacky Rosen', handle: '@SenJackyRosen' },
  { platform: 'twitter', url: 'https://x.com/RepHorsford', name: 'Rep. Steven Horsford', handle: '@RepHorsford' },
  { platform: 'twitter', url: 'https://x.com/RepSusieLee', name: 'Rep. Susie Lee', handle: '@RepSusieLee' },
  { platform: 'twitter', url: 'https://x.com/NevadaLeg', name: 'Nevada Legislature', handle: '@NevadaLeg' },
  { platform: 'twitter', url: 'https://x.com/LasVegasLocally', name: 'Las Vegas Locally', handle: '@LasVegasLocally' },
  // Facebook pages
  { platform: 'facebook', url: 'https://www.facebook.com/GovLombardo', name: 'Gov. Joe Lombardo', handle: 'GovLombardo' },
  // TikTok
  { platform: 'tiktok', url: 'https://www.tiktok.com/@nevaborntough', name: 'Nevada Born Tough', handle: '@nevaborntough' },
  // Instagram
  { platform: 'instagram', url: 'https://www.instagram.com/govlombardo/', name: 'Gov. Joe Lombardo', handle: '@govlombardo' },
];

// Firecrawl search queries for social media content about Nevada politics
const SOCIAL_SEARCH_QUERIES = [
  'Nevada politics social media twitter site:x.com OR site:twitter.com',
  'Las Vegas politics TikTok viral',
  'Nevada legislature social media controversy',
  'Las Vegas politician Instagram Facebook post',
  'Nevada political meme viral social media',
];

interface SocialPost {
  id: string;
  platform: 'twitter' | 'facebook' | 'tiktok' | 'instagram' | 'reddit' | 'other';
  author: string;
  handle: string;
  content: string;
  url: string;
  timestamp: string;
  engagement: string;
  avatarUrl?: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const FIRECRAWL_API_KEY = Deno.env.get('FIRECRAWL_API_KEY');
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

    if (!LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({ success: false, error: 'AI gateway not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const rawPosts: Array<{ url: string; title: string; content: string; source: string; platform: string }> = [];

    // Strategy 1: Firecrawl scraping of social media profiles
    if (FIRECRAWL_API_KEY) {
      // Scrape a subset of accounts (limit to avoid rate limits)
      const accountsToScrape = SOCIAL_ACCOUNTS.slice(0, 6);
      const scrapePromises = accountsToScrape.map(async (account) => {
        try {
          const resp = await fetch('https://api.firecrawl.dev/v1/scrape', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${FIRECRAWL_API_KEY}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              url: account.url,
              formats: ['markdown'],
              onlyMainContent: true,
              waitFor: 3000,
            }),
          });

          if (resp.ok) {
            const data = await resp.json();
            const markdown = data?.data?.markdown || data?.markdown || '';
            if (markdown.length > 50) {
              rawPosts.push({
                url: account.url,
                title: `${account.name} on ${account.platform}`,
                content: markdown.slice(0, 1500),
                source: account.name,
                platform: account.platform,
              });
            }
          }
        } catch (e) {
          console.warn(`Failed to scrape ${account.name}:`, e);
        }
      });

      // Strategy 2: Firecrawl search for social media mentions
      const searchPromises = SOCIAL_SEARCH_QUERIES.map(async (query) => {
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
                  const platform = detectPlatform(r.url);
                  rawPosts.push({
                    url: r.url,
                    title: r.title,
                    content: r.description || (r.markdown || '').slice(0, 800),
                    source: r.title,
                    platform,
                  });
                }
              }
            }
          }
        } catch (e) {
          console.warn(`Firecrawl search failed for social media:`, e);
        }
      });

      await Promise.all([...scrapePromises, ...searchPromises]);
    }

    // Strategy 3: RSS feeds that cover social media activity
    const socialRssFeeds = [
      { name: 'Reddit Nevada Politics', url: 'https://www.reddit.com/r/nevadapolitics/.rss' },
      { name: 'Reddit Las Vegas', url: 'https://www.reddit.com/r/vegaspolitics/.rss' },
      { name: 'Reddit Vegas', url: 'https://www.reddit.com/r/vegas/.rss' },
    ];

    const rssPromises = socialRssFeeds.map(async (feed) => {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 8000);
        const resp = await fetch(feed.url, {
          signal: controller.signal,
          headers: { 'User-Agent': 'NevadaPoliticsBot/1.0' },
        });
        clearTimeout(timeout);

        if (!resp.ok) return;

        const xml = await resp.text();
        const entries = parseAtomEntries(xml);
        for (const entry of entries.slice(0, 10)) {
          rawPosts.push({
            url: entry.url,
            title: entry.title,
            content: entry.content.slice(0, 800),
            source: feed.name,
            platform: 'reddit',
          });
        }
      } catch (e) {
        console.warn(`RSS feed ${feed.name} failed:`, e);
      }
    });

    await Promise.all(rssPromises);

    // Deduplicate
    const seen = new Set<string>();
    const uniquePosts = rawPosts.filter((p) => {
      if (!p.url || seen.has(p.url)) return false;
      seen.add(p.url);
      return true;
    });

    console.log(`Collected ${uniquePosts.length} unique social media items`);

    if (uniquePosts.length === 0) {
      return new Response(
        JSON.stringify({ success: true, posts: [] }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Use AI to structure and summarize the social media content
    const postsText = uniquePosts
      .slice(0, 25)
      .map((p, i) => `[${i + 1}] Platform: ${p.platform}\nSource: ${p.source}\nURL: ${p.url}\nTitle: ${p.title}\nContent: ${p.content}`)
      .join('\n\n---\n\n');

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
            content: `You extract and format social media posts about Nevada and Las Vegas politics from scraped web content.

Given raw scraped content from social media platforms and Reddit, extract individual posts/discussions and return them as structured JSON.

Return a JSON object with a "posts" array, each item containing:
- "platform": one of "twitter", "facebook", "tiktok", "instagram", "reddit", "other"
- "author": the person or account name who posted
- "handle": their social media handle (e.g. @username) or subreddit name
- "content": the actual post text, cleaned up and summarized (max 280 chars)
- "url": link to the post
- "timestamp": best guess at when it was posted (ISO format or relative like "2 hours ago")
- "engagement": a brief engagement summary like "1.2K likes" or "45 comments" (make a reasonable estimate if not available)

Only include posts actually relevant to Nevada/Las Vegas politics. 
Create 10-20 posts maximum, prioritizing recent and engaging content.
Return ONLY valid JSON, no markdown fences.`,
          },
          {
            role: 'user',
            content: `Extract social media posts from this scraped content:\n\n${postsText}`,
          },
        ],
        tools: [
          {
            type: 'function',
            function: {
              name: 'format_social_posts',
              description: 'Format extracted social media posts',
              parameters: {
                type: 'object',
                properties: {
                  posts: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        platform: { type: 'string', enum: ['twitter', 'facebook', 'tiktok', 'instagram', 'reddit', 'other'] },
                        author: { type: 'string' },
                        handle: { type: 'string' },
                        content: { type: 'string' },
                        url: { type: 'string' },
                        timestamp: { type: 'string' },
                        engagement: { type: 'string' },
                      },
                      required: ['platform', 'author', 'handle', 'content', 'url', 'timestamp', 'engagement'],
                    },
                  },
                },
                required: ['posts'],
              },
            },
          },
        ],
        tool_choice: { type: 'function', function: { name: 'format_social_posts' } },
      }),
    });

    if (!aiResp.ok) {
      const errText = await aiResp.text();
      console.error('AI gateway error:', aiResp.status, errText);
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to process social media content' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const aiData = await aiResp.json();
    let posts: SocialPost[] = [];
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (toolCall?.function?.arguments) {
      try {
        const parsed = JSON.parse(toolCall.function.arguments);
        posts = (parsed.posts || []).map((p: any, i: number) => ({
          ...p,
          id: `social-${i}-${Date.now()}`,
        }));
      } catch (e) {
        console.error('Failed to parse AI response:', e);
      }
    }

    return new Response(
      JSON.stringify({ success: true, posts }),
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

function detectPlatform(url: string): string {
  if (url.includes('x.com') || url.includes('twitter.com')) return 'twitter';
  if (url.includes('facebook.com') || url.includes('fb.com')) return 'facebook';
  if (url.includes('tiktok.com')) return 'tiktok';
  if (url.includes('instagram.com')) return 'instagram';
  if (url.includes('reddit.com')) return 'reddit';
  return 'other';
}

// Atom feed parser (Reddit uses Atom)
function parseAtomEntries(xml: string): Array<{ title: string; url: string; content: string }> {
  const entries: Array<{ title: string; url: string; content: string }> = [];
  const entryRegex = /<entry>([\s\S]*?)<\/entry>/gi;
  let match: RegExpExecArray | null;

  while ((match = entryRegex.exec(xml)) !== null) {
    const block = match[1];
    const title = extractTag(block, 'title');
    const link = block.match(/<link[^>]*href="([^"]*)"[^>]*\/>/)?.[1] || '';
    const content = extractTag(block, 'content') || extractTag(block, 'summary') || '';

    if (title && link) {
      entries.push({
        title: stripCdata(title),
        url: link,
        content: stripCdata(content).replace(/<[^>]*>/g, '').slice(0, 800),
      });
    }
  }
  return entries;
}

function extractTag(xml: string, tag: string): string | null {
  const re = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i');
  const m = xml.match(re);
  return m ? m[1] : null;
}

function stripCdata(s: string): string {
  return s.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1').trim();
}
