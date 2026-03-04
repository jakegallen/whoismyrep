import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Flame, Trophy, Zap, Calendar, Award } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useXP } from "@/hooks/useXP";
import { levelName } from "@/lib/xpSystem";

export function XPBar() {
  const {
    isAuthenticated,
    isLoading,
    xp,
    level,
    levelTitle,
    xpToNext,
    progressPercent,
    streak,
    longestStreak,
    profile,
  } = useXP();

  // Don't show for anonymous users
  if (!isAuthenticated) return null;
  if (isLoading) return null;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm transition-colors hover:bg-surface-hover"
          aria-label={`Level ${level}, ${xp} XP`}
        >
          {/* Level badge */}
          <span className="flex h-6 min-w-6 items-center justify-center rounded-md bg-primary/15 px-1.5 font-mono text-[11px] font-bold text-primary">
            {level}
          </span>

          {/* Mini progress bar (desktop only) */}
          <div className="hidden w-16 sm:block">
            <Progress value={progressPercent} className="h-1.5" />
          </div>

          {/* Streak flame */}
          {streak > 0 && (
            <span className="flex items-center gap-0.5 text-orange-500">
              <Flame className="h-3.5 w-3.5" fill="currentColor" />
              <span className="font-mono text-[10px] font-bold">{streak}</span>
            </span>
          )}
        </button>
      </PopoverTrigger>

      <PopoverContent className="w-72 p-0" align="end">
        <div className="p-4">
          {/* Header */}
          <div className="mb-3 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15">
              <span className="font-display text-lg font-bold text-primary">
                {level}
              </span>
            </div>
            <div>
              <p className="font-display text-sm font-bold text-headline">
                {levelTitle}
              </p>
              <p className="font-body text-[11px] text-muted-foreground">
                Level {level} — {xp.toLocaleString()} XP
              </p>
            </div>
          </div>

          {/* XP Progress */}
          <div className="mb-4">
            <div className="mb-1 flex items-center justify-between">
              <span className="font-body text-[11px] text-muted-foreground">
                Next level
              </span>
              <span className="font-mono text-[11px] text-muted-foreground">
                {xpToNext.toLocaleString()} XP to go
              </span>
            </div>
            <Progress value={progressPercent} className="h-2" />
          </div>

          {/* Stats grid */}
          <div className="grid grid-cols-3 gap-2">
            <div className="rounded-lg bg-muted/40 p-2 text-center">
              <Flame className="mx-auto mb-0.5 h-4 w-4 text-orange-500" />
              <p className="font-mono text-sm font-bold text-headline">
                {streak}
              </p>
              <p className="font-body text-[9px] text-muted-foreground">
                Streak
              </p>
            </div>
            <div className="rounded-lg bg-muted/40 p-2 text-center">
              <Zap className="mx-auto mb-0.5 h-4 w-4 text-yellow-500" />
              <p className="font-mono text-sm font-bold text-headline">
                {xp.toLocaleString()}
              </p>
              <p className="font-body text-[9px] text-muted-foreground">
                Total XP
              </p>
            </div>
            <div className="rounded-lg bg-muted/40 p-2 text-center">
              <Calendar className="mx-auto mb-0.5 h-4 w-4 text-blue-500" />
              <p className="font-mono text-sm font-bold text-headline">
                {profile?.total_active_days ?? 0}
              </p>
              <p className="font-body text-[9px] text-muted-foreground">
                Days
              </p>
            </div>
          </div>

          {/* Links */}
          <div className="mt-3 flex gap-2">
            <Link
              to="/today"
              className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-primary/10 px-3 py-2 font-body text-xs font-medium text-primary transition-colors hover:bg-primary/20"
            >
              <Calendar className="h-3.5 w-3.5" />
              Briefing
            </Link>
            <Link
              to="/achievements"
              className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-amber-500/10 px-3 py-2 font-body text-xs font-medium text-amber-600 dark:text-amber-400 transition-colors hover:bg-amber-500/20"
            >
              <Award className="h-3.5 w-3.5" />
              Badges
            </Link>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
