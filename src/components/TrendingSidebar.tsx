import { motion } from "framer-motion";
import { TrendingUp, TrendingDown, Minus, Flame } from "lucide-react";
import type { TrendingTopic } from "@/lib/mockNews";

const trendIcon = {
  up: <TrendingUp className="h-3.5 w-3.5 text-primary" />,
  down: <TrendingDown className="h-3.5 w-3.5 text-muted-foreground" />,
  stable: <Minus className="h-3.5 w-3.5 text-muted-foreground" />,
};

const TrendingSidebar = ({ topics }: { topics: TrendingTopic[] }) => {
  return (
    <motion.aside
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.5, delay: 0.2 }}
      className="rounded-xl border border-border bg-card p-5 shadow-card"
    >
      <div className="mb-4 flex items-center gap-2">
        <Flame className="h-4 w-4 text-primary" />
        <h2 className="font-display text-lg font-bold text-headline">Trending</h2>
      </div>

      <div className="space-y-3">
        {topics.map((topic, i) => (
          <div
            key={topic.id}
            className="flex items-center justify-between rounded-lg px-3 py-2.5 transition-colors hover:bg-surface-hover"
          >
            <div className="flex items-center gap-3">
              <span className="font-body text-xs font-bold text-tertiary">
                {String(i + 1).padStart(2, "0")}
              </span>
              <span className="font-body text-sm font-medium text-foreground">
                {topic.topic}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-body text-xs text-muted-foreground">
                {topic.mentions.toLocaleString()}
              </span>
              {trendIcon[topic.trend]}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-5 rounded-lg bg-surface-elevated p-4">
        <p className="font-body text-xs font-medium text-secondary-custom">
          Data sourced from local news outlets, social media, and legislative records across Nevada.
        </p>
      </div>
    </motion.aside>
  );
};

export default TrendingSidebar;
