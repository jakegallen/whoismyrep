import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface PodcastEpisode {
  id: string;
  title: string;
  description: string;
  audioUrl: string;
  duration: string;
  pubDate: string;
  podcastName: string;
  podcastImage: string;
  episodeUrl: string;
}

interface UsePodcastsResult {
  episodes: PodcastEpisode[];
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

export function usePodcasts(): UsePodcastsResult {
  const [episodes, setEpisodes] = useState<PodcastEpisode[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPodcasts = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke("fetch-podcasts");

      if (fnError) throw new Error(fnError.message);
      if (!data?.success) throw new Error(data?.error || "Failed to fetch podcasts");

      if (data.episodes?.length > 0) setEpisodes(data.episodes);
    } catch (e) {
      console.error("Failed to fetch podcasts:", e);
      setError(e instanceof Error ? e.message : "Failed to fetch podcasts");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPodcasts();
  }, [fetchPodcasts]);

  return { episodes, isLoading, error, refetch: fetchPodcasts };
}
