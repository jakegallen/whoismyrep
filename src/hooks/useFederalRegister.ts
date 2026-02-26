import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type FederalDocType = "all" | "executive_orders" | "rules" | "proposed_rules" | "notices";

export interface FederalDocument {
  id: string;
  title: string;
  type: string;
  abstract: string;
  publicationDate: string;
  agencies: string[];
  url: string;
  pdfUrl: string;
  citation: string;
  documentNumber: string;
  signingDate: string;
  president: string;
  significantDocument: boolean;
  topics: string[];
  subtype: string;
}

interface FederalRegisterResponse {
  success: boolean;
  documents: FederalDocument[];
  total: number;
  page: number;
  totalPages: number;
  error?: string;
}

export function useFederalRegister(type: FederalDocType = "all", search?: string, page = 1) {
  return useQuery<FederalRegisterResponse>({
    queryKey: ["federal-register", type, search, page],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("fetch-federal-register", {
        body: { type, search, page, per_page: 20 },
      });
      if (error) throw error;
      return data as FederalRegisterResponse;
    },
    staleTime: 5 * 60 * 1000,
  });
}
