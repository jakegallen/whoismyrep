// Curated Nevada polling data — swap for a real API when available

export interface ApprovalRating {
  politicianId: string;
  name: string;
  party: "Democrat" | "Republican" | "Independent";
  title: string;
  approve: number;
  disapprove: number;
  unsure: number;
  source: string;
  date: string;
  trend: "up" | "down" | "stable";
}

export interface RacePolling {
  raceId: string;
  raceLabel: string;
  candidates: {
    name: string;
    party: "Democrat" | "Republican" | "Independent" | "Nonpartisan";
    polling: number;
  }[];
  source: string;
  date: string;
  margin: number; // positive = first candidate leads
  sampleSize?: number;
}

export const approvalRatings: ApprovalRating[] = [
  {
    politicianId: "cortez-masto",
    name: "Catherine Cortez Masto",
    party: "Democrat",
    title: "U.S. Senator",
    approve: 44,
    disapprove: 41,
    unsure: 15,
    source: "Nevada Independent/OH Predictive",
    date: "2026-02-10",
    trend: "stable",
  },
  {
    politicianId: "rosen",
    name: "Jacky Rosen",
    party: "Democrat",
    title: "U.S. Senator",
    approve: 46,
    disapprove: 38,
    unsure: 16,
    source: "Nevada Independent/OH Predictive",
    date: "2026-02-10",
    trend: "up",
  },
  {
    politicianId: "lombardo",
    name: "Joe Lombardo",
    party: "Republican",
    title: "Governor",
    approve: 42,
    disapprove: 44,
    unsure: 14,
    source: "Nevada Independent/OH Predictive",
    date: "2026-02-10",
    trend: "down",
  },
  {
    politicianId: "horsford",
    name: "Steven Horsford",
    party: "Democrat",
    title: "U.S. Representative (CD-4)",
    approve: 39,
    disapprove: 35,
    unsure: 26,
    source: "AARP Nevada Poll",
    date: "2026-01-25",
    trend: "stable",
  },
  {
    politicianId: "lee-susie",
    name: "Susie Lee",
    party: "Democrat",
    title: "U.S. Representative (CD-3)",
    approve: 41,
    disapprove: 37,
    unsure: 22,
    source: "AARP Nevada Poll",
    date: "2026-01-25",
    trend: "up",
  },
  {
    politicianId: "amodei",
    name: "Mark Amodei",
    party: "Republican",
    title: "U.S. Representative (CD-2)",
    approve: 43,
    disapprove: 34,
    unsure: 23,
    source: "AARP Nevada Poll",
    date: "2026-01-25",
    trend: "stable",
  },
  {
    politicianId: "titus",
    name: "Dina Titus",
    party: "Democrat",
    title: "U.S. Representative (CD-1)",
    approve: 40,
    disapprove: 36,
    unsure: 24,
    source: "AARP Nevada Poll",
    date: "2026-01-25",
    trend: "stable",
  },
  {
    politicianId: "ford-aaron",
    name: "Aaron Ford",
    party: "Democrat",
    title: "Attorney General",
    approve: 38,
    disapprove: 40,
    unsure: 22,
    source: "Nevada Independent/OH Predictive",
    date: "2026-02-10",
    trend: "down",
  },
];

export const racePolling: RacePolling[] = [
  {
    raceId: "nv-governor",
    raceLabel: "Nevada Governor",
    candidates: [
      { name: "Aaron Ford", party: "Democrat", polling: 43 },
      { name: "Joe Lombardo", party: "Republican", polling: 45 },
    ],
    source: "Nevada Independent/OH Predictive",
    date: "2026-02-10",
    margin: -2,
    sampleSize: 1200,
  },
  {
    raceId: "nv-cd2",
    raceLabel: "NV Congressional District 2",
    candidates: [
      { name: "Mark Amodei", party: "Republican", polling: 52 },
      { name: "TBD", party: "Democrat", polling: 38 },
    ],
    source: "AARP Nevada Poll",
    date: "2026-01-25",
    margin: 14,
    sampleSize: 800,
  },
  {
    raceId: "nv-cd3",
    raceLabel: "NV Congressional District 3",
    candidates: [
      { name: "Susie Lee", party: "Democrat", polling: 47 },
      { name: "TBD", party: "Republican", polling: 44 },
    ],
    source: "AARP Nevada Poll",
    date: "2026-01-25",
    margin: 3,
    sampleSize: 800,
  },
  {
    raceId: "nv-cd4",
    raceLabel: "NV Congressional District 4",
    candidates: [
      { name: "Steven Horsford", party: "Democrat", polling: 48 },
      { name: "TBD", party: "Republican", polling: 42 },
    ],
    source: "AARP Nevada Poll",
    date: "2026-01-25",
    margin: 6,
    sampleSize: 800,
  },
];
