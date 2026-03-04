import { motion } from "framer-motion";
import { Target, CheckCircle2 } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { useDailyChallenge } from "@/hooks/useDailyChallenge";

export function DailyChallengeCard() {
  const {
    challenge,
    progress,
    targetCount,
    isComplete,
    isLoading,
    progressPercent,
  } = useDailyChallenge();

  if (isLoading || !challenge) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-xl border p-4 ${
        isComplete
          ? "border-emerald-500/30 bg-emerald-500/5"
          : "border-border bg-card"
      }`}
    >
      <div className="mb-2 flex items-center gap-2">
        {isComplete ? (
          <CheckCircle2 className="h-4 w-4 text-emerald-500" />
        ) : (
          <Target className="h-4 w-4 text-amber-500" />
        )}
        <span className="font-display text-sm font-bold text-headline">
          Daily Challenge
        </span>
        <span className="ml-auto font-mono text-[10px] font-bold text-primary">
          +{challenge.xp_reward} XP
        </span>
      </div>

      <p className="mb-1 font-display text-sm font-semibold text-headline">
        {challenge.title}
      </p>
      <p className="mb-3 font-body text-[11px] text-muted-foreground">
        {challenge.description}
      </p>

      {/* Progress */}
      <div className="flex items-center gap-3">
        <Progress
          value={progressPercent}
          className={`h-2 flex-1 ${isComplete ? "[&>div]:bg-emerald-500" : ""}`}
        />
        <span className="font-mono text-[11px] font-bold text-muted-foreground">
          {progress}/{targetCount}
        </span>
      </div>

      {isComplete && (
        <p className="mt-2 font-body text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
          Completed! Nice work.
        </p>
      )}
    </motion.div>
  );
}
