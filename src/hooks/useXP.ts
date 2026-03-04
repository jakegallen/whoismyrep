import { useCallback, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useUserProfile } from "@/hooks/useUserProfile";
import { useStreak } from "@/hooks/useStreak";
import {
  levelFromXP,
  xpToNextLevel,
  xpProgressPercent,
  levelName,
  XP_ACTIONS,
} from "@/lib/xpSystem";
import { ACHIEVEMENTS } from "@/lib/achievements";
import { toast } from "sonner";

interface AwardResult {
  xpEarned: number;
  newTotal: number;
  levelUp: boolean;
  newLevel: number;
}

// Maps XP actions to challenge types they count toward
const ACTION_TO_CHALLENGE_TYPE: Record<string, string> = {
  read_bill: "read_bills",
  read_politician: "explore_reps",
  save_rep: "save_items",
  save_bill: "save_items",
  quiz_correct: "quiz",
};

export function useXP() {
  const { user } = useAuth();
  const { profile, isLoading, isAuthenticated, invalidate } = useUserProfile();
  const { checkStreak } = useStreak();
  const queryClient = useQueryClient();

  // Track daily login check so we only do it once per session
  const dailyLoginChecked = useRef(false);

  /** Check and unlock eligible achievements after an XP action */
  const checkAchievements = useCallback(
    async (action: string, streak: number, savedRepCount: number, savedBillCount: number) => {
      if (!user) return;

      // Fetch user's unlocked achievements
      const { data: unlocked } = await supabase
        .from("user_achievements")
        .select("achievement_key")
        .eq("user_id", user.id);

      const unlockedKeys = new Set((unlocked ?? []).map((a) => a.achievement_key));

      // Fetch xp_events for count-based achievements
      const { data: xpEvents } = await supabase
        .from("xp_events")
        .select("action, metadata")
        .eq("user_id", user.id);

      const events = (xpEvents ?? []) as Array<{ action: string; metadata: Record<string, unknown> }>;

      // Count unique items
      const uniqueBills = new Set(
        events.filter((e) => e.action === "read_bill").map((e) => JSON.stringify(e.metadata)),
      ).size;
      const uniqueReps = new Set(
        events.filter((e) => e.action === "read_politician").map((e) => JSON.stringify(e.metadata)),
      ).size;
      const completedChallenges = events.filter((e) => e.action === "complete_challenge").length;

      // Check each achievement
      const eligible: string[] = [];
      const check = (key: string, condition: boolean) => {
        if (!unlockedKeys.has(key) && condition) eligible.push(key);
      };

      // Basics
      check("first_save", savedRepCount >= 1 || action === "save_rep");
      check("home_state", action === "set_home_state");
      check("district_set", action === "set_home_district");

      // Exploration
      check("bill_reader_10", uniqueBills >= 10);
      check("bill_reader_50", uniqueBills >= 50);
      check("rep_explorer_10", uniqueReps >= 10);
      check("stock_watcher", action === "view_stock_trades");
      check("lobbyist_tracker", action === "view_lobbying");
      check("court_observer", action === "view_court_cases");

      // Streaks
      check("streak_7", streak >= 7);
      check("streak_30", streak >= 30);
      check("streak_100", streak >= 100);

      // Knowledge
      check("quiz_first", action === "quiz_correct");

      // Challenges
      check("challenge_first", completedChallenges >= 1 || action === "complete_challenge");
      check("challenge_7", completedChallenges >= 7);

      // Saving
      check("save_5_reps", savedRepCount >= 5);
      check("save_5_bills", savedBillCount >= 5);

      // Unlock all eligible achievements
      for (const key of eligible) {
        const achievement = ACHIEVEMENTS[key];
        if (!achievement) continue;

        const { error } = await supabase.from("user_achievements").insert({
          user_id: user.id,
          achievement_key: key,
        });

        if (error) {
          if (error.code === "23505") continue; // already unlocked
          console.error("Failed to unlock achievement:", error);
          continue;
        }

        // Show celebration toast
        toast.success(`Achievement Unlocked!`, {
          description: `${achievement.name} — ${achievement.desc} (+${achievement.xp} XP)`,
          duration: 4000,
        });

        // Award achievement XP
        if (achievement.xp > 0) {
          await supabase.functions.invoke("record-xp", {
            body: { action: "achievement_unlock", metadata: { achievementKey: key } },
          });
        }
      }

      if (eligible.length > 0) {
        queryClient.invalidateQueries({ queryKey: ["user-achievements", user.id] });
        invalidate();
      }
    },
    [user, queryClient, invalidate],
  );

  /** Increment daily challenge progress if the action maps to the current challenge type */
  const updateChallengeProgress = useCallback(
    async (action: string) => {
      if (!user) return;

      const challengeType = ACTION_TO_CHALLENGE_TYPE[action];
      if (!challengeType) return;

      const today = new Date().toISOString().split("T")[0];

      // Fetch today's challenge
      const { data: challenge } = await supabase
        .from("daily_challenges")
        .select("id, challenge_type, target_count")
        .eq("challenge_date", today)
        .single();

      if (!challenge || challenge.challenge_type !== challengeType) return;

      // Fetch current progress
      const { data: progressData } = await supabase
        .from("challenge_progress")
        .select("progress, completed")
        .eq("user_id", user.id)
        .eq("challenge_id", challenge.id)
        .single();

      const currentProgress = progressData?.progress ?? 0;
      if (progressData?.completed) return; // already done

      const newProgress = Math.min(currentProgress + 1, challenge.target_count);
      const justCompleted = newProgress >= challenge.target_count;

      await supabase
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

      // Invalidate challenge progress cache
      queryClient.invalidateQueries({ queryKey: ["challenge-progress"] });

      // If just completed, award challenge completion XP
      if (justCompleted) {
        toast.success("Daily Challenge Complete!", {
          description: `+50 XP — Great work!`,
          duration: 3000,
        });
        // The complete_challenge XP is awarded separately
        await supabase.functions.invoke("record-xp", {
          body: { action: "complete_challenge", metadata: {} },
        });
        invalidate();
      }
    },
    [user, queryClient, invalidate],
  );

  /** Award XP for an action. Handles dedup, cooldowns, streak, and toasts. */
  const awardXP = useCallback(
    async (
      action: string,
      metadata?: Record<string, string>,
    ): Promise<AwardResult | null> => {
      if (!user) return null;

      const actionConfig = XP_ACTIONS[action];
      if (!actionConfig) {
        console.warn(`Unknown XP action: ${action}`);
        return null;
      }

      try {
        // Call server-side edge function for validation
        const { data, error } = await supabase.functions.invoke("record-xp", {
          body: { action, metadata: metadata ?? {} },
        });

        if (error) {
          console.error("record-xp error:", error);
          return null;
        }

        if (!data?.success) {
          // Deduplicated or rate-limited — no XP awarded, silent
          return null;
        }

        const result: AwardResult = {
          xpEarned: data.xpEarned,
          newTotal: data.newTotal,
          levelUp: data.levelUp,
          newLevel: data.newLevel,
        };

        // Show XP toast
        if (result.xpEarned > 0) {
          const actionLabel = action
            .replace(/_/g, " ")
            .replace(/\b\w/g, (c) => c.toUpperCase());
          toast.success(`+${result.xpEarned} XP`, {
            description: actionLabel,
            duration: 2000,
          });
        }

        // Level up celebration
        if (result.levelUp) {
          toast.success(`Level Up!`, {
            description: `You're now Level ${result.newLevel} — ${levelName(result.newLevel)}`,
            duration: 4000,
          });
        }

        // Invalidate profile cache to update XP bar
        invalidate();

        // Fire-and-forget: update challenge progress + check achievements
        // These run async without blocking the return
        updateChallengeProgress(action);

        return result;
      } catch (err) {
        console.error("awardXP failed:", err);
        return null;
      }
    },
    [user, invalidate, updateChallengeProgress],
  );

  /** Check daily login and award streak XP. Call once on app load. */
  const checkDailyLogin = useCallback(async () => {
    if (!user || dailyLoginChecked.current) return;
    dailyLoginChecked.current = true;

    const streakResult = await checkStreak();
    if (!streakResult || !streakResult.isNewDay) return;

    // Award daily login XP via edge function
    await awardXP("daily_login");

    // Show streak toast
    if (streakResult.newStreak > 1) {
      const emoji = streakResult.continued ? "🔥" : "✨";
      toast.success(
        `${emoji} Day ${streakResult.newStreak} streak!`,
        {
          description: streakResult.bonusXP > 0
            ? `+${streakResult.bonusXP} streak bonus XP`
            : "Keep it going!",
          duration: 3000,
        },
      );
    }

    // Check streak-based achievements
    checkAchievements("daily_login", streakResult.newStreak, 0, 0);
  }, [user, checkStreak, awardXP, checkAchievements]);

  /** Trigger achievement check with current saved counts. Call after save/unsave actions. */
  const checkAchievementsWithCounts = useCallback(
    (action: string, savedRepCount: number, savedBillCount: number) => {
      const streak = profile?.current_streak ?? 0;
      checkAchievements(action, streak, savedRepCount, savedBillCount);
    },
    [profile, checkAchievements],
  );

  // Derived state
  const xp = profile?.xp ?? 0;
  const level = profile ? levelFromXP(xp) : 1;

  return {
    awardXP,
    checkDailyLogin,
    checkAchievementsWithCounts,
    profile,
    isLoading,
    isAuthenticated,
    xp,
    level,
    levelTitle: levelName(level),
    xpToNext: xpToNextLevel(xp),
    progressPercent: xpProgressPercent(xp),
    streak: profile?.current_streak ?? 0,
    longestStreak: profile?.longest_streak ?? 0,
  } as const;
}
