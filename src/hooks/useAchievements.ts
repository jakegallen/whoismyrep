import { useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { ACHIEVEMENTS, TOTAL_ACHIEVEMENTS, type Achievement } from "@/lib/achievements";
import { toast } from "sonner";

export interface UnlockedAchievement {
  achievement_key: string;
  unlocked_at: string;
}

export function useAchievements() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: unlocked = [], isLoading } = useQuery({
    queryKey: ["user-achievements", user?.id],
    queryFn: async (): Promise<UnlockedAchievement[]> => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("user_achievements")
        .select("achievement_key, unlocked_at")
        .eq("user_id", user.id)
        .order("unlocked_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!user,
    staleTime: 2 * 60 * 1000,
  });

  const unlockedKeys = new Set(unlocked.map((a) => a.achievement_key));

  const hasAchievement = useCallback(
    (key: string) => unlockedKeys.has(key),
    [unlockedKeys],
  );

  const unlockAchievement = useCallback(
    async (key: string): Promise<boolean> => {
      if (!user) return false;
      if (unlockedKeys.has(key)) return false;

      const achievement = ACHIEVEMENTS[key];
      if (!achievement) return false;

      const { error } = await supabase.from("user_achievements").insert({
        user_id: user.id,
        achievement_key: key,
      });

      // Unique constraint violation = already unlocked
      if (error) {
        if (error.code === "23505") return false;
        console.error("Failed to unlock achievement:", error);
        return false;
      }

      // Show celebration toast
      toast.success(`Achievement Unlocked!`, {
        description: `${achievement.name} — ${achievement.desc} (+${achievement.xp} XP)`,
        duration: 4000,
      });

      // Award achievement XP via edge function
      await supabase.functions.invoke("record-xp", {
        body: { action: "achievement_unlock", metadata: { achievementKey: key } },
      });

      // Invalidate cache
      queryClient.invalidateQueries({ queryKey: ["user-achievements", user.id] });
      queryClient.invalidateQueries({ queryKey: ["user-profile", user.id] });

      return true;
    },
    [user, unlockedKeys, queryClient],
  );

  return {
    achievements: unlocked,
    hasAchievement,
    unlockAchievement,
    unlockedCount: unlocked.length,
    totalCount: TOTAL_ACHIEVEMENTS,
    isLoading,
  } as const;
}

// ── Achievement condition checkers ──
// Called after XP events to see if any achievement should unlock.

interface CheckContext {
  action: string;
  xpEvents: Array<{ action: string; metadata: Record<string, unknown> }>;
  streak: number;
  savedRepCount: number;
  savedBillCount: number;
}

export function getEligibleAchievements(
  ctx: CheckContext,
  alreadyUnlocked: Set<string>,
): string[] {
  const eligible: string[] = [];

  const check = (key: string, condition: boolean) => {
    if (!alreadyUnlocked.has(key) && condition) eligible.push(key);
  };

  // Count unique items by action
  const uniqueBills = new Set(
    ctx.xpEvents
      .filter((e) => e.action === "read_bill")
      .map((e) => JSON.stringify(e.metadata)),
  ).size;

  const uniqueReps = new Set(
    ctx.xpEvents
      .filter((e) => e.action === "read_politician")
      .map((e) => JSON.stringify(e.metadata)),
  ).size;

  const completedChallenges = ctx.xpEvents.filter(
    (e) => e.action === "complete_challenge",
  ).length;

  // Basics
  check("first_save", ctx.savedRepCount >= 1 || ctx.action === "save_rep");
  check("home_state", ctx.action === "set_home_state");
  check("district_set", ctx.action === "set_home_district");

  // Exploration
  check("bill_reader_10", uniqueBills >= 10);
  check("bill_reader_50", uniqueBills >= 50);
  check("rep_explorer_10", uniqueReps >= 10);
  check("stock_watcher", ctx.action === "view_stock_trades");
  check("lobbyist_tracker", ctx.action === "view_lobbying");
  check("court_observer", ctx.action === "view_court_cases");

  // Streaks
  check("streak_7", ctx.streak >= 7);
  check("streak_30", ctx.streak >= 30);
  check("streak_100", ctx.streak >= 100);

  // Knowledge
  check("quiz_first", ctx.action === "quiz_correct");

  // Challenges
  check("challenge_first", completedChallenges >= 1 || ctx.action === "complete_challenge");
  check("challenge_7", completedChallenges >= 7);

  // Saving
  check("save_5_reps", ctx.savedRepCount >= 5);
  check("save_5_bills", ctx.savedBillCount >= 5);

  return eligible;
}
