import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Trophy, LogIn, Share2 } from "lucide-react";
import SiteNav from "@/components/SiteNav";
import SEO from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { AchievementCard } from "@/components/AchievementCard";
import { ShareableCard } from "@/components/ShareableCard";
import { useAchievements } from "@/hooks/useAchievements";
import { useAuth } from "@/hooks/useAuth";
import { useUserProfile } from "@/hooks/useUserProfile";
import {
  ACHIEVEMENTS,
  ACHIEVEMENT_CATEGORIES,
  TOTAL_ACHIEVEMENTS,
  type AchievementCategory,
} from "@/lib/achievements";

const CATEGORY_ORDER: AchievementCategory[] = [
  "basics",
  "exploration",
  "streaks",
  "knowledge",
  "challenges",
  "saving",
];

/**
 * Inner component — only mounted once auth is settled and the user is
 * authenticated. Isolates heavy hooks (useAchievements, useUserProfile)
 * so they always see a stable auth state and React's hook-ordering
 * invariant is preserved across re-renders.
 */
function AchievementsContent() {
  const navigate = useNavigate();
  const { achievements, hasAchievement, unlockedCount, totalCount } =
    useAchievements();
  const { profile } = useUserProfile();
  const [shareOpen, setShareOpen] = useState(false);

  // Build unlocked-at map
  const unlockedAtMap = new Map(
    achievements.map((a) => [a.achievement_key, a.unlocked_at]),
  );

  const progressPercent = totalCount > 0 ? Math.round((unlockedCount / totalCount) * 100) : 0;

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="Achievements"
        description="Track your civic engagement achievements."
        path="/achievements"
      />
      <SiteNav />

      <main id="main-content" className="container mx-auto px-4 py-8 pb-20">
        <div className="mx-auto max-w-2xl">
          {/* Back */}
          <Button
            variant="ghost"
            onClick={() => navigate(-1)}
            className="mb-6 -ml-2 gap-2 text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>

          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-500/15">
                <Trophy className="h-6 w-6 text-amber-500" />
              </div>
              <div>
                <h1 className="font-display text-2xl font-bold text-headline">
                  Achievements
                </h1>
                <p className="font-body text-sm text-muted-foreground">
                  {unlockedCount} of {totalCount} unlocked
                </p>
              </div>
            </div>

            <div className="mt-4">
              <div className="mb-1 flex items-center justify-between">
                <span className="font-body text-[11px] text-muted-foreground">
                  Overall progress
                </span>
                <span className="font-mono text-[11px] font-bold text-primary">
                  {progressPercent}%
                </span>
              </div>
              <Progress value={progressPercent} className="h-2.5" />
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setShareOpen(true)}
              className="mt-3 gap-1.5"
            >
              <Share2 className="h-3.5 w-3.5" />
              Share Progress
            </Button>
          </motion.div>

          <ShareableCard
            open={shareOpen}
            onOpenChange={setShareOpen}
            displayName={profile?.display_name ?? "Citizen"}
            level={profile?.level ?? 1}
            xp={profile?.xp ?? 0}
            streak={profile?.current_streak ?? 0}
            achievementCount={unlockedCount}
            totalAchievements={totalCount}
          />

          {/* Achievement grid by category */}
          {CATEGORY_ORDER.map((category) => {
            const entries = Object.entries(ACHIEVEMENTS).filter(
              ([, a]) => a.category === category,
            );
            if (entries.length === 0) return null;

            return (
              <motion.div
                key={category}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-6"
              >
                <h2 className="mb-3 font-display text-sm font-bold uppercase tracking-wider text-muted-foreground">
                  {ACHIEVEMENT_CATEGORIES[category]}
                </h2>
                <div className="grid gap-2 sm:grid-cols-2">
                  {entries.map(([key, achievement]) => (
                    <AchievementCard
                      key={key}
                      achievementKey={key}
                      achievement={achievement}
                      unlocked={hasAchievement(key)}
                      unlockedAt={unlockedAtMap.get(key)}
                    />
                  ))}
                </div>
              </motion.div>
            );
          })}
        </div>
      </main>
    </div>
  );
}

/**
 * Outer shell — uses only useAuth so the hook footprint is tiny and
 * stable across the loading→loaded transition. Once auth is resolved
 * it conditionally renders either the sign-in prompt or
 * AchievementsContent (which gets a fresh mount with its own stable
 * hook list).
 */
const AchievementsPage = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();

  useEffect(() => {
    document.title = "Achievements — WhoIsMyRep.us";
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
          title="Achievements"
          description="Track your civic engagement achievements."
          path="/achievements"
        />
        <SiteNav />
        <main className="container mx-auto px-4 py-8">
          <div className="mx-auto max-w-2xl">
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card/50 p-12 text-center"
            >
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-amber-500/10">
                <Trophy className="h-7 w-7 text-amber-500" />
              </div>
              <h1 className="font-display text-xl font-bold text-headline">
                Achievements
              </h1>
              <p className="mt-2 max-w-sm font-body text-sm text-muted-foreground">
                Sign in to track your achievements and earn bonus XP for civic engagement milestones.
              </p>
              <Button
                onClick={() => navigate("/auth")}
                className="mt-6 gradient-brand font-display font-semibold text-white shadow-glow hover:opacity-90 transition-opacity"
              >
                <LogIn className="mr-2 h-4 w-4" />
                Sign In
              </Button>
            </motion.div>
          </div>
        </main>
      </div>
    );
  }

  // Authenticated
  return <AchievementsContent />;
};

export default AchievementsPage;
