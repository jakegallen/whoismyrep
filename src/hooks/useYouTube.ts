import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface YouTubeVideo {
  id: string;
  videoId: string;
  title: string;
  description: string;
  thumbnail: string;
  pubDate: string;
  channelName: string;
  url: string;
}

async function fetchYouTubeVideos(): Promise<YouTubeVideo[]> {
  const { data, error } = await supabase.functions.invoke("fetch-youtube");

  if (error) throw new Error(error.message);
  if (!data?.success) throw new Error(data?.error || "Failed to fetch videos");

  return data.videos || [];
}

export function useYouTube() {
  const query = useQuery({
    queryKey: ["youtube-videos"],
    queryFn: fetchYouTubeVideos,
    staleTime: 10 * 60 * 1000,
  });

  return {
    videos: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error?.message ?? null,
    refetch: query.refetch,
  };
}
