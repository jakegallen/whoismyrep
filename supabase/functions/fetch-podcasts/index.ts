const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// Nevada political podcast Apple Podcast IDs → we resolve RSS via iTunes Lookup API (free, no key)
const PODCAST_IDS = [
  1224983055,  // IndyMatters – The Nevada Independent
  1727606024,  // Ballot Battleground: Nevada – KRNV
  1669844852,  // Purple Politics Nevada – KUNR / NPR
];

// Direct RSS feeds (known URLs)
const DIRECT_FEEDS = [
  { name: 'KNPR State of Nevada', url: 'https://feeds.npr.org/510374/podcast.xml' },
];

interface PodcastEpisode {
  id: string;
  title: string;
  description: string;
  audioUrl: string;
  duration: string;
  pubDate: string;
  podcastName: string;
  podcastImage: string;
  episodeUrl: string;
}

// ── Resolve RSS feed URLs from Apple Podcast IDs ────────────────────────
async function resolveItunesFeeds(): Promise<Array<{ name: string; url: string; image: string }>> {
  const feeds: Array<{ name: string; url: string; image: string }> = [];

  for (const id of PODCAST_IDS) {
    try {
      const resp = await fetch(`https://itunes.apple.com/lookup?id=${id}&entity=podcast`);
      if (!resp.ok) continue;
      const data = await resp.json();
      const result = data.results?.[0];
      if (result?.feedUrl) {
        feeds.push({
          name: result.collectionName || result.trackName || 'Unknown',
          url: result.feedUrl,
          image: result.artworkUrl600 || result.artworkUrl100 || '',
        });
      }
    } catch (e) {
      console.warn(`iTunes lookup failed for ID ${id}:`, e);
    }
  }

  return feeds;
}

// ── Parse podcast RSS XML ───────────────────────────────────────────────
function parseEpisodes(xml: string, podcastName: string, podcastImage: string, maxEpisodes = 5): PodcastEpisode[] {
  const episodes: PodcastEpisode[] = [];
  const itemRegex = /<item[\s>]([\s\S]*?)<\/item>/gi;
  let match: RegExpExecArray | null;

  while ((match = itemRegex.exec(xml)) !== null && episodes.length < maxEpisodes) {
    const block = match[1];
    const title = stripCdata(extractTag(block, 'title') || '');
    const description = stripCdata(extractTag(block, 'description') || extractTag(block, 'itunes:summary') || '').replace(/<[^>]*>/g, '').slice(0, 300);
    const pubDate = extractTag(block, 'pubDate') || '';
    const duration = extractTag(block, 'itunes:duration') || '';
    const episodeUrl = extractTag(block, 'link') || '';

    // Extract audio URL from enclosure
    const enclosureMatch = block.match(/<enclosure[^>]+url=["']([^"']+)["']/i);
    const audioUrl = enclosureMatch?.[1] || '';

    // Extract episode image if available
    const imgMatch = block.match(/<itunes:image[^>]+href=["']([^"']+)["']/i);

    if (title) {
      episodes.push({
        id: `ep-${Date.now()}-${episodes.length}`,
        title,
        description,
        audioUrl,
        duration: formatDuration(duration),
        pubDate,
        podcastName,
        podcastImage: imgMatch?.[1] || podcastImage,
        episodeUrl,
      });
    }
  }

  return episodes;
}

function extractTag(xml: string, tag: string): string | null {
  const re = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i');
  const m = xml.match(re);
  return m ? m[1] : null;
}

function stripCdata(s: string): string {
  return s.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1').trim();
}

function formatDuration(d: string): string {
  if (!d) return '';
  // If it's already HH:MM:SS or MM:SS, return as-is
  if (d.includes(':')) return d;
  // If it's seconds, convert
  const secs = parseInt(d, 10);
  if (isNaN(secs)) return d;
  const mins = Math.floor(secs / 60);
  const hrs = Math.floor(mins / 60);
  if (hrs > 0) return `${hrs}:${String(mins % 60).padStart(2, '0')}:${String(secs % 60).padStart(2, '0')}`;
  return `${mins}:${String(secs % 60).padStart(2, '0')}`;
}

// ── Fetch a single RSS feed ─────────────────────────────────────────────
async function fetchFeed(feed: { name: string; url: string; image?: string }): Promise<PodcastEpisode[]> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    const resp = await fetch(feed.url, {
      signal: controller.signal,
      headers: { 'User-Agent': 'NevadaPoliticsBot/1.0' },
    });
    clearTimeout(timeout);

    if (!resp.ok) {
      console.warn(`Podcast feed ${feed.name} returned ${resp.status}`);
      return [];
    }

    const xml = await resp.text();

    // Try to extract podcast-level image
    const channelImgMatch = xml.match(/<itunes:image[^>]+href=["']([^"']+)["']/i);
    const image = feed.image || channelImgMatch?.[1] || '';

    return parseEpisodes(xml, feed.name, image);
  } catch (e) {
    console.warn(`Podcast feed ${feed.name} failed:`, e);
    return [];
  }
}

// ── Main handler ────────────────────────────────────────────────────────
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Resolve iTunes feeds + use direct feeds
    const itunesFeeds = await resolveItunesFeeds();
    const allFeeds = [
      ...itunesFeeds.map(f => ({ name: f.name, url: f.url, image: f.image })),
      ...DIRECT_FEEDS.map(f => ({ name: f.name, url: f.url, image: '' })),
    ];

    console.log(`Fetching ${allFeeds.length} podcast feeds`);

    const results = await Promise.all(allFeeds.map(fetchFeed));
    const allEpisodes = results.flat();

    // Sort by publication date (newest first)
    allEpisodes.sort((a, b) => {
      const da = new Date(a.pubDate).getTime() || 0;
      const db = new Date(b.pubDate).getTime() || 0;
      return db - da;
    });

    console.log(`Found ${allEpisodes.length} total episodes`);

    return new Response(
      JSON.stringify({ success: true, episodes: allEpisodes }),
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
