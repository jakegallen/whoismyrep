import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { NewsItem, TrendingTopic, TrendingIndividual } from "@/lib/mockNews";

interface StateNewsData {
  news: NewsItem[];
  trending: TrendingTopic[];
  trendingIndividuals: TrendingIndividual[];
}

async function fetchStateNews(stateName: string): Promise<StateNewsData> {
  const { data, error } = await supabase.functions.invoke("fetch-state-news", {
    body: { state: stateName },
  });

  if (error) throw new Error(error.message);
  if (!data?.success) throw new Error(data?.error || "Failed to fetch news");

  return {
    news: data.news || [],
    trending: data.trending || [],
    trendingIndividuals: data.trendingIndividuals || [],
  };
}

export function useStateNews(stateName?: string) {
  const state = stateName || "United States";
  const query = useQuery({
    queryKey: ["state-news", state],
    queryFn: () => fetchStateNews(state),
    staleTime: 5 * 60 * 1000,
  });

  return {
    news: query.data?.news ?? [],
    trending: query.data?.trending ?? [],
    trendingIndividuals: query.data?.trendingIndividuals ?? [],
    isLoading: query.isLoading,
    error: query.error?.message ?? null,
    refetch: query.refetch,
    lastUpdated: query.dataUpdatedAt ? new Date(query.dataUpdatedAt) : null,
  };
}
