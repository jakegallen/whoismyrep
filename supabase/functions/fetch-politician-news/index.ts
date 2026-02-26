const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface NewsArticle {
  id: string;
  title: string;
  url: string;
  source: string;
  date: string;
  summary: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { politicianName } = await req.json().catch(() => ({}));

    if (!politicianName) {
      return new Response(
        JSON.stringify({ success: false, error: 'politicianName is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Fetching news for: ${politicianName}`);

    // Use Google News RSS feed filtered by politician name
    const query = encodeURIComponent(`"${politicianName}" politics`);
    const rssUrl = `https://news.google.com/rss/search?q=${query}&hl=en-US&gl=US&ceid=US:en`;

    const resp = await fetch(rssUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; WhoIsMyRep/1.0)' },
    });

    if (!resp.ok) {
      console.error(`Google News RSS error: ${resp.status}`);
      return new Response(
        JSON.stringify({ success: true, articles: [], total: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const xml = await resp.text();

    // Parse RSS XML manually (no DOM parser in Deno edge functions)
    const articles: NewsArticle[] = [];
    const items = xml.split('<item>').slice(1); // Skip header

    for (let i = 0; i < Math.min(items.length, 20); i++) {
      const item = items[i];

      const title = extractTag(item, 'title');
      const link = extractTag(item, 'link');
      const pubDate = extractTag(item, 'pubDate');
      const source = extractTag(item, 'source');
      const description = extractTag(item, 'description');

      if (title && link) {
        // Clean HTML from description
        const cleanDesc = description
          ?.replace(/<[^>]*>/g, '')
          ?.replace(/&amp;/g, '&')
          ?.replace(/&lt;/g, '<')
          ?.replace(/&gt;/g, '>')
          ?.replace(/&quot;/g, '"')
          ?.replace(/&#39;/g, "'")
          ?.trim() || '';

        articles.push({
          id: `gnews-${i}-${Date.now()}`,
          title: title.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'"),
          url: link,
          source: source || 'Google News',
          date: pubDate ? new Date(pubDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
          summary: cleanDesc.slice(0, 300),
        });
      }
    }

    console.log(`Found ${articles.length} news articles for ${politicianName}`);

    return new Response(
      JSON.stringify({ success: true, articles, total: articles.length }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error fetching politician news:', error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Failed to fetch news' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function extractTag(xml: string, tag: string): string {
  // Handle CDATA sections
  const cdataRegex = new RegExp(`<${tag}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]></${tag}>`, 'i');
  const cdataMatch = xml.match(cdataRegex);
  if (cdataMatch) return cdataMatch[1].trim();

  // Regular tag
  const regex = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, 'i');
  const match = xml.match(regex);
  return match ? match[1].trim() : '';
}
