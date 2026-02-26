import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type LobbyingEndpoint = "filings" | "registrants" | "clients" | "lobbyists";

export interface LobbyingFiling {
  id: string;
  filingType: string;
  filingYear: string;
  filingPeriod: string;
  datePosted: string;
  registrant: string;
  registrantId: string;
  registrantDescription: string;
  client: string;
  clientId: string;
  clientState: string;
  clientCountry: string;
  clientDescription: string;
  amount: number | null;
  lobbyists: { name: string; coveredPosition: string }[];
  issues: { generalIssue: string; description: string }[];
  url: string;
}

interface LobbyingResponse {
  success: boolean;
  items: any[];
  total: number;
  page: number;
  totalPages: number;
  error?: string;
}

export function useLobbying(
  endpoint: LobbyingEndpoint = "filings",
  options?: {
    search?: string;
    page?: number;
    filing_year?: number;
    filing_type?: string;
    registrant_name?: string;
    client_name?: string;
  }
) {
  const { search, page = 1, filing_year, filing_type, registrant_name, client_name } = options || {};

  return useQuery<LobbyingResponse>({
    queryKey: ["lobbying", endpoint, search, page, filing_year, filing_type, registrant_name, client_name],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("fetch-lobbying", {
        body: { endpoint, search, page, filing_year, filing_type, registrant_name, client_name },
      });
      if (error) throw error;
      return data as LobbyingResponse;
    },
    staleTime: 5 * 60 * 1000,
  });
}
