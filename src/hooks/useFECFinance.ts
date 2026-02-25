import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface FECCandidate {
  id: string;
  name: string;
  party: string;
  office: string;
  state: string;
  district: string;
  electionYears: number[];
  incumbentChallenger: string;
}

export interface FECTotals {
  cycle: number;
  receipts: number;
  disbursements: number;
  cashOnHand: number;
  debts: number;
  individualContributions: number;
  pacContributions: number;
  partyContributions: number;
  candidateContributions: number;
  smallDonorTotal: number;
  lastReportDate: string;
}

export interface DonorBySize {
  size: number;
  total: number;
  count: number;
  cycle: number;
}

export interface TopEmployer {
  employer: string;
  total: number;
  count: number;
}

export interface DisbursementByPurpose {
  purpose: string;
  total: number;
  count: number;
}

export interface FECResponse {
  success: boolean;
  candidate: FECCandidate | null;
  totals: FECTotals[];
  donorsBySize: DonorBySize[];
  topEmployers: TopEmployer[];
  disbursementsByPurpose: DisbursementByPurpose[];
  error?: string;
}

export function useFECFinance(
  candidateName?: string,
  candidateId?: string,
  office?: string,
  cycle?: number
) {
  return useQuery<FECResponse>({
    queryKey: ["fec-finance", candidateName, candidateId, office, cycle],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("fetch-fec-data", {
        body: { candidateName, candidateId, state: "NV", office, cycle },
      });
      if (error) throw new Error(error.message);
      if (!data?.success) throw new Error(data?.error || "Failed to fetch FEC data");
      return data;
    },
    enabled: !!(candidateName || candidateId),
    staleTime: 1000 * 60 * 30,
  });
}

export function formatUSD(amount: number): string {
  if (amount >= 1_000_000) return `$${(amount / 1_000_000).toFixed(1)}M`;
  if (amount >= 1_000) return `$${(amount / 1_000).toFixed(0)}K`;
  return `$${amount.toLocaleString()}`;
}

const SIZE_LABELS: Record<number, string> = {
  0: "Unitemized (<$200)",
  200: "$200–$499",
  500: "$500–$999",
  1000: "$1,000–$1,999",
  2000: "$2,000+",
};

export function getSizeLabel(size: number): string {
  return SIZE_LABELS[size] || `$${size}+`;
}
