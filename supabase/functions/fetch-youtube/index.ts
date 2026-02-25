const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// Nevada political YouTube channels – free RSS, no API key needed
const CHANNELS = [
  { id: 'UCKk6TkLfOoXs2T4vfvdGlnw', name: 'Las Vegas Review-Journal' },
  { id: 'UCb3BAc46bbny8Ayr-IfHmUw', name: 'Nevada Newsmakers' },
  { id: 'UC-k1jpdoDwTC475c1CX9cEA', name: 'Nevada State Legislature' },
  // TheNevadaIndependent uses a custom URL; we resolve the channel ID from the feed
  { handle: 'TheNevadaIndependent', name: 'The Nevada Independent' },
  { handle: 'NVWarRoom', name: 'Nevada War Room' },
];

interface YouTubeVideo {
  id: string;
  videoId: string;
  title: string;
  description: string;
  thumbnail: string;
  pubDate: string;
  channelName: string;
  url: string;
}

function extractTag(xml: string, tag: string): string | null {
  const re = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i');
  const m = xml.match(re);
  return m ? m[1].trim() : null;
}

function parseYouTubeFeed(xml: string, channelName: string): YouTubeVideo[] {
  const videos: YouTubeVideo[] = [];
  const entryRegex = /<entry>([\s\S]*?)<\/entry>/gi;
  let match: RegExpExecArray | null;

  while ((match = entryRegex.exec(xml)) !== null && videos.length < 5) {
    const block = match[1];

    const videoIdMatch = block.match(/<yt:videoId>([^<]+)<\/yt:videoId>/);
    const videoId = videoIdMatch?.[1] || '';
    const title = extractTag(block, 'title') || '';
    const published = extractTag(block, 'published') || '';

    // Description from media:group > media:description
    const mediaGroupMatch = block.match(/<media:group>([\s\S]*?)<\/media:group>/);
    const mediaGroup = mediaGroupMatch?.[1] || '';
    const description = extractTag(mediaGroup, 'media:description')?.slice(0, 300) || '';

    // Thumbnail
    const thumbMatch = mediaGroup.match(/<media:thumbnail[^>]+url=["']([^"']+)["']/);
    const thumbnail = thumbMatch?.[1] || (videoId ? `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg` : '');

    if (videoId && title) {
      videos.push({
        id: `yt-${videoId}`,
        videoId,
        title,
        description,
        thumbnail,
        pubDate: published,
        channelName,
        url: `https://www.youtube.com/watch?v=${videoId}`,
      });
    }
  }

  return videos;
}

async function fetchChannelFeed(feedUrl: string, channelName: string): Promise<YouTubeVideo[]> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    const resp = await fetch(feedUrl, { signal: controller.signal });
    clearTimeout(timeout);

    if (!resp.ok) {
      console.warn(`YouTube feed ${channelName} returned ${resp.status}`);
      return [];
    }

    const xml = await resp.text();
    return parseYouTubeFeed(xml, channelName);
  } catch (e) {
    console.warn(`YouTube feed ${channelName} failed:`, e);
    return [];
  }
}

// For handle-based channels, we try to resolve via the page or use a known pattern
async function resolveChannelId(handle: string): Promise<string | null> {
  try {
    const resp = await fetch(`https://www.youtube.com/@${handle}`, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      redirect: 'follow',
    });
    if (!resp.ok) return null;
    const html = await resp.text();
    // Look for channel_id in meta tags or canonical link
    const channelIdMatch = html.match(/channel_id=([A-Za-z0-9_-]+)/);
    if (channelIdMatch) return channelIdMatch[1];
    const externalIdMatch = html.match(/"externalId":"([A-Za-z0-9_-]+)"/);
    if (externalIdMatch) return externalIdMatch[1];
    return null;
  } catch {
    return null;
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Build feed URLs
    const feedPromises: Promise<YouTubeVideo[]>[] = [];

    for (const ch of CHANNELS) {
      if (ch.id) {
        const url = `https://www.youtube.com/feeds/videos.xml?channel_id=${ch.id}`;
        feedPromises.push(fetchChannelFeed(url, ch.name));
      } else if (ch.handle) {
        // Resolve handle → channel ID, then fetch feed
        feedPromises.push(
          resolveChannelId(ch.handle).then((resolvedId) => {
            if (!resolvedId) {
              console.warn(`Could not resolve channel ID for @${ch.handle}`);
              return [];
            }
            const url = `https://www.youtube.com/feeds/videos.xml?channel_id=${resolvedId}`;
            return fetchChannelFeed(url, ch.name);
          })
        );
      }
    }

    const results = await Promise.all(feedPromises);
    const allVideos = results.flat();

    // Sort newest first
    allVideos.sort((a, b) => {
      const da = new Date(a.pubDate).getTime() || 0;
      const db = new Date(b.pubDate).getTime() || 0;
      return db - da;
    });

    console.log(`Found ${allVideos.length} YouTube videos`);

    return new Response(
      JSON.stringify({ success: true, videos: allVideos }),
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
