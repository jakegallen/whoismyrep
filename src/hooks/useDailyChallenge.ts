import { useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export interface DailyChallenge {
  id: number;
  challenge_date: string;
  challenge_type: string;
  title: string;
  description: string;
  target_count: number;
  xp_reward: number;
}

export interface ChallengeProgress {
  progress: number;
  completed: boolean;
  completed_at: string | null;
}

export function useDailyChallenge() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const today = new Date().toISOString().split("T")[0];

  // Fetch today's challenge (or create one via edge function)
  const { data: challenge, isLoading: challengeLoading } = useQuery({
    queryKey: ["daily-challenge", today],
    queryFn: async (): Promise<DailyChallenge | null> => {
      // First try to read from DB
      const { data, error } = await supabase
        .from("daily_challenges")
        .select("*")
        .eq("challenge_date", today)
        .single();

      if (data) return data as DailyChallenge;

      // If not found, call edge function to generate one
      if (error?.code === "PGRST116") {
        const { data: genData } = await supabase.functions.invoke(
          "generate-daily-challenge",
          { body: { date: today } },
        );
        if (genData?.challenge) return genData.challenge as DailyChallenge;
      }

      return null;
    },
    staleTime: 10 * 60 * 1000, // 10 min
  });

  // Fetch user's progress on today's challenge
  const { data: progress, isLoading: progressLoading } = useQuery({
    queryKey: ["challenge-progress", user?.id, challenge?.id],
    queryFn: async (): Promise<ChallengeProgress> => {
      if (!user || !challenge) return { progress: 0, completed: false, completed_at: null };

      const { data, error } = await supabase
        .from("challenge_progress")
        .select("progress, completed, completed_at")
        .eq("user_id", user.id)
        .eq("challenge_id", challenge.id)
        .single();

      if (error?.code === "PGRST116" || !data) {
        return { progress: 0, completed: false, completed_at: null };
      }
      if (error) throw error;

      return data as ChallengeProgress;
    },
    enabled: !!user && !!challenge,
    staleTime: 30 * 1000, // 30s — updates frequently
  });

  const incrementProgress = useCallback(
    async (amount = 1): Promise<{ newProgress: number; justCompleted: boolean }> => {
      if (!user || !challenge) return { newProgress: 0, justCompleted: false };

      const currentProgress = progress?.progress ?? 0;
      const alreadyCompleted = progress?.completed ?? false;
      if (alreadyCompleted) return { newProgress: currentProgress, justCompleted: false };

      const newProgress = Math.min(currentProgress + amount, challenge.target_count);
      const justCompleted = newProgress >= challenge.target_count;

      // Upsert progress
      const { error } = await supabase
        .from("challenge_progress")
        .upsert(
          {
            user_id: user.id,
            challenge_id: challenge.id,
            progress: newProgress,
            completed: justCompleted,
            completed_at: justCompleted ? new Date().toISOString() : null,
          },
          { onConflict: "user_id,challenge_id" },
        );

      if (error) {
        console.error("Failed to update challenge progress:", error);
        return { newProgress: currentProgress, justCompleted: false };
      }

      // Invalidate cache
      queryClient.invalidateQueries({
        queryKey: ["challenge-progress", user.id, challenge.id],
      });

      return { newProgress, justCompleted };
    },
    [user, challenge, progress, queryClient],
  );

  return {
    challenge: challenge ?? null,
    progress: progress?.progress ?? 0,
    targetCount: challenge?.target_count ?? 1,
    isComplete: progress?.completed ?? false,
    isLoading: challengeLoading || progressLoading,
    incrementProgress,
    progressPercent: challenge
      ? Math.min(100, Math.round(((progress?.progress ?? 0) / challenge.target_count) * 100))
      : 0,
  } as const;
}
