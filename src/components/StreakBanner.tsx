import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Flame, X } from "lucide-react";
import { useXP } from "@/hooks/useXP";

const MILESTONES = [7, 14, 30, 60, 100, 200, 365];

export function StreakBanner() {
  const { isAuthenticated, streak, longestStreak } = useXP();
  const [dismissed, setDismissed] = useState(false);

  // Only show if logged in with active streak > 1
  if (!isAuthenticated || streak <= 1 || dismissed) return null;

  const isMilestone = MILESTONES.includes(streak);
  const bgClass = isMilestone
    ? "bg-gradient-to-r from-orange-500/15 via-amber-500/15 to-yellow-500/15 border-orange-500/30"
    : "bg-orange-500/10 border-orange-500/20";

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -8, height: 0 }}
        animate={{ opacity: 1, y: 0, height: "auto" }}
        exit={{ opacity: 0, y: -8, height: 0 }}
        className={`mb-4 rounded-xl border ${bgClass} p-3`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <motion.div
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 0.6, repeat: isMilestone ? 2 : 0 }}
            >
              <Flame
                className="h-5 w-5 text-orange-500"
                fill="currentColor"
              />
            </motion.div>
            <div>
              <p className="font-display text-sm font-bold text-headline">
                {isMilestone ? `🎉 ${streak}-day streak!` : `${streak}-day streak`}
              </p>
              <p className="font-body text-[11px] text-muted-foreground">
                {isMilestone
                  ? "Amazing dedication — keep going!"
                  : "Come back tomorrow to keep your streak alive"}
              </p>
            </div>
          </div>
          <button
            onClick={() => setDismissed(true)}
            className="rounded-lg p-1 text-muted-foreground transition-colors hover:bg-background/50 hover:text-foreground"
            aria-label="Dismiss"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
