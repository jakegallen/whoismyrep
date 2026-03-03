import { useQuery } from "@tanstack/react-query";
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

async function fetchPodcastEpisodes(): Promise<PodcastEpisode[]> {
  const { data, error } = await supabase.functions.invoke("fetch-podcasts");

  if (error) throw new Error(error.message);
  if (!data?.success) throw new Error(data?.error || "Failed to fetch podcasts");

  return data.episodes || [];
}

export function usePodcasts() {
  const query = useQuery({
    queryKey: ["podcast-episodes"],
    queryFn: fetchPodcastEpisodes,
    staleTime: 15 * 60 * 1000,
  });

  return {
    episodes: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error?.message ?? null,
    refetch: query.refetch,
  };
}
