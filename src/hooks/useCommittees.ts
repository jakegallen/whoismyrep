import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface Committee {
  id: string;
  name: string;
  chamber: "Senate" | "Assembly" | "Joint";
  memberCount: number;
  members: { name: string; role: string }[];
}

export interface CommitteeBill {
  id: string;
  identifier: string;
  title: string;
  chamber: string;
  lastAction: string;
  lastActionDate: string;
  committeeRef: string;
}

interface CommitteesResponse {
  success: boolean;
  committees: Committee[];
  legislatorCommittees: string[];
  recentBills: CommitteeBill[];
  session: string;
  error?: string;
}

export function useCommittees(chamber?: string, legislatorName?: string) {
  return useQuery<CommitteesResponse>({
    queryKey: ["committees", chamber, legislatorName],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("fetch-committees", {
        body: { chamber, legislatorName },
      });
      if (error) throw new Error(error.message);
      if (!data?.success) throw new Error(data?.error || "Failed to fetch committees");
      return data;
    },
    staleTime: 1000 * 60 * 10,
  });
}
