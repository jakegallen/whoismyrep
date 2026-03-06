import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Flame,
  Trophy,
  Star,
  Target,
  BookOpen,
  Calendar,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useUserProfile } from "@/hooks/useUserProfile";
import { supabase } from "@/integrations/supabase/client";
import { levelName } from "@/lib/xpSystem";

const STORAGE_KEY = "whoismyrep-weekly-recap";

interface WeeklySnapshot {
  weekStart: string;
  xp: number;
  level: number;
  streak: number;
  longestStreak: number;
  totalActiveDays: number;
  achievementsUnlocked: number;
  challengesCompleted: number;
}

interface RecapData {
  current: WeeklySnapshot;
  previous: WeeklySnapshot | null;
}

function getMonday(date: Date): string {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  return d.toISOString().split("T")[0];
}

function getDelta(current: number, previous: number | undefined): {
  value: number;
  icon: typeof TrendingUp;
  color: string;
} {
  if (previous === undefined) return { value: 0, icon: Minus, color: "text-muted-foreground" };
  const diff = current - previous;
  if (diff > 0) return { value: diff, icon: TrendingUp, color: "text-emerald-500" };
  if (diff < 0) return { value: diff, icon: TrendingDown, color: "text-red-400" };
  return { value: 0, icon: Minus, color: "text-muted-foreground" };
}

export function WeeklyRecap() {
  const { user } = useAuth();
  const { profile } = useUserProfile();
  const [open, setOpen] = useState(false);
  const [recap, setRecap] = useState<RecapData | null>(null);

  useEffect(() => {
    if (!user || !profile) return;

    const thisMonday = getMonday(new Date());
    const stored = localStorage.getItem(STORAGE_KEY);
    let parsed: { lastShown: string; snapshots: WeeklySnapshot[] } | null = null;

    try {
      parsed = stored ? JSON.parse(stored) : null;
    } catch {
      // corrupted — reset
    }

    // Already shown this week
    if (parsed?.lastShown === thisMonday) return;

    (async () => {
      let achievementsUnlocked = 0;
      let challengesCompleted = 0;

      try {
        const { count: achCount } = await supabase
          .from("user_achievements")
          .select("*", { count: "exact", head: true })
          .eq("user_id", user.id);
        achievementsUnlocked = achCount ?? 0;
      } catch { /* ignore */ }

      try {
        const { count: chCount } = await supabase
          .from("challenge_progress")
          .select("*", { count: "exact", head: true })
          .eq("user_id", user.id)
          .eq("completed", true);
        challengesCompleted = chCount ?? 0;
      } catch { /* ignore */ }

      const current: WeeklySnapshot = {
        weekStart: thisMonday,
        xp: profile.xp,
        level: profile.level,
        streak: profile.current_streak,
        longestStreak: profile.longest_streak,
        totalActiveDays: profile.total_active_days,
        achievementsUnlocked,
        challengesCompleted,
      };

      const snapshots = parsed?.snapshots ?? [];
      const previous = snapshots.length > 0 ? snapshots[snapshots.length - 1] : null;

      // Save current snapshot and mark as shown
      const newSnapshots = [...snapshots.slice(-4), current];
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ lastShown: thisMonday, snapshots: newSnapshots }),
      );

      // Show if there's a previous week to compare or user has activity
      if (previous || profile.xp > 0) {
        setRecap({ current, previous });
        setOpen(true);
      }
    })();
  }, [user, profile]);

  if (!recap) return null;

  const { current, previous } = recap;
  const xpDelta = getDelta(current.xp, previous?.xp);
  const levelDelta = getDelta(current.level, previous?.level);
  const achievementDelta = getDelta(current.achievementsUnlocked, previous?.achievementsUnlocked);
  const challengeDelta = getDelta(current.challengesCompleted, previous?.challengesCompleted);
  const xpGained = previous ? current.xp - previous.xp : current.xp;

  const stats = [
    {
      label: "XP Earned",
      value: `+${Math.max(0, xpGained).toLocaleString()}`,
      total: `${current.xp.toLocaleString()} total`,
      icon: Star,
      delta: xpDelta,
    },
    {
      label: "Level",
      value: `${current.level}`,
      total: levelName(current.level),
      icon: Trophy,
      delta: levelDelta,
    },
    {
      label: "Current Streak",
      value: `${current.streak}d`,
      total: `${current.longestStreak}d best`,
      icon: Flame,
      delta: getDelta(current.streak, previous?.streak),
    },
    {
      label: "Active Days",
      value: `${current.totalActiveDays}`,
      total: "all-time",
      icon: Calendar,
      delta: getDelta(current.totalActiveDays, previous?.totalActiveDays),
    },
    {
      label: "Achievements",
      value: `${current.achievementsUnlocked}`,
      total: "unlocked",
      icon: Target,
      delta: achievementDelta,
    },
    {
      label: "Challenges",
      value: `${current.challengesCompleted}`,
      total: "completed",
      icon: BookOpen,
      delta: challengeDelta,
    },
  ];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display text-xl font-bold text-headline">
            Your Weekly Recap
          </DialogTitle>
          <DialogDescription className="font-body text-sm text-muted-foreground">
            {previous
              ? "Here\u2019s how you did compared to last week."
              : "Here\u2019s your activity so far. Come back next week for a comparison!"}
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-3">
          {stats.map((stat, i) => {
            const DeltaIcon = stat.delta.icon;
            return (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.06, duration: 0.3 }}
                className="rounded-xl border border-border bg-card/50 p-3"
              >
                <div className="flex items-center justify-between">
                  <stat.icon className="h-4 w-4 text-primary" />
                  {previous && (
                    <div className={`flex items-center gap-0.5 ${stat.delta.color}`}>
                      <DeltaIcon className="h-3 w-3" />
                      {stat.delta.value !== 0 && (
                        <span className="font-mono text-[10px] font-bold">
                          {stat.delta.value > 0 ? "+" : ""}{stat.delta.value}
                        </span>
                      )}
                    </div>
                  )}
                </div>
                <p className="mt-1.5 font-display text-lg font-bold text-headline">
                  {stat.value}
                </p>
                <p className="font-body text-[10px] text-muted-foreground">
                  {stat.label}
                </p>
                <p className="font-body text-[10px] text-muted-foreground/70">
                  {stat.total}
                </p>
              </motion.div>
            );
          })}
        </div>

        {xpGained > 100 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.4, duration: 0.3 }}
            className="rounded-xl border border-primary/20 bg-primary/5 p-3 text-center"
          >
            <p className="font-display text-sm font-bold text-primary">
              Great week! You earned {xpGained.toLocaleString()} XP
            </p>
          </motion.div>
        )}

        <Button onClick={() => setOpen(false)} className="w-full">
          Let's go!
        </Button>
      </DialogContent>
    </Dialog>
  );
}
