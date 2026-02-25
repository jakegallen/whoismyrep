import { motion } from "framer-motion";
import { ExternalLink, Heart, MessageCircle, Share2 } from "lucide-react";
import type { SocialPost } from "@/hooks/useSocialMedia";

const platformConfig: Record<string, { label: string; color: string; icon: string }> = {
  twitter: { label: "X / Twitter", color: "bg-[hsl(200,100%,50%)]/10 text-[hsl(200,100%,50%)]", icon: "𝕏" },
  facebook: { label: "Facebook", color: "bg-[hsl(221,44%,41%)]/10 text-[hsl(221,44%,41%)]", icon: "f" },
  tiktok: { label: "TikTok", color: "bg-[hsl(340,82%,52%)]/10 text-[hsl(340,82%,52%)]", icon: "♪" },
  instagram: { label: "Instagram", color: "bg-[hsl(326,78%,55%)]/10 text-[hsl(326,78%,55%)]", icon: "◉" },
  reddit: { label: "Reddit", color: "bg-[hsl(16,100%,50%)]/10 text-[hsl(16,100%,50%)]", icon: "r/" },
  other: { label: "Social", color: "bg-primary/10 text-primary", icon: "#" },
};

function timeAgo(dateStr: string): string {
  if (!dateStr) return "";
  // Handle relative strings like "2 hours ago"
  if (dateStr.includes("ago") || dateStr.includes("just") || dateStr.toLowerCase().includes("today")) {
    return dateStr;
  }
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return dateStr;
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffHrs = Math.floor(diffMs / (1000 * 60 * 60));
  if (diffHrs < 1) return "Just now";
  if (diffHrs < 24) return `${diffHrs}h ago`;
  const diffDays = Math.floor(diffHrs / 24);
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays}d ago`;
  return `${Math.floor(diffDays / 7)}w ago`;
}

const SocialMediaCard = ({ post, index }: { post: SocialPost; index: number }) => {
  const config = platformConfig[post.platform] || platformConfig.other;

  return (
    <motion.article
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: index * 0.06 }}
      className="group relative overflow-hidden rounded-xl border border-border bg-card p-5 shadow-card transition-all hover:border-primary/30 hover:shadow-glow"
    >
      <div className="flex gap-3">
        {/* Platform avatar */}
        <div className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full font-bold text-sm ${config.color}`}>
          {config.icon}
        </div>

        <div className="min-w-0 flex-1">
          {/* Header: author + platform + time */}
          <div className="mb-1.5 flex items-center gap-2 flex-wrap">
            <span className="font-display text-sm font-bold text-foreground">{post.author}</span>
            <span className="font-body text-xs text-muted-foreground">{post.handle}</span>
            <span className={`inline-flex items-center rounded-md px-1.5 py-0.5 font-body text-[10px] font-semibold uppercase tracking-wider ${config.color}`}>
              {config.label}
            </span>
            <span className="font-body text-xs text-muted-foreground">• {timeAgo(post.timestamp)}</span>
          </div>

          {/* Content */}
          <p className="font-body text-sm leading-relaxed text-foreground line-clamp-4">
            {post.content}
          </p>

          {/* Footer: engagement + actions */}
          <div className="mt-3 flex items-center gap-4">
            <span className="flex items-center gap-1 font-body text-xs text-muted-foreground">
              <Heart className="h-3 w-3" />
              {post.engagement}
            </span>

            <a
              href={post.url}
              target="_blank"
              rel="noopener noreferrer"
              className="ml-auto flex items-center gap-1 font-body text-xs text-muted-foreground transition-colors hover:text-primary"
            >
              <ExternalLink className="h-3 w-3" />
              View
            </a>
          </div>
        </div>
      </div>
    </motion.article>
  );
};

export default SocialMediaCard;
