import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { NewsItem, TrendingTopic, TrendingIndividual } from "@/lib/mockNews";
import { mockNews, trendingTopics as mockTrending, mockTrendingIndividuals } from "@/lib/mockNews";

interface UseNevadaNewsResult {
  news: NewsItem[];
  trending: TrendingTopic[];
  trendingIndividuals: TrendingIndividual[];
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
  lastUpdated: Date | null;
}

export function useNevadaNews(): UseNevadaNewsResult {
  const [news, setNews] = useState<NewsItem[]>(mockNews);
  const [trending, setTrending] = useState<TrendingTopic[]>(mockTrending);
  const [trendingIndividuals, setTrendingIndividuals] = useState<TrendingIndividual[]>(mockTrendingIndividuals);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchNews = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke("fetch-nevada-news");

      if (fnError) throw new Error(fnError.message);
      if (!data?.success) throw new Error(data?.error || "Failed to fetch news");

      if (data.news && data.news.length > 0) setNews(data.news);
      if (data.trending && data.trending.length > 0) setTrending(data.trending);
      if (data.trendingIndividuals && data.trendingIndividuals.length > 0) setTrendingIndividuals(data.trendingIndividuals);
      setLastUpdated(new Date());
    } catch (e) {
      console.error("Failed to fetch news:", e);
      setError(e instanceof Error ? e.message : "Failed to fetch news");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNews();
  }, [fetchNews]);

  return { news, trending, trendingIndividuals, isLoading, error, refetch: fetchNews, lastUpdated };
}
