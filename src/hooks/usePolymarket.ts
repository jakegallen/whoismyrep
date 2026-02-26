import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface PolymarketMarket {
  id: string;
  question: string;
  eventTitle: string | null;
  slug: string | null;
  yesPercent: number | null;
  noPercent: number | null;
  outcomes: string[];
  volume: number;
  volumeFormatted: string;
  liquidity: number;
  endDate: string | null;
  image: string | null;
  active: boolean;
  closed: boolean;
  url: string | null;
}

export function usePolymarket(politicianName?: string) {
  return useQuery<PolymarketMarket[]>({
    queryKey: ["polymarket", politicianName],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("fetch-polymarket", {
        body: { politicianName },
      });
      if (error) throw new Error(error.message);
      if (!data?.success) throw new Error(data?.error || "Failed to fetch Polymarket data");
      return data.markets || [];
    },
    enabled: !!politicianName,
    staleTime: 1000 * 60 * 5,
  });
}
