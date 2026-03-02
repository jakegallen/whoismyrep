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

    // Try multiple query strategies from most specific to broadest
    const nameParts = politicianName.trim().split(/\s+/);
    const lastName = nameParts[nameParts.length - 1] || politicianName;
    const firstName = nameParts[0] || '';

    const queries = [
      `"${politicianName}" politics`,                         // exact phrase + politics
      `"${politicianName}"`,                                  // exact phrase only
      `${firstName} ${lastName} politician OR congress OR legislature OR senator OR representative`,  // broad name + role keywords
    ];

    let articles: NewsArticle[] = [];

    for (const q of queries) {
      const rssUrl = `https://news.google.com/rss/search?q=${encodeURIComponent(q)}&hl=en-US&gl=US&ceid=US:en`;

      try {
        const resp = await fetch(rssUrl, {
          headers: { 'User-Agent': 'Mozilla/5.0 (compatible; WhoIsMyRep/1.0)' },
        });

        if (!resp.ok) {
          console.log(`Google News RSS query "${q}" returned ${resp.status}`);
          continue;
        }

        const xml = await resp.text();
        const parsed = parseRssItems(xml, politicianName);

        if (parsed.length > 0) {
          articles = parsed;
          console.log(`Query "${q}" returned ${parsed.length} articles`);
          break;
        }
        console.log(`Query "${q}" returned 0 articles, trying next...`);
      } catch (e) {
        console.log(`Query "${q}" failed:`, e);
        continue;
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

function parseRssItems(xml: string, politicianName: string): NewsArticle[] {
  const articles: NewsArticle[] = [];
  const items = xml.split('<item>').slice(1); // Skip header
  const nameWords = politicianName.toLowerCase().split(/\s+/);
  const lastName = nameWords[nameWords.length - 1] || '';

  for (let i = 0; i < Math.min(items.length, 25); i++) {
    const item = items[i];

    const title = extractTag(item, 'title');
    const link = extractTag(item, 'link');
    const pubDate = extractTag(item, 'pubDate');
    const source = extractTag(item, 'source');
    const description = extractTag(item, 'description');

    if (title && link) {
      const decodeEntities = (s: string | undefined) =>
        s?.replace(/&amp;/g, '&')
         ?.replace(/&lt;/g, '<')
         ?.replace(/&gt;/g, '>')
         ?.replace(/&quot;/g, '"')
         ?.replace(/&#39;/g, "'")
         ?.replace(/&nbsp;/g, ' ')
         ?.replace(/&#160;/g, ' ')
         || '';

      const cleanTitle = decodeEntities(title).replace(/<[^>]*>/g, '').trim();
      const cleanSource = decodeEntities(source).replace(/<[^>]*>/g, '').trim();

      // Clean description
      let cleanDesc = decodeEntities(description).replace(/<[^>]*>/g, '').trim();
      if (cleanDesc && cleanTitle) {
        const coreTitle = cleanTitle.replace(/\s*[-–—]\s*[^-–—]+$/, '').trim();
        if (cleanDesc.startsWith(coreTitle)) {
          cleanDesc = cleanDesc.slice(coreTitle.length).replace(/^\s*[-–—]\s*/, '').trim();
        }
        if (cleanDesc.length < 30) cleanDesc = '';
      }

      // Relevance check: for broad queries, ensure the article actually mentions the politician
      const lowerTitle = cleanTitle.toLowerCase();
      const lowerDesc = (cleanDesc || '').toLowerCase();
      const combinedText = `${lowerTitle} ${lowerDesc}`;
      const isRelevant = lastName.length > 2 && combinedText.includes(lastName);

      if (!isRelevant && i > 5) continue; // Be lenient on first few results

      articles.push({
        id: `gnews-${i}-${Date.now()}`,
        title: cleanTitle,
        url: link,
        source: cleanSource || 'Google News',
        date: pubDate ? new Date(pubDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
        summary: cleanDesc.slice(0, 300),
      });
    }
  }

  return articles.slice(0, 20);
}

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
