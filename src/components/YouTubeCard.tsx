import { motion } from "framer-motion";
import { Play, ExternalLink, Youtube } from "lucide-react";
import type { YouTubeVideo } from "@/hooks/useYouTube";

function timeAgo(dateStr: string): string {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  return `${Math.floor(diffDays / 30)} months ago`;
}

const YouTubeCard = ({ video, index }: { video: YouTubeVideo; index: number }) => {
  const openVideo = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (video.url) {
      window.open(video.url, "_blank", "noopener,noreferrer");
    }
  };

  return (
    <motion.article
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: index * 0.06 }}
      className="group relative overflow-hidden rounded-xl border border-border bg-card shadow-card transition-all hover:border-primary/30 hover:shadow-glow cursor-pointer"
      onClick={openVideo}
    >
      {/* Thumbnail */}
      <div className="relative block aspect-video w-full overflow-hidden">
        <img
          src={video.thumbnail}
          alt={video.title}
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          loading="lazy"
        />
        <div className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 transition-opacity group-hover:opacity-100">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/90">
            <Play className="h-5 w-5 text-primary-foreground" fill="currentColor" />
          </div>
        </div>
      </div>

      <div className="p-4">
        {/* Badge + time */}
        <div className="mb-2 flex items-center gap-2">
          <span className="inline-flex items-center gap-1 rounded-md bg-destructive/10 px-2 py-0.5 font-body text-[10px] font-semibold uppercase tracking-wider text-destructive">
            <Youtube className="h-3 w-3" />
            YouTube
          </span>
          <span className="font-body text-xs text-muted-foreground">•</span>
          <span className="font-body text-xs text-muted-foreground">{timeAgo(video.pubDate)}</span>
        </div>

        {/* Title */}
        <h3 className="font-display text-base font-bold leading-snug text-foreground line-clamp-2 transition-colors group-hover:text-primary">
          {video.title}
        </h3>

        {/* Description */}
        {video.description && (
          <p className="mt-1.5 font-body text-sm leading-relaxed text-muted-foreground line-clamp-2">
            {video.description}
          </p>
        )}

        {/* Footer */}
        <div className="mt-3 flex items-center justify-between">
          <span className="font-body text-xs text-muted-foreground">{video.channelName}</span>
          <span className="flex items-center gap-1 font-body text-xs text-muted-foreground transition-colors group-hover:text-primary">
            Watch
            <ExternalLink className="h-3 w-3" />
          </span>
        </div>
      </div>
    </motion.article>
  );
};

export default YouTubeCard;
