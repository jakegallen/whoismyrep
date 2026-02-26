import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type CourtCaseType = "opinions" | "dockets" | "oral_arguments";

export interface CourtCase {
  id: string;
  caseName: string;
  court: string;
  courtId: string;
  dateFiled: string;
  dateArgued: string;
  status: string;
  docketNumber: string;
  suitNature: string;
  url: string;
  snippet: string;
  citation: string;
  judge: string;
  caseType: string;
}

interface CourtCasesResponse {
  success: boolean;
  cases: CourtCase[];
  total: number;
  page: number;
  totalPages: number;
  error?: string;
}

export function useCourtCases(type: CourtCaseType = "opinions", search?: string, page = 1) {
  return useQuery<CourtCasesResponse>({
    queryKey: ["court-cases", type, search, page],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("fetch-court-cases", {
        body: { type, search, page, per_page: 20 },
      });
      if (error) throw error;
      return data as CourtCasesResponse;
    },
    staleTime: 5 * 60 * 1000,
  });
}
