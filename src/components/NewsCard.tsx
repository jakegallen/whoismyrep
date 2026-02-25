import { motion } from "framer-motion";
import { ExternalLink, Zap } from "lucide-react";
import type { NewsItem } from "@/lib/mockNews";
import CategoryBadge from "./CategoryBadge";

const NewsCard = ({ item, index }: { item: NewsItem; index: number }) => {
  return (
    <motion.article
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: index * 0.06 }}
      className="group relative rounded-xl border border-border bg-card p-5 shadow-card transition-all hover:border-primary/30 hover:shadow-glow"
    >
      {item.isBreaking && (
        <div className="mb-3 flex items-center gap-1.5">
          <Zap className="h-3.5 w-3.5 text-primary" />
          <span className="font-body text-xs font-bold uppercase tracking-wider text-primary">
            Breaking
          </span>
        </div>
      )}

      <div className="mb-3 flex items-center gap-2">
        <CategoryBadge category={item.category} />
        <span className="text-tertiary font-body text-xs">•</span>
        <span className="text-tertiary font-body text-xs">{item.timeAgo}</span>
      </div>

      <h3 className="font-display text-lg font-bold leading-snug text-headline transition-colors group-hover:text-primary">
        {item.title}
      </h3>

      <p className="mt-2 font-body text-sm leading-relaxed text-secondary-custom line-clamp-2">
        {item.summary}
      </p>

      <div className="mt-4 flex items-center justify-between">
        <span className="font-body text-xs text-tertiary">{item.source}</span>
        <button className="flex items-center gap-1 font-body text-xs font-medium text-muted-foreground transition-colors hover:text-primary">
          Read more
          <ExternalLink className="h-3 w-3" />
        </button>
      </div>
    </motion.article>
  );
};

export default NewsCard;
