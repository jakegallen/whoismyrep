import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface VoteDetail {
  billId: string;
  billNumber: string;
  billTitle: string;
  date: string;
  motion: string;
  vote: "Yes" | "No" | "Abstain" | "Not Voting";
  result: "Passed" | "Failed" | "Pending";
  yesCount: number;
  noCount: number;
  abstainCount: number;
}

export interface VotingSummary {
  totalVotes: number;
  yesVotes: number;
  noVotes: number;
  abstainVotes: number;
  notVoting: number;
  attendance: number;
  partyLineRate: number;
  session: string;
  legislatorName: string;
  party: string;
  chamber: string;
}

interface VotingRecordsResponse {
  success: boolean;
  votes: VoteDetail[];
  summary: VotingSummary;
  total: number;
  legislatorFound: boolean;
  error?: string;
}

export function useVotingRecords(legislatorName: string | undefined, chamber?: string) {
  return useQuery<VotingRecordsResponse>({
    queryKey: ["voting-records", legislatorName, chamber],
    queryFn: async () => {
      if (!legislatorName) throw new Error("No legislator name");
      const { data, error } = await supabase.functions.invoke("fetch-voting-records", {
        body: { legislatorName, chamber },
      });
      if (error) throw new Error(error.message);
      if (!data?.success) throw new Error(data?.error || "Failed to fetch voting records");
      return data;
    },
    enabled: !!legislatorName,
    staleTime: 10 * 60 * 1000, // 10 min
  });
}
