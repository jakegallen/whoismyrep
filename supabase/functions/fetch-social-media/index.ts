const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// Nevada political X/Twitter accounts — username : display name
const NEVADA_ACCOUNTS: Record<string, string> = {
  // Federal Officials
  'GovLombardo': 'Gov. Joe Lombardo',
  'SenCortezMasto': 'Sen. Catherine Cortez Masto',
  'SenJackyRosen': 'Sen. Jacky Rosen',
  'RepHorsford': 'Rep. Steven Horsford',
  'RepSusieLee': 'Rep. Susie Lee',
  'RepMarkAmodei': 'Rep. Mark Amodei',
  'RepDinaTitus': 'Rep. Dina Titus',
  // State Legislature
  'NevadaLeg': 'Nevada Legislature',
  'Nicole4Nevada': 'State Sen. Nicole Cannizzaro',
  // State Officials
  'AaronDFordNV': 'AG Aaron Ford',
  'NVSoS': 'NV Secretary of State',
  // County & City
  'ClarkCountyNV': 'Clark County, NV',
  'CityOfLasVegas': 'City of Las Vegas',
  'CityofReno': 'City of Reno',
  'CityOfHenderson': 'City of Henderson',
  // Political Media & Orgs
  'LasVegasLocally': 'Las Vegas Locally',
  'TheNVIndy': 'Nevada Independent',
  'RalstonReports': 'Jon Ralston',
  'NVDems': 'Nevada Dems',
  'NevadaGOP': 'Nevada GOP',
  'CulinaryUnion': 'Culinary Union 226',
};

interface Tweet {
  id: string;
  text: string;
  created_at?: string;
  public_metrics?: {
    like_count: number;
    retweet_count: number;
    reply_count: number;
  };
  author_id?: string;
}

interface TwitterUser {
  id: string;
  name: string;
  username: string;
  profile_image_url?: string;
}

// --- OAuth 2.0 App-Only Bearer Token ---

async function getBearerToken(consumerKey: string, consumerSecret: string): Promise<string> {
  const credentials = btoa(`${encodeURIComponent(consumerKey)}:${encodeURIComponent(consumerSecret)}`);

  const resp = await fetch('https://api.x.com/oauth2/token', {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
    },
    body: 'grant_type=client_credentials',
  });

  if (!resp.ok) {
    const errText = await resp.text();
    throw new Error(`Failed to get bearer token: ${resp.status} ${errText}`);
  }

  const data = await resp.json();
  return data.access_token;
}

// --- Twitter API v2 Helpers ---

async function fetchUsersByUsernames(
  usernames: string[],
  bearerToken: string
): Promise<TwitterUser[]> {
  const baseUrl = 'https://api.x.com/2/users/by';
  const params = new URLSearchParams({
    usernames: usernames.join(','),
    'user.fields': 'profile_image_url',
  });

  const resp = await fetch(`${baseUrl}?${params}`, {
    headers: { Authorization: `Bearer ${bearerToken}` },
  });

  if (!resp.ok) {
    const errText = await resp.text();
    console.error(`Failed to fetch users: ${resp.status} ${errText}`);
    return [];
  }

  const data = await resp.json();
  return data.data ?? [];
}

async function fetchUserTweets(
  userId: string,
  bearerToken: string,
  maxResults = 5
): Promise<Tweet[]> {
  const baseUrl = `https://api.x.com/2/users/${userId}/tweets`;
  const params = new URLSearchParams({
    max_results: String(maxResults),
    'tweet.fields': 'created_at,public_metrics,author_id',
    exclude: 'retweets,replies',
  });

  const resp = await fetch(`${baseUrl}?${params}`, {
    headers: { Authorization: `Bearer ${bearerToken}` },
  });

  if (!resp.ok) {
    const errText = await resp.text();
    console.warn(`Failed to fetch tweets for user ${userId}: ${resp.status} ${errText}`);
    return [];
  }

  const data = await resp.json();
  return data.data ?? [];
}

function formatEngagement(metrics?: Tweet['public_metrics']): string {
  if (!metrics) return '';
  const parts: string[] = [];
  if (metrics.like_count > 0) parts.push(`${formatCount(metrics.like_count)} likes`);
  if (metrics.retweet_count > 0) parts.push(`${formatCount(metrics.retweet_count)} RTs`);
  if (metrics.reply_count > 0) parts.push(`${formatCount(metrics.reply_count)} replies`);
  return parts.join(' · ') || '0 likes';
}

function formatCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

// --- Main Handler ---

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const consumerKey = Deno.env.get('TWITTER_CONSUMER_KEY');
    const consumerSecret = Deno.env.get('TWITTER_CONSUMER_SECRET');

    if (!consumerKey || !consumerSecret) {
      return new Response(
        JSON.stringify({ success: true, posts: [] }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get App-Only Bearer Token
    console.log('Obtaining bearer token...');
    const bearerToken = await getBearerToken(consumerKey, consumerSecret);
    console.log('Bearer token obtained');

    // Batch lookup all users at once
    const usernames = Object.keys(NEVADA_ACCOUNTS);
    const users = await fetchUsersByUsernames(usernames, bearerToken);
    console.log(`Resolved ${users.length} users out of ${usernames.length}`);

    const allPosts: Array<{
      id: string;
      platform: 'twitter';
      author: string;
      handle: string;
      content: string;
      url: string;
      timestamp: string;
      engagement: string;
      avatarUrl?: string;
    }> = [];

    // Fetch tweets for each user sequentially to respect rate limits
    for (const user of users) {
      try {
        const tweets = await fetchUserTweets(user.id, bearerToken, 5);

        for (const tweet of tweets) {
          allPosts.push({
            id: `x-${tweet.id}`,
            platform: 'twitter',
            author: user.name,
            handle: `@${user.username}`,
            content: tweet.text,
            url: `https://x.com/${user.username}/status/${tweet.id}`,
            timestamp: tweet.created_at || new Date().toISOString(),
            engagement: formatEngagement(tweet.public_metrics),
            avatarUrl: user.profile_image_url?.replace('_normal', '_200x200'),
          });
        }
      } catch (e) {
        console.warn(`Error processing @${user.username}:`, e);
      }
    }

    // Sort by timestamp descending (newest first)
    allPosts.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    console.log(`Fetched ${allPosts.length} tweets total`);

    return new Response(
      JSON.stringify({ success: true, posts: allPosts }),
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
