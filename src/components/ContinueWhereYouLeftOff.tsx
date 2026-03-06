import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Clock, User, FileText, MapPin, ChevronRight } from "lucide-react";
import { useRecentPages, type RecentPage } from "@/hooks/useRecentPages";

const TYPE_ICON: Record<RecentPage["type"], typeof User> = {
  politician: User,
  bill: FileText,
  state: MapPin,
};

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

export function ContinueWhereYouLeftOff() {
  const { recentPages } = useRecentPages();
  const navigate = useNavigate();

  if (recentPages.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3, duration: 0.5 }}
      className="mx-auto mt-8 max-w-xl"
    >
      <div className="flex items-center gap-1.5 mb-2">
        <Clock className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="font-body text-xs font-medium text-muted-foreground">
          Continue where you left off
        </span>
      </div>

      <div className="flex flex-col gap-1.5">
        {recentPages.slice(0, 3).map((page, i) => {
          const Icon = TYPE_ICON[page.type];
          return (
            <motion.button
              key={page.path}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.35 + i * 0.05, duration: 0.3 }}
              onClick={() => navigate(page.path)}
              className="group flex items-center gap-3 rounded-lg border border-border bg-card/50 px-3 py-2.5 text-left transition-colors hover:bg-surface-hover"
            >
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-primary/10">
                <Icon className="h-3.5 w-3.5 text-primary" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate font-display text-sm font-semibold text-headline">
                  {page.title}
                </p>
                {page.subtitle && (
                  <p className="truncate font-body text-[11px] text-muted-foreground">
                    {page.subtitle}
                  </p>
                )}
              </div>
              <span className="shrink-0 font-body text-[10px] text-muted-foreground/70">
                {timeAgo(page.visitedAt)}
              </span>
              <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground/50 transition-transform group-hover:translate-x-0.5" />
            </motion.button>
          );
        })}
      </div>
    </motion.div>
  );
}
