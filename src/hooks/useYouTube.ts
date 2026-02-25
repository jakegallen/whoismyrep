import { useState, useEffect, useCallback } from "react";
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

interface UseYouTubeResult {
  videos: YouTubeVideo[];
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useYouTube(): UseYouTubeResult {
  const [videos, setVideos] = useState<YouTubeVideo[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchVideos = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke("fetch-youtube");

      if (fnError) throw new Error(fnError.message);
      if (!data?.success) throw new Error(data?.error || "Failed to fetch videos");

      if (data.videos?.length > 0) setVideos(data.videos);
    } catch (e) {
      console.error("Failed to fetch YouTube videos:", e);
      setError(e instanceof Error ? e.message : "Failed to fetch videos");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchVideos();
  }, [fetchVideos]);

  return { videos, isLoading, error, refetch: fetchVideos };
}
