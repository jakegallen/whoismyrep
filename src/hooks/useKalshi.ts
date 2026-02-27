import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface KalshiMarket {
  id: string;
  question: string;
  eventTitle: string | null;
  ticker: string;
  yesPercent: number | null;
  noPercent: number | null;
  volume: number;
  volumeFormatted: string;
  openInterest: number;
  endDate: string | null;
  active: boolean;
  closed: boolean;
  url: string | null;
  source: "kalshi";
}

export function useKalshi(politicianName?: string, state?: string) {
  return useQuery<KalshiMarket[]>({
    queryKey: ["kalshi", politicianName, state],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("fetch-kalshi", {
        body: { politicianName, state },
      });
      if (error) throw new Error(error.message);
      if (!data?.success) throw new Error(data?.error || "Failed to fetch Kalshi data");
      return data.markets || [];
    },
    enabled: !!politicianName,
    staleTime: 1000 * 60 * 5,
  });
}
