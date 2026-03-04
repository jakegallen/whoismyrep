import { useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Calendar,
  Flame,
  Zap,
  Trophy,
  LogIn,
  Heart,
  TrendingUp,
} from "lucide-react";
import SiteNav from "@/components/SiteNav";
import SEO from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { StreakBanner } from "@/components/StreakBanner";
import { ActivityFeed } from "@/components/ActivityFeed";
import { DailyChallengeCard } from "@/components/DailyChallengeCard";
import { DailyQuiz } from "@/components/DailyQuiz";
import { useAuth } from "@/hooks/useAuth";
import { useXP } from "@/hooks/useXP";
import { useSavedReps } from "@/hooks/useSavedReps";
import { useSavedBills } from "@/hooks/useSavedBills";

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

function formatDate(): string {
  return new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

/**
 * Inner component — only mounted once auth is settled and the user is
 * authenticated.  By isolating the heavy hooks (useXP, useSavedReps,
 * useSavedBills) here, they always see a stable auth state and React's
 * hook-ordering invariant is preserved across re-renders.
 */
function DailyBriefingContent() {
  const navigate = useNavigate();
  const {
    checkDailyLogin,
    xp,
    level,
    levelTitle,
    xpToNext,
    progressPercent,
    streak,
    longestStreak,
    profile,
  } = useXP();
  const { savedReps, count: repCount } = useSavedReps();
  useSavedBills();

  useEffect(() => {
    checkDailyLogin();
  }, [checkDailyLogin]);

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="Daily Briefing"
        description="Your personalized daily political briefing."
        path="/today"
      />
      <SiteNav />

      <main id="main-content" className="container mx-auto px-4 py-8 pb-20">
        <div className="mx-auto max-w-2xl">
          {/* Back button */}
          <Button
            variant="ghost"
            onClick={() => navigate("/")}
            className="mb-6 -ml-2 gap-2 text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Home
          </Button>

          {/* Greeting */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6"
          >
            <h1 className="font-display text-2xl font-bold text-headline md:text-3xl">
              {getGreeting()}{profile?.display_name ? `, ${profile.display_name}` : ""}
            </h1>
            <p className="mt-1 font-body text-sm text-muted-foreground">
              {formatDate()}
            </p>
          </motion.div>

          {/* Streak banner */}
          <StreakBanner />

          {/* Stats overview */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="mb-6 rounded-xl border border-border bg-card p-4"
          >
            <div className="flex items-center gap-2 mb-3">
              <Zap className="h-4 w-4 text-yellow-500" />
              <span className="font-display text-sm font-bold text-headline">
                Your Progress
              </span>
            </div>

            {/* Level + XP bar */}
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/15">
                <span className="font-display text-xl font-bold text-primary">
                  {level}
                </span>
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-display text-sm font-bold text-headline">
                    {levelTitle}
                  </span>
                  <span className="font-mono text-[11px] text-muted-foreground">
                    {xp.toLocaleString()} XP
                  </span>
                </div>
                <Progress value={progressPercent} className="h-2" />
                <p className="mt-0.5 font-body text-[10px] text-muted-foreground">
                  {xpToNext.toLocaleString()} XP to Level {level + 1}
                </p>
              </div>
            </div>

            {/* Quick stats */}
            <div className="grid grid-cols-4 gap-2">
              <div className="rounded-lg bg-muted/40 p-2 text-center">
                <Flame className="mx-auto mb-0.5 h-4 w-4 text-orange-500" />
                <p className="font-mono text-sm font-bold text-headline">
                  {streak}
                </p>
                <p className="font-body text-[8px] text-muted-foreground">
                  Streak
                </p>
              </div>
              <div className="rounded-lg bg-muted/40 p-2 text-center">
                <Trophy className="mx-auto mb-0.5 h-4 w-4 text-amber-500" />
                <p className="font-mono text-sm font-bold text-headline">
                  {longestStreak}
                </p>
                <p className="font-body text-[8px] text-muted-foreground">
                  Best
                </p>
              </div>
              <div className="rounded-lg bg-muted/40 p-2 text-center">
                <Heart className="mx-auto mb-0.5 h-4 w-4 text-red-500" />
                <p className="font-mono text-sm font-bold text-headline">
                  {repCount}
                </p>
                <p className="font-body text-[8px] text-muted-foreground">
                  Reps
                </p>
              </div>
              <div className="rounded-lg bg-muted/40 p-2 text-center">
                <Calendar className="mx-auto mb-0.5 h-4 w-4 text-blue-500" />
                <p className="font-mono text-sm font-bold text-headline">
                  {profile?.total_active_days ?? 0}
                </p>
                <p className="font-body text-[8px] text-muted-foreground">
                  Days
                </p>
              </div>
            </div>
          </motion.div>

          {/* Quick Actions */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="mb-6"
          >
            <h2 className="mb-3 font-display text-sm font-bold uppercase tracking-wider text-muted-foreground">
              Earn XP
            </h2>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              <Link
                to="/bills"
                className="flex items-center gap-2 rounded-xl border border-border bg-card p-3 transition-colors hover:bg-surface-hover"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/10">
                  <TrendingUp className="h-4 w-4 text-blue-500" />
                </div>
                <div>
                  <p className="font-display text-xs font-bold text-headline">
                    Read Bills
                  </p>
                  <p className="font-body text-[10px] text-muted-foreground">
                    +5 XP each
                  </p>
                </div>
              </Link>
              <Link
                to="/politicians"
                className="flex items-center gap-2 rounded-xl border border-border bg-card p-3 transition-colors hover:bg-surface-hover"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-500/10">
                  <Heart className="h-4 w-4 text-purple-500" />
                </div>
                <div>
                  <p className="font-display text-xs font-bold text-headline">
                    Explore Reps
                  </p>
                  <p className="font-body text-[10px] text-muted-foreground">
                    +5 XP each
                  </p>
                </div>
              </Link>
              <Link
                to="/congress-trades"
                className="flex items-center gap-2 rounded-xl border border-border bg-card p-3 transition-colors hover:bg-surface-hover"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10">
                  <TrendingUp className="h-4 w-4 text-emerald-500" />
                </div>
                <div>
                  <p className="font-display text-xs font-bold text-headline">
                    Stock Trades
                  </p>
                  <p className="font-body text-[10px] text-muted-foreground">
                    +5 XP daily
                  </p>
                </div>
              </Link>
            </div>
          </motion.div>

          {/* Daily Challenge */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.18 }}
            className="mb-6"
          >
            <DailyChallengeCard />
          </motion.div>

          {/* Daily Quiz */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.22 }}
            className="mb-6"
          >
            <DailyQuiz />
          </motion.div>

          {/* Activity Feed */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.26 }}
          >
            <h2 className="mb-3 font-display text-sm font-bold uppercase tracking-wider text-muted-foreground">
              Your Feed
            </h2>
            {repCount > 0 ? (
              <ActivityFeed savedReps={savedReps} />
            ) : (
              <div className="rounded-xl border border-dashed border-border bg-card/50 p-8 text-center">
                <Heart className="mx-auto mb-2 h-6 w-6 text-muted-foreground" />
                <p className="font-body text-sm text-muted-foreground">
                  Save some representatives to see their latest activity here.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate("/")}
                  className="mt-3"
                >
                  Find Your Reps
                </Button>
              </div>
            )}
          </motion.div>
        </div>
      </main>
    </div>
  );
}

/**
 * Outer shell — uses only useAuth (a single useContext) so the hook
 * footprint is tiny and stable across the loading→loaded transition.
 * Once auth is resolved it conditionally renders either the sign-in
 * prompt or DailyBriefingContent (which gets a fresh mount with its
 * own stable hook list).
 */
const DailyBriefing = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();

  useEffect(() => {
    document.title = "Daily Briefing — WhoIsMyRep.us";
  }, []);

  // Auth still loading
  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <SiteNav />
      </div>
    );
  }

  // Not authenticated
  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        <SEO
          title="Daily Briefing"
          description="Your personalized daily political briefing with XP, streaks, and activity."
          path="/today"
        />
        <SiteNav />
        <main className="container mx-auto px-4 py-8">
          <div className="mx-auto max-w-2xl">
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card/50 p-12 text-center"
            >
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                <Calendar className="h-7 w-7 text-primary" />
              </div>
              <h1 className="font-display text-xl font-bold text-headline">
                Your Daily Briefing
              </h1>
              <p className="mt-2 max-w-sm font-body text-sm text-muted-foreground">
                Sign in to unlock your personalized daily political briefing, earn XP, build streaks, and track your civic engagement.
              </p>
              <Button
                onClick={() => navigate("/auth")}
                className="mt-6 gradient-brand font-display font-semibold text-white shadow-glow hover:opacity-90 transition-opacity"
              >
                <LogIn className="mr-2 h-4 w-4" />
                Sign In to Start
              </Button>
            </motion.div>
          </div>
        </main>
      </div>
    );
  }

  // Authenticated
  return <DailyBriefingContent />;
};

export default DailyBriefing;
