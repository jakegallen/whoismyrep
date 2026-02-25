export interface MidtermRace {
  id: string;
  office: string;
  level: "Federal" | "State";
  type: "Senate" | "House" | "Governor" | "State Legislature";
  district?: string;
  description: string;
  status: "Open Seat" | "Incumbent Running" | "Contested Primary";
  incumbent?: string;
  incumbentParty?: "Democrat" | "Republican" | "Independent";
  candidates: MidtermCandidate[];
}

export interface MidtermCandidate {
  name: string;
  party: "Democrat" | "Republican" | "Independent" | "Nonpartisan";
  isIncumbent?: boolean;
  polling?: number; // percentage
  raised?: number; // campaign funds in dollars
  bio: string;
}

export interface ElectionDate {
  date: string; // ISO date
  label: string;
  description: string;
  type: "deadline" | "primary" | "general" | "milestone";
}

export interface CandidateMatchup {
  raceId: string;
  raceLabel: string;
  candidates: [MidtermCandidate, MidtermCandidate];
  latestPoll?: { date: string; source: string };
}

// ─── Key dates ───────────────────────────────────────────────

export const electionCalendar: ElectionDate[] = [
  { date: "2025-11-01", label: "Candidate Filing Opens", description: "Candidates may begin filing declarations for 2026 races.", type: "milestone" },
  { date: "2026-01-15", label: "Voter Registration Drive", description: "Statewide push to register new voters before primaries.", type: "milestone" },
  { date: "2026-03-13", label: "Filing Deadline", description: "Last day for candidates to file for the 2026 primary election.", type: "deadline" },
  { date: "2026-05-23", label: "Early Voting Begins (Primary)", description: "In-person early voting starts for the primary election.", type: "primary" },
  { date: "2026-06-09", label: "Primary Election Day", description: "Nevada primary elections to determine party nominees.", type: "primary" },
  { date: "2026-10-17", label: "Voter Registration Deadline", description: "Last day to register to vote in the general election (mail/online).", type: "deadline" },
  { date: "2026-10-24", label: "Early Voting Begins (General)", description: "In-person early voting starts for the general election.", type: "general" },
  { date: "2026-11-03", label: "General Election Day", description: "2026 midterm general election.", type: "general" },
];

// ─── Races ───────────────────────────────────────────────────

export const midtermRaces: MidtermRace[] = [
  {
    id: "nv-senate",
    office: "U.S. Senate",
    level: "Federal",
    type: "Senate",
    description: "Catherine Cortez Masto's seat is up in 2028, but Jacky Rosen won re-election in 2024. No Nevada U.S. Senate seat is on the ballot in 2026 — this card tracks potential early declarations.",
    status: "Open Seat",
    candidates: [],
  },
  {
    id: "nv-cd1",
    office: "U.S. House — District 1",
    level: "Federal",
    type: "House",
    district: "NV-1",
    description: "Covers central Las Vegas. A reliably Democratic district.",
    status: "Incumbent Running",
    incumbent: "Dina Titus",
    incumbentParty: "Democrat",
    candidates: [
      { name: "Dina Titus", party: "Democrat", isIncumbent: true, polling: 54, raised: 1_200_000, bio: "Six-term incumbent, senior member of the Transportation Committee." },
      { name: "Mark Robertson", party: "Republican", polling: 40, raised: 650_000, bio: "Army veteran and businessman running on border security and fiscal restraint." },
    ],
  },
  {
    id: "nv-cd2",
    office: "U.S. House — District 2",
    level: "Federal",
    type: "House",
    district: "NV-2",
    description: "Spans northern Nevada including Reno and rural counties. A Republican-leaning seat.",
    status: "Incumbent Running",
    incumbent: "Mark Amodei",
    incumbentParty: "Republican",
    candidates: [
      { name: "Mark Amodei", party: "Republican", isIncumbent: true, polling: 58, raised: 980_000, bio: "Seven-term incumbent focused on public lands and water rights." },
      { name: "Greg Kidd", party: "Democrat", polling: 35, raised: 310_000, bio: "Tech entrepreneur and community advocate challenging from the left." },
    ],
  },
  {
    id: "nv-cd3",
    office: "U.S. House — District 3",
    level: "Federal",
    type: "House",
    district: "NV-3",
    description: "Covers Henderson and suburban Las Vegas. A competitive swing district.",
    status: "Incumbent Running",
    incumbent: "Susie Lee",
    incumbentParty: "Democrat",
    candidates: [
      { name: "Susie Lee", party: "Democrat", isIncumbent: true, polling: 48, raised: 1_500_000, bio: "Three-term incumbent, Appropriations Committee member focused on education." },
      { name: "Drew Johnson", party: "Republican", polling: 46, raised: 1_100_000, bio: "Policy analyst and columnist running on economy and parental rights." },
    ],
  },
  {
    id: "nv-cd4",
    office: "U.S. House — District 4",
    level: "Federal",
    type: "House",
    district: "NV-4",
    description: "Includes North Las Vegas and diverse suburban communities. Lean Democratic.",
    status: "Incumbent Running",
    incumbent: "Steven Horsford",
    incumbentParty: "Democrat",
    candidates: [
      { name: "Steven Horsford", party: "Democrat", isIncumbent: true, polling: 52, raised: 1_350_000, bio: "Four-term incumbent and Congressional Black Caucus member." },
      { name: "Sam Peters", party: "Republican", polling: 42, raised: 520_000, bio: "Air Force veteran campaigning on veterans' issues and small business." },
    ],
  },
  {
    id: "nv-gov",
    office: "Governor",
    level: "State",
    type: "Governor",
    description: "Governor Joe Lombardo is eligible to seek re-election in 2026. Early challengers are emerging.",
    status: "Incumbent Running",
    incumbent: "Joe Lombardo",
    incumbentParty: "Republican",
    candidates: [
      { name: "Joe Lombardo", party: "Republican", isIncumbent: true, polling: 47, raised: 3_200_000, bio: "Incumbent governor and former Clark County Sheriff." },
      { name: "Cisco Aguilar", party: "Democrat", polling: 44, raised: 1_800_000, bio: "Current Secretary of State, running on voting rights and government transparency." },
    ],
  },
  {
    id: "nv-state-senate",
    office: "State Senate (multiple seats)",
    level: "State",
    type: "State Legislature",
    description: "Odd-numbered state senate districts are up in 2026. Control of the chamber could shift.",
    status: "Contested Primary",
    candidates: [
      { name: "Multiple incumbents", party: "Democrat", bio: "Democrats currently hold a slim majority in the Nevada State Senate." },
      { name: "Multiple challengers", party: "Republican", bio: "Republicans are targeting suburban seats to flip the chamber." },
    ],
  },
];

// ─── Matchups ────────────────────────────────────────────────

export const candidateMatchups: CandidateMatchup[] = midtermRaces
  .filter((r) => r.candidates.length === 2)
  .map((r) => ({
    raceId: r.id,
    raceLabel: r.office,
    candidates: [r.candidates[0], r.candidates[1]] as [MidtermCandidate, MidtermCandidate],
    latestPoll: { date: "2026-02-15", source: "Nevada Independent / OH Predictive Insights" },
  }));
