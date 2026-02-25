import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface SocialPost {
  id: string;
  platform: "twitter" | "facebook" | "tiktok" | "instagram" | "reddit" | "other";
  author: string;
  handle: string;
  content: string;
  url: string;
  timestamp: string;
  engagement: string;
  avatarUrl?: string;
}

interface UseSocialMediaResult {
  posts: SocialPost[];
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useSocialMedia(): UseSocialMediaResult {
  const [posts, setPosts] = useState<SocialPost[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPosts = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke("fetch-social-media");

      if (fnError) throw new Error(fnError.message);
      if (!data?.success) throw new Error(data?.error || "Failed to fetch social media");

      if (data.posts?.length > 0) setPosts(data.posts);
    } catch (e) {
      console.error("Failed to fetch social media:", e);
      setError(e instanceof Error ? e.message : "Failed to fetch social media");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  return { posts, isLoading, error, refetch: fetchPosts };
}
