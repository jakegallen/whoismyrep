import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type CongressEndpoint = "bills" | "members" | "member_bills" | "committee_reports" | "nominations" | "bill_detail";

export interface CongressBill {
  congress: number;
  number: string;
  type: string;
  title: string;
  introducedDate: string;
  updateDate: string;
  originChamber: string;
  latestAction: { actionDate?: string; text?: string };
  url: string;
}

export interface CongressMember {
  bioguideId: string;
  name: string;
  party: string;
  state: string;
  district: number | null;
  chamber: string;
  url: string;
  depiction: { imageUrl?: string; attribution?: string };
}

export interface CommitteeReport {
  citation: string;
  number: string;
  type: string;
  title: string;
  congress: string;
  chamber: string;
  updateDate: string;
  url: string;
}

export interface Nomination {
  number: string;
  congress: string;
  description: string;
  receivedDate: string;
  latestAction: { actionDate?: string; text?: string };
  url: string;
}

interface CongressResponse {
  success: boolean;
  items?: any[];
  bill?: any;
  pagination?: { count?: number; next?: string };
  error?: string;
}

export function useCongress(
  endpoint: CongressEndpoint = "bills",
  options?: { search?: string; congress?: number; limit?: number; offset?: number; billType?: string; billNumber?: string }
) {
  const { search, congress, limit = 20, offset = 0, billType, billNumber } = options || {};

  return useQuery<CongressResponse>({
    queryKey: ["congress", endpoint, search, congress, limit, offset, billType, billNumber],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("fetch-congress", {
        body: { endpoint, search, congress, limit, offset, billType, billNumber },
      });
      if (error) throw error;
      return data as CongressResponse;
    },
    staleTime: 5 * 60 * 1000,
  });
}
