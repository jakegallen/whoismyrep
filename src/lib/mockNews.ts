export type NewsCategory = "law" | "policy" | "politician" | "social";

export interface NewsItem {
  id: string;
  title: string;
  summary: string;
  category: NewsCategory;
  source: string;
  date: string;
  timeAgo: string;
  isBreaking?: boolean;
  url?: string;
  imageUrl?: string;
}

export interface TrendingTopic {
  id: string;
  topic: string;
  mentions: number;
  trend: "up" | "down" | "stable";
}

export interface TrendingIndividual {
  id: string;
  name: string;
  title: string;
  mentions: number;
  trend: "up" | "down" | "stable";
}

export const categoryLabels: Record<NewsCategory, string> = {
  law: "Laws & Legislation",
  policy: "Policy",
  politician: "Politicians",
  social: "Social Media",
};

export const mockNews: NewsItem[] = [
  {
    id: "1",
    title: "Nevada Legislature Passes Landmark Water Conservation Bill",
    summary: "The new bill mandates 20% reduction in water usage for commercial properties across Clark County by 2028, with hefty penalties for non-compliance.",
    category: "law",
    source: "Nevada Independent",
    date: "2026-02-25",
    timeAgo: "2 hours ago",
    isBreaking: true,
  },
  {
    id: "2",
    title: "Las Vegas Mayor Pushes for Expanded Public Transit Network",
    summary: "Mayor proposes $2.1 billion transit expansion including new light rail connecting the Strip to downtown Henderson and North Las Vegas.",
    category: "politician",
    source: "Las Vegas Review-Journal",
    date: "2026-02-25",
    timeAgo: "4 hours ago",
  },
  {
    id: "3",
    title: "Controversial Zoning Policy Sparks Debate in Henderson",
    summary: "A proposed rezoning of 500 acres near Lake Mead for mixed-use development has drawn sharp criticism from environmental groups and residents.",
    category: "policy",
    source: "KLAS 8 News Now",
    date: "2026-02-24",
    timeAgo: "8 hours ago",
  },
  {
    id: "4",
    title: "State Senator's Tweet on Education Funding Goes Viral",
    summary: "Senator Martinez's thread criticizing the governor's education budget proposal has been shared over 50,000 times, igniting fierce online debate.",
    category: "social",
    source: "X / Twitter",
    date: "2026-02-24",
    timeAgo: "12 hours ago",
  },
  {
    id: "5",
    title: "New Gaming Regulation Bill Introduced in Carson City",
    summary: "The bill would require all Nevada casinos to implement AI-powered responsible gambling tools and report monthly compliance data.",
    category: "law",
    source: "Nevada Appeal",
    date: "2026-02-24",
    timeAgo: "1 day ago",
  },
  {
    id: "6",
    title: "Clark County Commission Approves Affordable Housing Initiative",
    summary: "The $450 million initiative will fund construction of 3,000 affordable housing units across the Las Vegas metropolitan area over 5 years.",
    category: "policy",
    source: "Las Vegas Sun",
    date: "2026-02-23",
    timeAgo: "1 day ago",
  },
  {
    id: "7",
    title: "Governor's Immigration Stance Draws National Attention",
    summary: "Governor's executive order on state-level immigration enforcement cooperation has drawn both praise and criticism from national political figures.",
    category: "politician",
    source: "AP News",
    date: "2026-02-23",
    timeAgo: "2 days ago",
  },
  {
    id: "8",
    title: "Reddit Thread Exposes Lobbyist Ties to Energy Policy",
    summary: "A detailed investigative post on r/Nevada reveals connections between fossil fuel lobbyists and recent energy deregulation proposals.",
    category: "social",
    source: "Reddit",
    date: "2026-02-22",
    timeAgo: "3 days ago",
  },
];

export const trendingTopics: TrendingTopic[] = [
  { id: "1", topic: "Water Rights", mentions: 2340, trend: "up" },
  { id: "2", topic: "Strip Transit", mentions: 1890, trend: "up" },
  { id: "3", topic: "Education Budget", mentions: 1560, trend: "stable" },
  { id: "4", topic: "Gaming Reform", mentions: 1230, trend: "up" },
  { id: "5", topic: "Housing Crisis", mentions: 980, trend: "down" },
  { id: "6", topic: "Immigration EO", mentions: 870, trend: "up" },
];

export const mockTrendingIndividuals: TrendingIndividual[] = [
  { id: "1", name: "Joe Lombardo", title: "Governor", mentions: 2100, trend: "up" },
  { id: "2", name: "Catherine Cortez Masto", title: "U.S. Senator", mentions: 1750, trend: "stable" },
  { id: "3", name: "Jacky Rosen", title: "U.S. Senator", mentions: 1420, trend: "up" },
  { id: "4", name: "Shelley Berkley", title: "Mayor of Las Vegas", mentions: 1180, trend: "up" },
  { id: "5", name: "Zach Conine", title: "State Treasurer", mentions: 960, trend: "up" },
  { id: "6", name: "Steven Horsford", title: "U.S. Representative", mentions: 740, trend: "down" },
];
