import { useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { streakBonus } from "@/lib/xpSystem";

interface StreakResult {
  continued: boolean;
  newStreak: number;
  bonusXP: number;
  isNewDay: boolean;
}

export function useStreak() {
  const { user } = useAuth();

  /** Check and update streak. Returns streak info and any bonus XP earned. */
  const checkStreak = useCallback(async (): Promise<StreakResult | null> => {
    if (!user) return null;

    const { data: profile, error } = await supabase
      .from("user_profiles")
      .select("current_streak, longest_streak, last_active_date, total_active_days")
      .eq("id", user.id)
      .single();

    if (error || !profile) return null;

    const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
    const lastActive = profile.last_active_date;

    // Already logged in today
    if (lastActive === today) {
      return {
        continued: true,
        newStreak: profile.current_streak,
        bonusXP: 0,
        isNewDay: false,
      };
    }

    // Calculate if streak continues
    let newStreak: number;
    let continued: boolean;

    if (lastActive) {
      const lastDate = new Date(lastActive + "T00:00:00");
      const todayDate = new Date(today + "T00:00:00");
      const diffMs = todayDate.getTime() - lastDate.getTime();
      const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

      if (diffDays === 1) {
        // Consecutive day — extend streak
        newStreak = profile.current_streak + 1;
        continued = true;
      } else {
        // Gap — reset streak
        newStreak = 1;
        continued = false;
      }
    } else {
      // First ever login
      newStreak = 1;
      continued = false;
    }

    const newLongest = Math.max(newStreak, profile.longest_streak);
    const bonus = streakBonus(newStreak);

    // Update profile
    const { error: updateError } = await supabase
      .from("user_profiles")
      .update({
        current_streak: newStreak,
        longest_streak: newLongest,
        last_active_date: today,
        total_active_days: profile.total_active_days + 1,
        updated_at: new Date().toISOString(),
      })
      .eq("id", user.id);

    if (updateError) {
      console.error("Failed to update streak:", updateError);
      return null;
    }

    return {
      continued,
      newStreak,
      bonusXP: bonus,
      isNewDay: true,
    };
  }, [user]);

  return { checkStreak };
}
