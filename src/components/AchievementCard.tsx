import { motion } from "framer-motion";
import {
  Heart, MapPin, Map, FileText, BookOpen, Users,
  TrendingUp, DollarSign, Scale, Flame, Brain, Star,
  Target, Eye, Bookmark, Lock,
} from "lucide-react";
import type { Achievement } from "@/lib/achievements";

const ICON_MAP: Record<string, React.ElementType> = {
  Heart, MapPin, Map, FileText, BookOpen, Users,
  TrendingUp, DollarSign, Scale, Flame, Brain, Star,
  Target, Eye, Bookmark,
};

interface Props {
  achievementKey: string;
  achievement: Achievement;
  unlocked: boolean;
  unlockedAt?: string;
}

export function AchievementCard({ achievement, unlocked, unlockedAt }: Props) {
  const Icon = ICON_MAP[achievement.icon] ?? Star;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`relative flex items-start gap-3 rounded-xl border p-3 transition-colors ${
        unlocked
          ? "border-primary/30 bg-primary/5"
          : "border-border bg-card/50 opacity-60"
      }`}
    >
      {/* Icon */}
      <div
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${
          unlocked ? "bg-primary/15" : "bg-muted/60"
        }`}
      >
        {unlocked ? (
          <Icon className="h-5 w-5 text-primary" />
        ) : (
          <Lock className="h-4 w-4 text-muted-foreground" />
        )}
      </div>

      {/* Text */}
      <div className="min-w-0 flex-1">
        <p
          className={`font-display text-sm font-bold ${
            unlocked ? "text-headline" : "text-muted-foreground"
          }`}
        >
          {achievement.name}
        </p>
        <p className="font-body text-[11px] text-muted-foreground">
          {achievement.desc}
        </p>
        <div className="mt-1 flex items-center gap-2">
          <span className="font-mono text-[10px] font-bold text-primary">
            +{achievement.xp} XP
          </span>
          {unlocked && unlockedAt && (
            <span className="font-body text-[10px] text-muted-foreground">
              {new Date(unlockedAt).toLocaleDateString()}
            </span>
          )}
        </div>
      </div>
    </motion.div>
  );
}
