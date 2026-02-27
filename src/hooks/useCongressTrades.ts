import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface CongressTrade {
  politician: string;
  party: string | null;
  state: string | null;
  district: string | null;
  chamber: "House" | "Senate";
  ticker: string | null;
  assetDescription: string;
  type: string;
  amount: string;
  transactionDate: string | null;
  disclosureDate: string | null;
  owner: string | null;
  source: string;
}

export interface TradesSummary {
  trades: CongressTrade[];
  total: number;
  purchaseCount: number;
  saleCount: number;
  topTraders: { name: string; tradeCount: number }[];
  topTickers: { symbol: string; tradeCount: number }[];
}

interface FetchParams {
  chamber?: "house" | "senate";
  politician?: string;
  ticker?: string;
  type?: string;
  limit?: number;
  offset?: number;
}

export function useCongressTrades(params: FetchParams = {}) {
  return useQuery<TradesSummary>({
    queryKey: ["congress-trades", params],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("fetch-congress-trades", {
        body: params,
      });
      if (error) throw new Error(error.message);
      if (!data?.success) throw new Error(data?.error || "Failed to fetch trades");
      return {
        trades: data.trades || [],
        total: data.total || 0,
        purchaseCount: data.purchaseCount || 0,
        saleCount: data.saleCount || 0,
        topTraders: data.topTraders || [],
        topTickers: data.topTickers || [],
      };
    },
    staleTime: 1000 * 60 * 10,
  });
}
