export interface Donor {
  name: string;
  amount: number;
  type: "Individual" | "PAC" | "Corporation" | "Union" | "Self";
}

export interface SpendingCategory {
  category: string;
  amount: number;
  color: string;
}

export interface FundraisingMonth {
  month: string;
  raised: number;
  spent: number;
}

export interface CampaignFinanceData {
  totalRaised: number;
  totalSpent: number;
  cashOnHand: number;
  cycle: string;
  topDonors: Donor[];
  spendingBreakdown: SpendingCategory[];
  fundraisingTrend: FundraisingMonth[];
}

const donorTypes: Donor["type"][] = ["Individual", "PAC", "Corporation", "Union", "Self"];

const donorNames: Record<string, string[]> = {
  Democrat: [
    "EMILY's List", "League of Conservation Voters", "Planned Parenthood Action",
    "SEIU COPE", "AFL-CIO", "NextGen Climate Action", "Everytown for Gun Safety",
    "American Federation of Teachers", "National Education Association", "Sierra Club",
    "Culinary Workers Union Local 226", "IBEW Local 357", "Nevada State AFL-CIO",
    "Clark County Education Association", "Democratic Senatorial Campaign Cmte",
  ],
  Republican: [
    "National Rifle Association", "U.S. Chamber of Commerce", "Koch Industries",
    "Senate Leadership Fund", "Club for Growth", "National Assoc. of Realtors",
    "American Medical Association", "Las Vegas Sands Corp", "Wynn Resorts",
    "Nevada Mining Association", "National Right to Life", "Republican Governors Assn",
    "Freedom Partners", "Nevada Resort Association", "Boyd Gaming Corp",
  ],
  Independent: [
    "No Labels", "Forward Party", "Unite America", "Represent.Us",
    "Issue One", "Independent Voter Project", "Centrist Project",
    "Nevada Independents PAC", "Business Forward", "Common Ground Committee",
  ],
  Nonpartisan: [
    "Local Business Coalition", "Community Leaders PAC", "Nevada Civic Fund",
    "Citizens for Accountability", "Good Government PAC", "Neighborhood Alliance",
  ],
};

const spendingCategories = [
  { category: "Media & Advertising", color: "hsl(0, 72%, 51%)" },
  { category: "Staff & Consultants", color: "hsl(210, 80%, 55%)" },
  { category: "Fundraising", color: "hsl(142, 71%, 45%)" },
  { category: "Travel & Events", color: "hsl(43, 90%, 55%)" },
  { category: "Communications", color: "hsl(280, 60%, 55%)" },
  { category: "Polling & Research", color: "hsl(190, 70%, 50%)" },
  { category: "Administrative", color: "hsl(15, 80%, 55%)" },
];

function seededRandom(seed: string): () => number {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    const char = seed.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return () => {
    hash = (hash * 16807) % 2147483647;
    return (hash & 0x7fffffff) / 0x7fffffff;
  };
}

const levelMultiplier: Record<string, number> = {
  federal: 1,
  state: 0.15,
  county: 0.04,
  local: 0.02,
};

export function getCampaignFinance(
  politicianId: string,
  party: string,
  level: string
): CampaignFinanceData {
  const rand = seededRandom(politicianId + "-finance");
  const mult = levelMultiplier[level] || 0.1;

  // Total raised scales by office level
  const baseRaised = (800000 + rand() * 4200000) * mult;
  const totalRaised = Math.round(baseRaised);
  const totalSpent = Math.round(totalRaised * (0.6 + rand() * 0.3));
  const cashOnHand = totalRaised - totalSpent;

  // Top donors
  const partyDonors = donorNames[party] || donorNames.Independent;
  const topDonors: Donor[] = partyDonors
    .slice(0, 8 + Math.floor(rand() * 4))
    .map((name) => ({
      name,
      amount: Math.round((5000 + rand() * 45000) * mult),
      type: donorTypes[Math.floor(rand() * donorTypes.length)],
    }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 10);

  // Spending breakdown
  const rawSpending = spendingCategories.map((cat) => ({
    ...cat,
    amount: Math.round(rand() * 100),
  }));
  const spendingTotal = rawSpending.reduce((s, c) => s + c.amount, 0);
  const spendingBreakdown = rawSpending.map((c) => ({
    ...c,
    amount: Math.round((c.amount / spendingTotal) * totalSpent),
  }));

  // Fundraising trend (12 months)
  const months = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
  ];
  const fundraisingTrend: FundraisingMonth[] = months.map((month, i) => {
    // Create realistic seasonal pattern — more activity in Q3/Q4
    const seasonal = i >= 6 ? 1.3 + rand() * 0.5 : 0.6 + rand() * 0.6;
    const raised = Math.round((totalRaised / 12) * seasonal);
    const spent = Math.round(raised * (0.5 + rand() * 0.5));
    return { month, raised, spent };
  });

  return {
    totalRaised,
    totalSpent,
    cashOnHand,
    cycle: "2025-2026",
    topDonors,
    spendingBreakdown,
    fundraisingTrend,
  };
}

export function formatCurrency(amount: number): string {
  if (amount >= 1000000) return `$${(amount / 1000000).toFixed(1)}M`;
  if (amount >= 1000) return `$${(amount / 1000).toFixed(0)}K`;
  return `$${amount.toLocaleString()}`;
}
