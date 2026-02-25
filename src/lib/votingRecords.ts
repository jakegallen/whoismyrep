export interface IssueGrade {
  issue: string;
  grade: string;
  score: number; // 0-100
  votesFor: number;
  votesAgainst: number;
  votesAbstain: number;
}

export interface KeyVote {
  billNumber: string;
  title: string;
  date: string;
  vote: "Yes" | "No" | "Abstain" | "Not Voting";
  result: "Passed" | "Failed" | "Pending";
}

export interface VotingRecord {
  politicianId: string;
  overallScore: number;
  issueGrades: IssueGrade[];
  keyVotes: KeyVote[];
  totalVotes: number;
  attendance: number; // percentage
}

function gradeFromScore(score: number): string {
  if (score >= 93) return "A+";
  if (score >= 90) return "A";
  if (score >= 87) return "A-";
  if (score >= 83) return "B+";
  if (score >= 80) return "B";
  if (score >= 77) return "B-";
  if (score >= 73) return "C+";
  if (score >= 70) return "C";
  if (score >= 67) return "C-";
  if (score >= 60) return "D";
  return "F";
}

function gradeColor(grade: string): string {
  if (grade.startsWith("A")) return "hsl(142, 71%, 45%)";
  if (grade.startsWith("B")) return "hsl(210, 80%, 55%)";
  if (grade.startsWith("C")) return "hsl(43, 90%, 55%)";
  if (grade.startsWith("D")) return "hsl(25, 95%, 53%)";
  return "hsl(0, 72%, 51%)";
}

export { gradeFromScore, gradeColor };

// Seed-based pseudo-random for consistent results per politician
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

const issueCategories = [
  "Education",
  "Healthcare",
  "Environment",
  "Public Safety",
  "Economy & Jobs",
  "Housing",
  "Civil Rights",
  "Infrastructure",
  "Tax Policy",
  "Immigration",
];

const sampleBills: { number: string; title: string; date: string; result: "Passed" | "Failed" }[] = [
  { number: "AB1", title: "Fort Mohave Valley Land Regulations", date: "2025-03-15", result: "Passed" },
  { number: "SB42", title: "Renewable Energy Standards Update", date: "2025-03-22", result: "Passed" },
  { number: "AB108", title: "Outdoor Education Grant Program", date: "2025-04-01", result: "Passed" },
  { number: "SB78", title: "Medicaid Expansion Provisions", date: "2025-04-10", result: "Failed" },
  { number: "AB165", title: "K-12 Funding Formula Revision", date: "2025-04-18", result: "Passed" },
  { number: "SB201", title: "Criminal Sentencing Reform", date: "2025-04-25", result: "Failed" },
  { number: "AB224", title: "Affordable Housing Tax Credits", date: "2025-05-02", result: "Passed" },
  { number: "SB155", title: "Water Conservation Standards", date: "2025-05-10", result: "Passed" },
  { number: "AB302", title: "Public Employee Collective Bargaining", date: "2025-05-15", result: "Failed" },
  { number: "SB290", title: "Cannabis Industry Regulations", date: "2025-05-20", result: "Passed" },
];

export function getVotingRecord(politicianId: string, keyIssues: string[], party: string): VotingRecord {
  const rand = seededRandom(politicianId);

  // Generate issue grades — politicians score higher on their key issues
  const issueGrades: IssueGrade[] = issueCategories.map((issue) => {
    const isKeyIssue = keyIssues.some(
      (ki) => issue.toLowerCase().includes(ki.toLowerCase().split(" ")[0]) ||
              ki.toLowerCase().includes(issue.toLowerCase().split(" ")[0])
    );

    // Key issues get higher scores
    const baseScore = isKeyIssue ? 75 + rand() * 20 : 50 + rand() * 40;
    const score = Math.round(Math.min(98, Math.max(35, baseScore)));
    const totalVotes = Math.round(8 + rand() * 12);
    const votesFor = Math.round(totalVotes * (score / 100));
    const votesAbstain = Math.round(rand() * 2);
    const votesAgainst = totalVotes - votesFor - votesAbstain;

    return {
      issue,
      grade: gradeFromScore(score),
      score,
      votesFor,
      votesAgainst: Math.max(0, votesAgainst),
      votesAbstain,
    };
  });

  // Generate key votes
  const keyVotes: KeyVote[] = sampleBills.map((bill) => {
    const r = rand();
    let vote: KeyVote["vote"];
    if (r > 0.15) {
      // Party-influenced voting
      const partyLean = party === "Democrat" ? 0.65 : 0.55;
      vote = rand() < partyLean ? "Yes" : "No";
    } else if (r > 0.05) {
      vote = "Abstain";
    } else {
      vote = "Not Voting";
    }

    return {
      billNumber: bill.number,
      title: bill.title,
      date: bill.date,
      vote,
      result: bill.result,
    };
  });

  const overallScore = Math.round(
    issueGrades.reduce((sum, g) => sum + g.score, 0) / issueGrades.length
  );

  return {
    politicianId,
    overallScore,
    issueGrades: issueGrades.sort((a, b) => b.score - a.score),
    keyVotes,
    totalVotes: Math.round(80 + rand() * 60),
    attendance: Math.round(85 + rand() * 14),
  };
}
